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

import { listTodos } from '../api/client';
import { useTodoStore } from '../stores/todoStore';
import App from '../App.vue';

function makeTodo(id: number): Todo {
  return {
    id,
    title: `事项${id}`,
    description: '',
    dueDate: null,
    completed: false,
    createdAt: '2026-10-01T00:00:00Z',
    overdue: false,
  };
}

describe('错误态（FR-012）', () => {
  beforeEach(() => {
    vi.mocked(listTodos).mockReset();
  });

  it('请求失败时显示错误提示并禁用提交入口', async () => {
    vi.mocked(listTodos).mockRejectedValue(new Error('后端不可用'));
    const wrapper = mount(App, { global: { plugins: [createPinia()] } });
    await flushPromises();

    expect(wrapper.find('[data-testid="error-banner"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('后端不可用');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('错误态下事项卡片的完成/删除入口同样被禁用（FR-012）', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.mocked(listTodos).mockResolvedValueOnce([makeTodo(1)]);
    const wrapper = mount(App, { global: { plugins: [pinia] } });
    await flushPromises();
    expect(wrapper.find('[data-testid="complete-button"]').exists()).toBe(true);

    vi.mocked(listTodos).mockRejectedValueOnce(new Error('后端不可用'));
    const store = useTodoStore();
    await store.fetchTodos();
    await flushPromises();

    expect(
      wrapper.find('[data-testid="complete-button"]').attributes('disabled'),
    ).toBeDefined();
    expect(
      wrapper.find('[data-testid="delete-button"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('点击重试成功后错误横幅消失、提交恢复', async () => {
    vi.mocked(listTodos).mockRejectedValueOnce(new Error('后端不可用'));
    const wrapper = mount(App, { global: { plugins: [createPinia()] } });
    await flushPromises();

    vi.mocked(listTodos).mockResolvedValue([makeTodo(1)]);
    await wrapper.find('[data-testid="retry-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="error-banner"]').exists()).toBe(false);
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined();
  });
});
