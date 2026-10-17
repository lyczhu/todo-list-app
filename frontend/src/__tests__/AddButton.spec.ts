import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { Router } from 'vue-router';

vi.mock('../api/client', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  completeTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

import { routes } from '../router';
import { useTodoStore } from '../stores/todoStore';
import AddButton from '../components/AddButton.vue';

async function makeRouter(): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push('/');
  await router.isReady();
  return router;
}

describe('AddButton “+”入口（FR-013）', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('渲染可见的“+”按钮，点击进入新增页路由', async () => {
    const router = await makeRouter();
    const wrapper = mount(AddButton, { global: { plugins: [createPinia(), router] } });

    const button = wrapper.find('[data-testid="add-button"]');
    expect(button.exists()).toBe(true);
    expect(button.text()).toBe('+');

    await button.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/todos/new');
  });

  it('“+”为导航入口：store.error 非空时仍可点击（决策 F1）', async () => {
    const router = await makeRouter();
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useTodoStore();
    store.error = '后端不可用';

    const wrapper = mount(AddButton, { global: { plugins: [pinia, router] } });
    const button = wrapper.find('[data-testid="add-button"]');
    expect((button.element as HTMLButtonElement).disabled).toBe(false);

    await button.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/todos/new');
  });
});
