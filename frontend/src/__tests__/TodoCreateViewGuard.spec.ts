import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
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
  const wrapper: VueWrapper = mount(App, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { router, store, wrapper };
}

describe('新增页未保存离开守卫（FR-015）', () => {
  beforeEach(() => {
    vi.mocked(createTodo).mockReset();
    vi.mocked(createTodo).mockResolvedValue(blankTodo(1));
    vi.mocked(listTodos).mockReset();
    vi.mocked(listTodos).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('无未保存输入时离开不弹确认', async () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirm);
    const { router } = await setup();

    await router.push('/');
    await flushPromises();

    expect(confirm).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('有未保存输入且取消确认：停留新增页、不创建事项', async () => {
    const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirm);
    const { router, wrapper } = await setup();

    await wrapper.find('input[name="title"]').setValue('草稿内容');

    await router.push('/');
    await flushPromises();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.path).toBe('/todos/new');
    expect(createTodo).not.toHaveBeenCalled();
  });

  it('有未保存输入且确认放弃：放行返回、不创建、再次进入无草稿（不持久化）', async () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirm);
    const { router, wrapper } = await setup();

    await wrapper.find('input[name="title"]').setValue('草稿内容');

    await router.push('/');
    await flushPromises();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.path).toBe('/');
    expect(createTodo).not.toHaveBeenCalled();

    await router.push('/todos/new');
    await flushPromises();
    const input = wrapper.find('input[name="title"]').element as HTMLInputElement;
    expect(input.value).toBe('');
  });
});
