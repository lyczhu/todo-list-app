import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Todo } from '../api/types';

vi.mock('../api/client', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  completeTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

import TodoItem from '../components/TodoItem.vue';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    title: '逾期事项',
    description: '',
    dueDate: '2026-10-09',
    completed: false,
    createdAt: '2026-10-01T00:00:00Z',
    overdue: false,
    ...overrides,
  };
}

describe('TodoItem 逾期标识（FR-010）', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('overdue=true 时渲染"已逾期"徽标', () => {
    const wrapper = mount(TodoItem, { props: { todo: makeTodo({ overdue: true }) } });

    const badge = wrapper.find('[data-testid="overdue-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('已逾期');
  });

  it('overdue=false 时不渲染徽标', () => {
    const wrapper = mount(TodoItem, { props: { todo: makeTodo({ overdue: false }) } });

    expect(wrapper.find('[data-testid="overdue-badge"]').exists()).toBe(false);
  });

  it('已完成事项（即便截止日期已过）不渲染徽标', () => {
    const wrapper = mount(TodoItem, {
      props: { todo: makeTodo({ completed: true, overdue: false }) },
    });

    expect(wrapper.find('[data-testid="overdue-badge"]').exists()).toBe(false);
  });

  it('无截止日期事项不渲染徽标', () => {
    const wrapper = mount(TodoItem, { props: { todo: makeTodo({ dueDate: null }) } });

    expect(wrapper.find('[data-testid="overdue-badge"]').exists()).toBe(false);
  });
});
