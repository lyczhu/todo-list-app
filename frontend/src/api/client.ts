import { ApiClientError } from './types';
import type { Todo, TodoCreate, ApiError } from './types';

async function toApiError(response: Response): Promise<ApiClientError> {
  try {
    const body = (await response.json()) as ApiError;
    if (body && typeof body.code === 'string' && typeof body.message === 'string') {
      return new ApiClientError(body.code, body.message, response.status);
    }
  } catch {
    // fall through to generic error below
  }
  return new ApiClientError('VALIDATION_ERROR', `请求失败（HTTP ${response.status}）`, response.status);
}

export async function listTodos(): Promise<Todo[]> {
  const response = await fetch('/api/todos');
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as Todo[];
}

export async function createTodo(input: TodoCreate): Promise<Todo> {
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as Todo;
}

export async function completeTodo(id: number): Promise<Todo> {
  const response = await fetch(`/api/todos/${id}/complete`, { method: 'PATCH' });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as Todo;
}

export async function deleteTodo(id: number): Promise<void> {
  const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw await toApiError(response);
  }
}
