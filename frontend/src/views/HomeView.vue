<script setup lang="ts">
import { onMounted } from 'vue';
import { useTodoStore } from '../stores/todoStore';
import StatusTabs from '../components/StatusTabs.vue';
import TodoList from '../components/TodoList.vue';
import AddButton from '../components/AddButton.vue';

const store = useTodoStore();

onMounted(() => {
  void store.fetchTodos();
});
</script>

<template>
  <div class="home-view" data-testid="home-view">
    <div class="home-toolbar">
      <StatusTabs />
      <AddButton />
    </div>
    <TodoList />
  </div>
</template>

<style scoped>
.home-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
</style>
