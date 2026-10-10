import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Todo } from '../api/types';

vi.mock('../api/client', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
}));

import { createTodo } from '../api/client';
import { useTodoStore } from '../stores/todoStore';
import TodoForm from '../components/TodoForm.vue';

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

describe('TodoForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(createTodo).mockReset();
    vi.mocked(createTodo).mockResolvedValue(blankTodo(1));
  });

  it('空白标题提交不调用 API 并显示"标题不能为空"', async () => {
    const wrapper = mount(TodoForm);

    await wrapper.find('input[name="title"]').setValue('   ');
    await wrapper.find('form').trigger('submit.prevent');

    expect(createTodo).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('标题不能为空');
  });

  it('有效提交调用 createTodo 一次并清空标题', async () => {
    const wrapper = mount(TodoForm);

    await wrapper.find('input[name="title"]').setValue('买牛奶');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(createTodo).toHaveBeenCalledTimes(1);
    expect((wrapper.find('input[name="title"]').element as HTMLInputElement).value).toBe('');
  });

  it('提交进行中重复点击不产生第二次请求（防重复提交）', async () => {
    let resolveCreate: (t: Todo) => void = () => {};
    vi.mocked(createTodo).mockReturnValue(
      new Promise<Todo>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const wrapper = mount(TodoForm);

    await wrapper.find('input[name="title"]').setValue('买牛奶');
    await wrapper.find('form').trigger('submit.prevent');
    await wrapper.find('form').trigger('submit.prevent');

    expect(createTodo).toHaveBeenCalledTimes(1);
    resolveCreate(blankTodo(1));
    await flushPromises();
  });

  it('成功后新事项进入 store 列表', async () => {
    const store = useTodoStore();
    vi.mocked(createTodo).mockResolvedValue(blankTodo(42));
    const wrapper = mount(TodoForm);

    await wrapper.find('input[name="title"]').setValue('交周报');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(store.todos.map((t) => t.id)).toEqual([42]);
  });
});
