package com.example.todo.service;

public class TodoNotFoundException extends RuntimeException {

    public TodoNotFoundException(Long id) {
        super("Todo not found: " + id);
    }
}
