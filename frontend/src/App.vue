<script setup lang="ts">
import { useTodoStore } from './stores/todoStore';

const store = useTodoStore();
</script>

<template>
  <main class="app">
    <h1>待办事项</h1>
    <div v-if="store.error" class="error-banner" role="alert" data-testid="error-banner">
      <span>{{ store.error }}</span>
      <button type="button" data-testid="retry-button" @click="store.fetchTodos()">重试</button>
    </div>
    <router-view />
  </main>
</template>

<style>
body {
  margin: 0;
  background: #f5f6f8;
  color: #222;
  font-family: system-ui, 'Segoe UI', sans-serif;
}
.app {
  max-width: 40rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}
h1 {
  font-size: 1.4rem;
  margin: 0 0 1rem;
}
</style>
