<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  message: string;
}>();
</script>

<template>
  <div class="empty-state">
    <q-icon :name="icon" size="42px" />
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-message">{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 42px 22px;
  text-align: center;
  color: var(--ff-muted);
}

.empty-title {
  margin: 0;
  color: var(--ff-ink);
  font-size: 1.05rem;
  font-weight: 780;
}

.empty-message {
  max-width: 420px;
  margin: 0;
  line-height: 1.55;
}
</style>
