package com.example.todo.api.dto;


import java.time.LocalDate;

public record TodoCreateRequest(String title, String description, LocalDate dueDate) {
}
