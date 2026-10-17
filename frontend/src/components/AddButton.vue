<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <button
    type="button"
    class="add-button"
    data-testid="add-button"
    aria-label="新增待办"
    @click="router.push('/todos/new')"
  >+</button>
</template>

<style scoped>
.add-button {
  width: 2.2rem;
  height: 2.2rem;
  border: none;
  border-radius: 50%;
  background: #2f6fed;
  color: #fff;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
}
</style>
