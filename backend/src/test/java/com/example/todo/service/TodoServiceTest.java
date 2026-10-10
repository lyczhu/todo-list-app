package com.example.todo.service;

import com.example.todo.api.dto.TodoCreateRequest;
import com.example.todo.domain.Todo;
import com.example.todo.repo.TodoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TodoServiceTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-10T08:00:00Z"), ZoneOffset.UTC);

    private TodoRepository repository;
    private TodoService service;

    @BeforeEach
    void setUp() {
        repository = mock(TodoRepository.class);
        service = new TodoService(repository, CLOCK);
    }

    private static Todo todo(long id, LocalDate dueDate, Instant createdAt, boolean completed) {
        Todo t = new Todo();
        t.setId(id);
        t.setTitle("t" + id);
        t.setDueDate(dueDate);
        t.setCreatedAt(createdAt);
        t.setCompleted(completed);
        return t;
    }

    @Test
    void listSortsByDueDateWithNullsLastAndStableByCreatedAt() {
        Instant base = Instant.parse("2026-10-01T00:00:00Z");
        List<Todo> unsorted = List.of(
                todo(1, LocalDate.parse("2026-12-01"), base.plusSeconds(1), false),
                todo(2, null, base.plusSeconds(5), false),
                todo(3, LocalDate.parse("2026-10-11"), base.plusSeconds(3), false),
                todo(4, LocalDate.parse("2026-10-11"), base.plusSeconds(2), false),
                todo(5, null, base.plusSeconds(4), false));
        when(repository.findAll()).thenReturn(unsorted);

        List<Todo> result = service.list(null);

        assertThat(result).extracting(t -> t.getId())
                .containsExactly(4L, 3L, 1L, 5L, 2L);
    }

    @Test
    void listFiltersByStatus() {
        Instant base = Instant.parse("2026-10-01T00:00:00Z");
        when(repository.findAll()).thenReturn(List.of(
                todo(1, LocalDate.parse("2026-10-11"), base, false),
                todo(2, LocalDate.parse("2026-10-12"), base, true)));

        assertThat(service.list("active")).extracting(Todo::getId).containsExactly(1L);
        assertThat(service.list("completed")).extracting(Todo::getId).containsExactly(2L);
        assertThat(service.list(null)).hasSize(2);
        // 契约 enum 仅 active|completed，显式 all 不再接受
        assertThatThrownBy(() -> service.list("all"))
                .isInstanceOf(TodoValidationException.class);
    }

    @Test
    void listRejectsUnknownStatus() {
        assertThatThrownBy(() -> service.list("bogus"))
                .isInstanceOf(TodoValidationException.class)
                .extracting(e -> ((TodoValidationException) e).getCode())
                .isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void createRejectsBlankTitle() {
        assertThatThrownBy(() -> service.create(new TodoCreateRequest("   ", null, null)))
                .isInstanceOf(TodoValidationException.class)
                .extracting(e -> ((TodoValidationException) e).getCode())
                .isEqualTo("TITLE_REQUIRED");
    }

    @Test
    void createRejectsOversizedTitleAndDescription() {
        assertThatThrownBy(() -> service.create(
                new TodoCreateRequest("x".repeat(201), null, null)))
                .isInstanceOf(TodoValidationException.class);
        assertThatThrownBy(() -> service.create(
                new TodoCreateRequest("ok", "y".repeat(2001), null)))
                .isInstanceOf(TodoValidationException.class);
    }

    @Test
    void createTrimsTitleAndDefaultsDescription() {
        when(repository.save(any(Todo.class))).thenAnswer(inv -> inv.getArgument(0));

        Todo saved = service.create(
                new TodoCreateRequest("  买牛奶  ", null, LocalDate.parse("2026-10-12")));

        ArgumentCaptor<Todo> captor = ArgumentCaptor.forClass(Todo.class);
        org.mockito.Mockito.verify(repository).save(captor.capture());
        assertThat(saved.getTitle()).isEqualTo("买牛奶");
        assertThat(saved.getDescription()).isEmpty();
        assertThat(saved.isCompleted()).isFalse();
    }

    @Test
    void completeIsIdempotentAndRejectsUnknownId() {
        Todo t = todo(1, null, Instant.now(), false);
        when(repository.findById(1L)).thenReturn(java.util.Optional.of(t));

        service.complete(1L);
        Todo second = service.complete(1L);

        assertThat(second.isCompleted()).isTrue();
        assertThatThrownBy(() -> service.complete(404L))
                .isInstanceOf(TodoNotFoundException.class);
    }

    @Test
    void deleteTwiceRejectsSecondWithNotFound() {
        when(repository.existsById(2L)).thenReturn(true, false);

        service.delete(2L);

        assertThatThrownBy(() -> service.delete(2L))
                .isInstanceOf(TodoNotFoundException.class);
        org.mockito.Mockito.verify(repository).deleteById(2L);
    }

    @Test
    void overdueOnlyForPastDueIncompleteTodos() {
        Todo pastDueOpen = todo(1, LocalDate.parse("2026-10-09"), Instant.now(), false);
        Todo pastDueDone = todo(2, LocalDate.parse("2026-10-09"), Instant.now(), true);
        Todo dueToday = todo(3, LocalDate.parse("2026-10-10"), Instant.now(), false);
        Todo noDue = todo(4, null, Instant.now(), false);

        assertThat(service.isOverdue(pastDueOpen)).isTrue();
        assertThat(service.isOverdue(pastDueDone)).isFalse();
        assertThat(service.isOverdue(dueToday)).isFalse();
        assertThat(service.isOverdue(noDue)).isFalse();
    }
}
