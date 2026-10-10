import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ApiClientError } from '../api/types';
import type { Todo } from '../api/types';

vi.mock('../api/client', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  completeTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

import { completeTodo, deleteTodo, listTodos } from '../api/client';
import { useTodoStore } from '../stores/todoStore';

function todo(id: number, completed: boolean): Todo {
  return {
    id,
    title: `t${id}`,
    description: '',
    dueDate: null,
    completed,
    createdAt: '2026-10-01T00:00:00Z',
    overdue: false,
  };
}

const SERVER_SORTED: Todo[] = [todo(1, false), todo(2, true), todo(3, false), todo(4, true)];

describe('todoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(listTodos).mockReset();
  });

  it('默认分类为 active', () => {
    const store = useTodoStore();
    expect(store.filter).toBe('active');
  });

  it('fetchTodos 后按服务端次序保存全量列表', async () => {
    vi.mocked(listTodos).mockResolvedValue(SERVER_SORTED);
    const store = useTodoStore();

    await store.fetchTodos();

    expect(store.todos).toEqual(SERVER_SORTED);
    expect(store.error).toBeNull();
  });

  it('all 视图分为未完成/已完成两个区块且保持服务端次序', async () => {
    vi.mocked(listTodos).mockResolvedValue(SERVER_SORTED);
    const store = useTodoStore();
    await store.fetchTodos();

    expect(store.activeGroup.map((t) => t.id)).toEqual([1, 3]);
    expect(store.completedGroup.map((t) => t.id)).toEqual([2, 4]);
  });

  it('visibleTodos 随 filter 切换且不触发新请求', async () => {
    vi.mocked(listTodos).mockResolvedValue(SERVER_SORTED);
    const store = useTodoStore();
    await store.fetchTodos();

    store.setFilter('completed');
    expect(store.visibleTodos.map((t) => t.id)).toEqual([2, 4]);
    store.setFilter('all');
    expect(store.visibleTodos.map((t) => t.id)).toEqual([1, 2, 3, 4]);
    expect(listTodos).toHaveBeenCalledTimes(1);
  });

  it('createTodo 成功后新事项进入列表', async () => {
    const { createTodo } = await import('../api/client');
    vi.mocked(listTodos).mockResolvedValue([]);
    vi.mocked(createTodo).mockResolvedValue(todo(9, false));
    const store = useTodoStore();
    await store.fetchTodos();

    await store.createTodo({ title: '买牛奶' });

    expect(createTodo).toHaveBeenCalledWith({ title: '买牛奶' });
    expect(store.todos.map((t) => t.id)).toEqual([9]);
  });

  it('isEmpty 在当前视图无事项时为 true', async () => {
    vi.mocked(listTodos).mockResolvedValue([todo(1, true)]);
    const store = useTodoStore();
    await store.fetchTodos();

    expect(store.isEmpty).toBe(true); // 默认 active 视图无未完成事项
    store.setFilter('completed');
    expect(store.isEmpty).toBe(false);
  });

  it('completeTodo 后事项移出 active 视图', async () => {
    const { createTodo } = await import('../api/client');
    vi.mocked(listTodos).mockResolvedValue([todo(1, false)]);
    vi.mocked(createTodo).mockResolvedValue(todo(1, false));
    vi.mocked(completeTodo).mockResolvedValue(todo(1, true));
    const store = useTodoStore();
    await store.fetchTodos();

    await store.completeTodo(1);

    expect(completeTodo).toHaveBeenCalledWith(1);
    expect(store.activeGroup).toHaveLength(0);
    expect(store.completedGroup.map((t) => t.id)).toEqual([1]);
  });

  it('removeTodo 后事项从列表彻底移除', async () => {
    vi.mocked(listTodos).mockResolvedValue([todo(1, false), todo(2, false)]);
    vi.mocked(deleteTodo).mockResolvedValue(undefined);
    const store = useTodoStore();
    await store.fetchTodos();

    await store.removeTodo(1);

    expect(deleteTodo).toHaveBeenCalledWith(1);
    expect(store.todos.map((t) => t.id)).toEqual([2]);
  });

  it('请求失败后 error 非空且 loading 复位（FR-012）', async () => {
    vi.mocked(listTodos).mockRejectedValue(new Error('后端不可用'));
    const store = useTodoStore();

    await store.fetchTodos();

    expect(store.error).toBe('后端不可用');
    expect(store.loading).toBe(false);
  });

  it('fetchTodos 进行中 loading=true，重复调用合并不触发第二次请求（FR-012）', async () => {
    let resolveList: (t: Todo[]) => void = () => {};
    vi.mocked(listTodos).mockReturnValue(new Promise((resolve) => {
      resolveList = resolve;
    }));
    const store = useTodoStore();

    const first = store.fetchTodos();
    const second = store.fetchTodos();

    expect(store.loading).toBe(true);
    expect(listTodos).toHaveBeenCalledTimes(1);

    resolveList([todo(1, false)]);
    await Promise.all([first, second]);
    expect(store.loading).toBe(false);
    expect(store.todos).toHaveLength(1);
  });

  it('重试成功后 error 清空', async () => {
    vi.mocked(listTodos).mockRejectedValueOnce(new Error('网络错误'));
    const store = useTodoStore();
    await store.fetchTodos();
    expect(store.error).toBe('网络错误');

    vi.mocked(listTodos).mockResolvedValue([todo(1, false)]);
    await store.fetchTodos();

    expect(store.error).toBeNull();
  });

  it('createTodo 网络/5xx 失败进入全局 error 并抛出（FR-012）', async () => {
    const { createTodo } = await import('../api/client');
    vi.mocked(listTodos).mockResolvedValue([]);
    vi.mocked(createTodo).mockRejectedValue(
      new ApiClientError('VALIDATION_ERROR', '请求失败（HTTP 502）', 502),
    );
    const store = useTodoStore();
    await store.fetchTodos();

    await expect(store.createTodo({ title: 'x' })).rejects.toBeInstanceOf(ApiClientError);
    expect(store.error).toBe('请求失败（HTTP 502）');
  });

  it('createTodo 4xx 校验失败保持内联、不进入全局 error（FR-012）', async () => {
    const { createTodo } = await import('../api/client');
    vi.mocked(listTodos).mockResolvedValue([]);
    vi.mocked(createTodo).mockRejectedValue(
      new ApiClientError('TITLE_REQUIRED', '标题不能为空', 400),
    );
    const store = useTodoStore();
    await store.fetchTodos();

    await expect(store.createTodo({ title: '   ' })).rejects.toBeInstanceOf(ApiClientError);
    expect(store.error).toBeNull();
  });

  it('completeTodo 4xx（404）不进入全局 error，交由条目内联处理（FR-012）', async () => {
    vi.mocked(listTodos).mockResolvedValue([todo(1, false)]);
    vi.mocked(completeTodo).mockRejectedValue(
      new ApiClientError('NOT_FOUND', '事项不存在', 404),
    );
    const store = useTodoStore();
    await store.fetchTodos();

    await expect(store.completeTodo(1)).rejects.toBeInstanceOf(ApiClientError);
    expect(store.error).toBeNull();
  });

  it('removeTodo 5xx 进入全局 error（FR-012）', async () => {
    vi.mocked(listTodos).mockResolvedValue([todo(1, false)]);
    vi.mocked(deleteTodo).mockRejectedValue(
      new ApiClientError('VALIDATION_ERROR', '请求失败（HTTP 503）', 503),
    );
    const store = useTodoStore();
    await store.fetchTodos();

    await expect(store.removeTodo(1)).rejects.toBeInstanceOf(ApiClientError);
    expect(store.error).toBe('请求失败（HTTP 503）');
  });
});
