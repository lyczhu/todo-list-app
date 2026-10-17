<script setup lang="ts">
import { ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useTodoStore } from '../stores/todoStore';
import TodoForm from '../components/TodoForm.vue';

const store = useTodoStore();
const router = useRouter();
const hasUnsaved = ref(false);

function onDirtyChange(dirty: boolean): void {
  hasUnsaved.value = dirty;
}

function onCreated(): void {
  hasUnsaved.value = false;
  store.setFilter('active');
  void router.push('/');
}

// FR-015：有未保存输入（任一字段非空，决策 C1）时，离开前确认；放弃则丢弃、不创建、不存草稿。
onBeforeRouteLeave(() => {
  if (!hasUnsaved.value) return true;
  return window.confirm('放弃未保存的待办事项？');
});
</script>

<template>
  <section class="create-view" data-testid="todo-create-view">
    <h2>新增待办</h2>
    <TodoForm :disabled="!!store.error" @dirty-change="onDirtyChange" @created="onCreated" />
    <button type="button" class="back-button" data-testid="back-button" @click="router.push('/')">
      返回
    </button>
  </section>
</template>

<style scoped>
.create-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
h2 {
  margin: 0;
  font-size: 1.1rem;
}
.back-button {
  align-self: flex-start;
  padding: 0.4rem 1rem;
  border: 1px solid #bbb;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
</style>
