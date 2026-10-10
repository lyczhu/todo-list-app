<script setup lang="ts">
import { ref } from 'vue';
import type { Todo } from '../api/types';
import { useTodoStore } from '../stores/todoStore';

const props = defineProps<{ todo: Todo; disabled?: boolean }>();

const store = useTodoStore();
const confirmingDelete = ref(false);
const itemError = ref('');

async function onComplete() {
  if (props.disabled) return;
  try {
    await store.completeTodo(props.todo.id);
  } catch (e) {
    itemError.value = e instanceof Error ? e.message : '操作失败';
  }
}

async function onConfirmDelete() {
  if (props.disabled) return;
  try {
    await store.removeTodo(props.todo.id);
  } catch (e) {
    itemError.value = e instanceof Error ? e.message : '删除失败';
  } finally {
    confirmingDelete.value = false;
  }
}
</script>

<template>
  <li class="todo-item" :class="{ done: todo.completed, overdue: todo.overdue }">
    <div class="content">
      <span class="title">
        {{ todo.title }}
        <span v-if="todo.overdue" class="overdue-badge" data-testid="overdue-badge">已逾期</span>
      </span>
      <span v-if="todo.description" class="description">{{ todo.description }}</span>
      <span v-if="todo.dueDate" class="due">截止 {{ todo.dueDate }}</span>
    </div>
    <div class="actions">
      <p v-if="itemError" class="item-error" role="alert">{{ itemError }}</p>
      <button
        v-if="!todo.completed"
        type="button"
        class="complete"
        data-testid="complete-button"
        :disabled="disabled"
        @click="onComplete"
      >
        完成
      </button>
      <template v-if="confirmingDelete">
        <span class="confirm-text">确认删除？</span>
        <button type="button" class="danger" data-testid="delete-confirm" :disabled="disabled" @click="onConfirmDelete">
          删除
        </button>
        <button type="button" data-testid="delete-cancel" @click="confirmingDelete = false">
          取消
        </button>
      </template>
      <button
        v-else
        type="button"
        class="danger subtle"
        data-testid="delete-button"
        :disabled="disabled"
        @click="confirmingDelete = true"
      >
        删除
      </button>
    </div>
  </li>
</template>

<style scoped>
.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
}
.todo-item.done .title {
  color: #888;
  text-decoration: line-through;
}
.todo-item.overdue {
  border-color: #c62828;
}
.overdue-badge {
  margin-left: 0.4rem;
  padding: 0.05rem 0.45rem;
  border: 1px solid #c62828;
  border-radius: 999px;
  background: #fdecea;
  color: #c62828;
  font-size: 0.75rem;
}
.content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.description,
.due {
  font-size: 0.82rem;
  color: #666;
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}
.confirm-text {
  font-size: 0.85rem;
  color: #c62828;
}
.item-error {
  margin: 0;
  font-size: 0.8rem;
  color: #c62828;
}
button {
  padding: 0.3rem 0.7rem;
  border: 1px solid #bbb;
  border-radius: 6px;
  background: #fff;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
button.complete {
  border-color: #2e7d32;
  color: #2e7d32;
}
button.danger {
  border-color: #c62828;
  background: #c62828;
  color: #fff;
}
button.danger.subtle {
  background: #fff;
  color: #c62828;
}
</style>
