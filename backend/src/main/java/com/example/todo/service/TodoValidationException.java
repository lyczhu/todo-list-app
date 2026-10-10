package com.example.todo.service;

public class TodoValidationException extends RuntimeException {

    private final String code;

    public TodoValidationException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
