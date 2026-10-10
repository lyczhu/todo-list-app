package com.example.todo.api;

import com.example.todo.api.dto.TodoCreateRequest;
import com.example.todo.domain.Todo;
import com.example.todo.service.TodoNotFoundException;
import com.example.todo.service.TodoService;
import com.example.todo.service.TodoValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TodoController.class)
class TodoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TodoService service;

    private static Todo todo(long id, LocalDate dueDate, boolean completed) {
        Todo t = new Todo();
        t.setId(id);
        t.setTitle("t" + id);
        t.setDescription("");
        t.setDueDate(dueDate);
        t.setCompleted(completed);
        t.setCreatedAt(Instant.parse("2026-10-01T00:00:00Z"));
        return t;
    }

    @Test
    void listReturnsTodosWithOverdueFlag() throws Exception {
        Todo overdue = todo(1, LocalDate.parse("2026-10-09"), false);
        Todo ok = todo(2, LocalDate.parse("2026-10-11"), false);
        when(service.list("active")).thenReturn(List.of(overdue, ok));
        when(service.isOverdue(overdue)).thenReturn(true);
        when(service.isOverdue(ok)).thenReturn(false);

        mockMvc.perform(get("/api/todos").param("status", "active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].overdue").value(true))
                .andExpect(jsonPath("$[1].overdue").value(false));
    }

    @Test
    void createReturns201WithBody() throws Exception {
        Todo created = todo(5, LocalDate.parse("2026-10-12"), false);
        created.setTitle("买牛奶");
        created.setDescription("低脂");
        when(service.create(any())).thenReturn(created);
        when(service.isOverdue(any())).thenReturn(false);

        mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"买牛奶\",\"description\":\"低脂\",\"dueDate\":\"2026-10-12\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.title").value("买牛奶"))
                .andExpect(jsonPath("$.dueDate").value("2026-10-12"))
                .andExpect(jsonPath("$.overdue").value(false));
    }

    @Test
    void createWithBlankTitleReturns400TitleRequired() throws Exception {
        when(service.create(any())).thenThrow(new TodoValidationException("TITLE_REQUIRED", "标题不能为空"));

        mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TITLE_REQUIRED"));
    }

    @Test
    void createWithMalformedDateReturns400() throws Exception {
        mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"x\",\"dueDate\":\"not-a-date\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createWithUnknownFieldReturns400PerContract() throws Exception {
        mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"x\",\"sneaky\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void completeReturns200AndIsIdempotent() throws Exception {
        Todo done = todo(3, null, true);
        when(service.complete(3L)).thenReturn(done);
        when(service.isOverdue(done)).thenReturn(false);

        mockMvc.perform(patch("/api/todos/3/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true));

        mockMvc.perform(patch("/api/todos/3/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true));

        verify(service, org.mockito.Mockito.times(2)).complete(3L);
    }

    @Test
    void repeatedDeleteReturns204Then404() throws Exception {
        org.mockito.Mockito.doNothing()
                .doThrow(new TodoNotFoundException(5L))
                .when(service).delete(5L);

        mockMvc.perform(delete("/api/todos/5"))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/todos/5"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void completeUnknownIdReturns404() throws Exception {
        when(service.complete(99L)).thenThrow(new TodoNotFoundException(99L));

        mockMvc.perform(patch("/api/todos/99/complete"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void deleteReturns204() throws Exception {
        mockMvc.perform(delete("/api/todos/7"))
                .andExpect(status().isNoContent());

        verify(service).delete(eq(7L));
    }

    @Test
    void deleteUnknownIdReturns404() throws Exception {
        doThrow(new TodoNotFoundException(88L)).when(service).delete(88L);

        mockMvc.perform(delete("/api/todos/88"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void listWithUnknownStatusReturns400() throws Exception {
        when(service.list("bogus"))
                .thenThrow(new TodoValidationException("VALIDATION_ERROR", "Unknown status filter: bogus"));

        mockMvc.perform(get("/api/todos").param("status", "bogus"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
