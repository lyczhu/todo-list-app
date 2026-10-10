<script setup lang="ts">
import { ref } from 'vue';
import { useTodoStore } from '../stores/todoStore';

const props = defineProps<{ disabled?: boolean }>();

const store = useTodoStore();
const title = ref('');
const description = ref('');
const dueDate = ref('');
const formError = ref('');
const submitting = ref(false);

async function onSubmit() {
  if (submitting.value || props.disabled) return;
  const trimmed = title.value.trim();
  if (!trimmed) {
    formError.value = '标题不能为空';
    return;
  }
  if (trimmed.length > 200) {
    formError.value = '标题长度不能超过 200 字符';
    return;
  }
  if (description.value.length > 2000) {
    formError.value = '描述长度不能超过 2000 字符';
    return;
  }
  formError.value = '';
  submitting.value = true;
  try {
    await store.createTodo({
      title: trimmed,
      description: description.value,
      dueDate: dueDate.value || null,
    });
    title.value = '';
    description.value = '';
    dueDate.value = '';
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '创建失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form class="todo-form" @submit.prevent="onSubmit">
    <div class="field">
      <label for="todo-title">标题 *</label>
      <input id="todo-title" v-model="title" name="title" type="text" maxlength="200"
        :disabled="disabled || submitting" required />
    </div>
    <div class="field">
      <label for="todo-description">描述</label>
      <textarea id="todo-description" v-model="description" name="description" maxlength="2000"
        :disabled="disabled || submitting"></textarea>
    </div>
    <div class="field">
      <label for="todo-due">截止日期</label>
      <input id="todo-due" v-model="dueDate" name="dueDate" type="date"
        :disabled="disabled || submitting" />
    </div>
    <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
    <button type="submit" :disabled="disabled || submitting">添加待办</button>
  </form>
</template>

<style scoped>
.todo-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.field label {
  font-size: 0.85rem;
  color: #444;
}
input,
textarea {
  padding: 0.4rem 0.6rem;
  border: 1px solid #bbb;
  border-radius: 6px;
  font: inherit;
}
textarea {
  min-width: 14rem;
  min-height: 2.2rem;
  resize: vertical;
}
button {
  padding: 0.45rem 1rem;
  border: none;
  border-radius: 6px;
  background: #2f6fed;
  color: #fff;
  font: inherit;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.form-error {
  width: 100%;
  margin: 0;
  color: #c62828;
  font-size: 0.85rem;
}
</style>
