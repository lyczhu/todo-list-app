export type TodoStatusFilter = 'active' | 'completed' | 'all';

export interface Todo {
  id: number;
  title: string;
  description: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  overdue: boolean;
}

export interface TodoCreate {
  title: string;
  description?: string;
  dueDate?: string | null;
}

export interface ApiError {
  code: 'TITLE_REQUIRED' | 'VALIDATION_ERROR' | 'NOT_FOUND';
  message: string;
}

export class ApiClientError extends Error {
  readonly code: ApiError['code'];
  readonly status: number;

  constructor(code: ApiError['code'], message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiClientError';
  }
}
