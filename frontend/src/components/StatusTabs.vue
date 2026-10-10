<script setup lang="ts">
import { useTodoStore } from '../stores/todoStore';
import type { TodoStatusFilter } from '../api/types';

const store = useTodoStore();

const tabs: { value: TodoStatusFilter; label: string }[] = [
  { value: 'active', label: '未完成' },
  { value: 'completed', label: '已完成' },
  { value: 'all', label: '全部' },
];
</script>

<template>
  <div class="status-tabs" role="tablist" aria-label="按状态分类">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="store.filter === tab.value"
      :class="{ active: store.filter === tab.value }"
      @click="store.setFilter(tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.status-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
button {
  padding: 0.35rem 0.9rem;
  border: 1px solid #bbb;
  border-radius: 999px;
  background: #fff;
  font: inherit;
  cursor: pointer;
}
button.active {
  background: #2f6fed;
  border-color: #2f6fed;
  color: #fff;
}
</style>
