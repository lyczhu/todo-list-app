package com.example.todo.service;

import com.example.todo.domain.Todo;
import com.example.todo.repo.TodoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class TodoOverdueTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-10T08:00:00Z"), ZoneOffset.UTC);

    private TodoService service;

    @BeforeEach
    void setUp() {
        service = new TodoService(mock(TodoRepository.class), CLOCK);
    }

    private static Todo todo(LocalDate dueDate, boolean completed) {
        Todo t = new Todo();
        t.setId(1L);
        t.setTitle("t");
        t.setDueDate(dueDate);
        t.setCompleted(completed);
        t.setCreatedAt(Instant.parse("2026-10-01T00:00:00Z"));
        return t;
    }

    @Test
    void pastDueIncompleteIsOverdue() {
        assertThat(service.isOverdue(todo(LocalDate.parse("2026-10-09"), false))).isTrue();
    }

    @Test
    void pastDueCompletedIsNotOverdue() {
        assertThat(service.isOverdue(todo(LocalDate.parse("2026-10-09"), true))).isFalse();
    }

    @Test
    void dueTodayIsNotOverdue() {
        assertThat(service.isOverdue(todo(LocalDate.parse("2026-10-10"), false))).isFalse();
    }

    @Test
    void noDueDateIsNotOverdue() {
        assertThat(service.isOverdue(todo(null, false))).isFalse();
    }
}
