import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Todo } from '../api/types';

vi.mock('../api/client', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  completeTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

import { completeTodo, deleteTodo } from '../api/client';
import { useTodoStore } from '../stores/todoStore';
import TodoItem from '../components/TodoItem.vue';

function makeTodo(id: number, overrides: Partial<Todo> = {}): Todo {
  return {
    id,
    title: `事项${id}`,
    description: '',
    dueDate: null,
    completed: false,
    createdAt: '2026-10-01T00:00:00Z',
    overdue: false,
    ...overrides,
  };
}

describe('TodoItem', () => {
  let store: ReturnType<typeof useTodoStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(completeTodo).mockReset();
    vi.mocked(deleteTodo).mockReset();
    store = useTodoStore();
    store.todos = [makeTodo(1)];
  });

  it('未完成事项显示完成按钮，点击调用 completeTodo 并移出 active 视图', async () => {
    vi.mocked(completeTodo).mockResolvedValue(makeTodo(1, { completed: true }));
    const wrapper = mount(TodoItem, { props: { todo: makeTodo(1) } });

    await wrapper.find('[data-testid="complete-button"]').trigger('click');
    await flushPromises();

    expect(completeTodo).toHaveBeenCalledWith(1);
    expect(store.activeGroup).toHaveLength(0);
  });

  it('已完成事项不显示完成按钮', () => {
    const wrapper = mount(TodoItem, {
      props: { todo: makeTodo(1, { completed: true }) },
    });

    expect(wrapper.find('[data-testid="complete-button"]').exists()).toBe(false);
  });

  it('删除需两段确认：取消不发起请求', async () => {
    const wrapper = mount(TodoItem, { props: { todo: makeTodo(1) } });

    await wrapper.find('[data-testid="delete-button"]').trigger('click');
    expect(deleteTodo).not.toHaveBeenCalled();

    await wrapper.find('[data-testid="delete-cancel"]').trigger('click');
    expect(deleteTodo).not.toHaveBeenCalled();
    expect(store.todos).toHaveLength(1);
  });

  it('确认删除后调用 deleteTodo 并从列表移除', async () => {
    vi.mocked(deleteTodo).mockResolvedValue(undefined);
    const wrapper = mount(TodoItem, { props: { todo: makeTodo(1) } });

    await wrapper.find('[data-testid="delete-button"]').trigger('click');
    await wrapper.find('[data-testid="delete-confirm"]').trigger('click');
    await flushPromises();

    expect(deleteTodo).toHaveBeenCalledWith(1);
    expect(store.todos).toHaveLength(0);
  });
});
