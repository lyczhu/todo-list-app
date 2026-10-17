import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createAppRouter } from './router';
import App from './App.vue';

createApp(App).use(createPinia()).use(createAppRouter()).mount('#app');
