import { defineStore } from 'pinia';
import { ApiClientError } from '../api/types';
import type { Todo, TodoCreate, TodoStatusFilter } from '../api/types';
import {
  completeTodo as apiComplete,
  createTodo as apiCreate,
  deleteTodo as apiDelete,
  listTodos,
} from '../api/client';

// 4xx 是客户端可纠正的校验/存在性错误，走条目/表单内联提示；
// 网络失败或 5xx 属后端不可用，进入全局错误态（横幅 + 禁用提交，重试成功后恢复）。
function isClientValidationError(e: unknown): boolean {
  return e instanceof ApiClientError && e.status >= 400 && e.status < 500;
}

function sortByDueThenCreated(list: Todo[]): Todo[] {
  return [...list].sort((a, b) => {
    if (a.dueDate !== null && b.dueDate !== null) {
      const byDue = a.dueDate.localeCompare(b.dueDate);
      if (byDue !== 0) return byDue;
    } else if (a.dueDate === null && b.dueDate !== null) {
      return 1;
    } else if (a.dueDate !== null && b.dueDate === null) {
      return -1;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}

interface TodoState {
  todos: Todo[];
  filter: TodoStatusFilter;
  loading: boolean;
  error: string | null;
  inflight: Promise<void> | null;
}

export const useTodoStore = defineStore('todo', {
  state: (): TodoState => ({
    todos: [],
    filter: 'active',
    loading: false,
    error: null,
    inflight: null,
  }),

  getters: {
    activeGroup(state): Todo[] {
      return state.todos.filter((t) => !t.completed);
    },
    completedGroup(state): Todo[] {
      return state.todos.filter((t) => t.completed);
    },
    visibleTodos(state): Todo[] {
      switch (state.filter) {
        case 'active':
          return this.activeGroup;
        case 'completed':
          return this.completedGroup;
        default:
          return state.todos;
      }
    },
    isEmpty(): boolean {
      return this.visibleTodos.length === 0;
    },
  },

  actions: {
    setFilter(filter: TodoStatusFilter) {
      this.filter = filter;
    },

    fetchTodos(): Promise<void> {
      if (this.inflight) return this.inflight;
      this.loading = true;
      this.inflight = (async () => {
        try {
          this.todos = await listTodos();
          this.error = null;
        } catch (e) {
          this.error = e instanceof Error ? e.message : '请求失败';
        } finally {
          this.loading = false;
          this.inflight = null;
        }
      })();
      return this.inflight;
    },

    async createTodo(input: TodoCreate): Promise<Todo> {
      try {
        const created = await apiCreate(input);
        this.todos = sortByDueThenCreated([...this.todos, created]);
        return created;
      } catch (e) {
        if (!isClientValidationError(e)) {
          this.error = e instanceof Error ? e.message : '创建失败';
        }
        throw e;
      }
    },

    async completeTodo(id: number): Promise<void> {
      try {
        const updated = await apiComplete(id);
        this.todos = sortByDueThenCreated(
          this.todos.map((t) => (t.id === updated.id ? updated : t)),
        );
        this.error = null;
      } catch (e) {
        if (!isClientValidationError(e)) {
          this.error = e instanceof Error ? e.message : '操作失败';
        }
        throw e;
      }
    },

    async removeTodo(id: number): Promise<void> {
      try {
        await apiDelete(id);
        this.todos = this.todos.filter((t) => t.id !== id);
        this.error = null;
      } catch (e) {
        if (!isClientValidationError(e)) {
          this.error = e instanceof Error ? e.message : '操作失败';
        }
        throw e;
      }
    },
  },
});
