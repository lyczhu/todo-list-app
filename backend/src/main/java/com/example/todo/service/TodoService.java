package com.example.todo.service;

import com.example.todo.api.dto.TodoCreateRequest;
import com.example.todo.domain.Todo;
import com.example.todo.repo.TodoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
public class TodoService {

    static final int TITLE_MAX = 200;
    static final int DESCRIPTION_MAX = 2000;

    private static final Comparator<Todo> BY_DUE_DATE_THEN_CREATED = Comparator
            .comparing(Todo::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(Todo::getCreatedAt);

    private final TodoRepository repository;
    private final Clock clock;

    public TodoService(TodoRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<Todo> list(String status) {
        String normalized = status == null ? "" : status;
        if (!normalized.isEmpty() && !normalized.equals("active") && !normalized.equals("completed")) {
            throw new TodoValidationException("VALIDATION_ERROR", "Unknown status filter: " + status);
        }
        return repository.findAll().stream()
                .filter(todo -> switch (normalized) {
                    case "active" -> !todo.isCompleted();
                    case "completed" -> todo.isCompleted();
                    default -> true;
                })
                .sorted(BY_DUE_DATE_THEN_CREATED)
                .toList();
    }

    @Transactional
    public Todo create(TodoCreateRequest request) {
        String title = request.title() == null ? "" : request.title().trim();
        if (title.isEmpty()) {
            throw new TodoValidationException("TITLE_REQUIRED", "标题不能为空");
        }
        if (title.length() > TITLE_MAX) {
            throw new TodoValidationException("VALIDATION_ERROR", "标题长度不能超过 " + TITLE_MAX);
        }
        String description = request.description() == null ? "" : request.description();
        if (description.length() > DESCRIPTION_MAX) {
            throw new TodoValidationException("VALIDATION_ERROR", "描述长度不能超过 " + DESCRIPTION_MAX);
        }
        Todo todo = new Todo();
        todo.setTitle(title);
        todo.setDescription(description);
        todo.setDueDate(request.dueDate());
        return repository.save(todo);
    }

    @Transactional
    public Todo complete(Long id) {
        Todo todo = repository.findById(id).orElseThrow(() -> new TodoNotFoundException(id));
        todo.setCompleted(true);
        return todo;
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new TodoNotFoundException(id);
        }
        repository.deleteById(id);
    }

    public boolean isOverdue(Todo todo) {
        return todo.getDueDate() != null
                && !todo.isCompleted()
                && todo.getDueDate().isBefore(LocalDate.now(clock));
    }
}
