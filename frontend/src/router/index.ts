import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import TodoCreateView from '../views/TodoCreateView.vue';

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/todos/new', name: 'todo-create', component: TodoCreateView },
];

export function createAppRouter() {
  return createRouter({ history: createWebHistory(), routes });
}
