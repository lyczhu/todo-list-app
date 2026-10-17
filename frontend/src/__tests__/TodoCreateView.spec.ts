import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { Router } from 'vue-router';
import type { Todo } from '../api/types';

vi.mock('../api/client', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  completeTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

import { createTodo, listTodos } from '../api/client';
import { routes } from '../router';
import { useTodoStore } from '../stores/todoStore';
import App from '../App.vue';

function blankTodo(id: number): Todo {
  return {
    id,
    title: `t${id}`,
    description: '',
    dueDate: null,
    completed: false,
    createdAt: '2026-10-01T00:00:00Z',
    overdue: false,
  };
}

async function setup(path = '/todos/new') {
  const pinia = createPinia();
  const router: Router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const store = useTodoStore(pinia);
  const wrapper = mount(App, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { router, store, wrapper };
}

describe('TodoCreateView 保存返回流程（FR-014 / Clarification 3）', () => {
  beforeEach(() => {
    vi.mocked(createTodo).mockReset();
    vi.mocked(createTodo).mockResolvedValue(blankTodo(1));
    vi.mocked(listTodos).mockReset();
    vi.mocked(listTodos).mockResolvedValue([]);
  });

  it('有效提交：创建一次、切回「未完成」、返回首页', async () => {
    const { router, store, wrapper } = await setup();
    store.setFilter('completed');

    await wrapper.find('input[name="title"]').setValue('买牛奶');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(createTodo).toHaveBeenCalledTimes(1);
    expect(store.filter).toBe('active');
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('空/空白标题提交：不调 API、不导航、提示标题不能为空（FR-002）', async () => {
    const { router, wrapper } = await setup();

    await wrapper.find('input[name="title"]').setValue('   ');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(createTodo).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe('/todos/new');
    expect(wrapper.text()).toContain('标题不能为空');
  });

  it('store.error 非空时提交按钮禁用，恢复后可用（FR-012，决策 E1）', async () => {
    const { store, wrapper } = await setup();
    store.error = '后端不可用';
    await flushPromises();
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();

    store.error = null;
    await flushPromises();
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined();
  });
});
