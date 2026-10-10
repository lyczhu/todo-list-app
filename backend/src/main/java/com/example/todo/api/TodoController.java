package com.example.todo.api;

import com.example.todo.api.dto.ErrorResponse;
import com.example.todo.api.dto.TodoCreateRequest;
import com.example.todo.api.dto.TodoResponse;
import com.example.todo.service.TodoNotFoundException;
import com.example.todo.service.TodoService;
import com.example.todo.service.TodoValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoService service;

    public TodoController(TodoService service) {
        this.service = service;
    }

    @GetMapping
    public List<TodoResponse> list(@RequestParam(name = "status", required = false) String status) {
        return service.list(status).stream().map(this::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<TodoResponse> create(@RequestBody TodoCreateRequest request) {
        TodoResponse body = toResponse(service.create(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PatchMapping("/{id}/complete")
    public TodoResponse complete(@PathVariable Long id) {
        return toResponse(service.complete(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    private TodoResponse toResponse(com.example.todo.domain.Todo todo) {
        return TodoResponse.from(todo, service.isOverdue(todo));
    }

    @ExceptionHandler(TodoValidationException.class)
    ResponseEntity<ErrorResponse> handleValidation(TodoValidationException ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(TodoNotFoundException.class)
    ResponseEntity<ErrorResponse> handleNotFound(TodoNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("VALIDATION_ERROR", "请求体格式错误"));
    }
}
