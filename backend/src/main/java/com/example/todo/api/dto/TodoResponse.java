package com.example.todo.api.dto;

import com.example.todo.domain.Todo;

import java.time.Instant;
import java.time.LocalDate;

public record TodoResponse(
        Long id,
        String title,
        String description,
        LocalDate dueDate,
        boolean completed,
        Instant createdAt,
        boolean overdue) {

    public static TodoResponse from(Todo todo, boolean overdue) {
        return new TodoResponse(
                todo.getId(),
                todo.getTitle(),
                todo.getDescription(),
                todo.getDueDate(),
                todo.isCompleted(),
                todo.getCreatedAt(),
                overdue);
    }
}
