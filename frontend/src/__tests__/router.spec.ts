import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { Router } from 'vue-router';

vi.mock('../api/client', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  completeTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

import { listTodos } from '../api/client';
import { routes } from '../router';
import App from '../App.vue';

async function makeRouter(path: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  return router;
}

describe('路由与双视图装配（FR-013）', () => {
  beforeEach(() => {
    vi.mocked(listTodos).mockReset();
    vi.mocked(listTodos).mockResolvedValue([]);
  });

  it('routes 定义首页与新增页两条路由', () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/todos/new');
  });

  it('首页渲染列表视图与“+”入口，且不渲染新增表单', async () => {
    const router = await makeRouter('/');
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } });
    await flushPromises();

    expect(wrapper.find('[data-testid="home-view"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="add-button"]').exists()).toBe(true);
    expect(wrapper.find('.todo-form').exists()).toBe(false);
  });

  it('新增页渲染待办表单，不渲染首页列表视图', async () => {
    const router = await makeRouter('/todos/new');
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } });
    await flushPromises();

    expect(wrapper.find('.todo-form').exists()).toBe(true);
    expect(wrapper.find('[data-testid="home-view"]').exists()).toBe(false);
  });
});
