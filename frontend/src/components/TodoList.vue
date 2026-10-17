<script setup lang="ts">
import { useTodoStore } from '../stores/todoStore';
import TodoItem from './TodoItem.vue';

const store = useTodoStore();
</script>

<template>
  <section class="todo-list" aria-label="待办列表">
    <p v-if="store.loading" class="state-hint">加载中…</p>

    <template v-else-if="store.filter === 'all'">
      <div v-if="store.todos.length === 0" class="state-hint" data-testid="empty-all">
        还没有任何待办事项，点击「+」创建第一条吧。
      </div>
      <template v-else>
        <div class="group">
          <h3>未完成</h3>
          <p v-if="store.activeGroup.length === 0" class="state-hint">暂无未完成事项</p>
          <ul v-else>
            <TodoItem v-for="t in store.activeGroup" :key="t.id" :todo="t" :disabled="!!store.error" />
          </ul>
        </div>
        <div class="group">
          <h3>已完成</h3>
          <p v-if="store.completedGroup.length === 0" class="state-hint">暂无已完成事项</p>
          <ul v-else>
            <TodoItem v-for="t in store.completedGroup" :key="t.id" :todo="t" :disabled="!!store.error" />
          </ul>
        </div>
      </template>
    </template>

    <template v-else>
      <div v-if="store.isEmpty" class="state-hint" :data-testid="`empty-${store.filter}`">
        <template v-if="store.filter === 'completed'">暂无已完成事项。</template>
        <template v-else>没有未完成事项。点击「+」创建第一条待办吧。</template>
      </div>
      <ul v-else>
        <TodoItem v-for="t in store.visibleTodos" :key="t.id" :todo="t" :disabled="!!store.error" />
      </ul>
    </template>
  </section>
</template>

<style scoped>
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
li {
  padding: 0.6rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
}
li.done {
  color: #888;
  text-decoration: line-through;
}
h3 {
  margin: 0.75rem 0 0.4rem;
  font-size: 0.95rem;
  color: #555;
}
.state-hint {
  color: #666;
}
</style>
