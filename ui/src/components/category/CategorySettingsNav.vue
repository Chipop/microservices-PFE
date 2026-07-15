<script setup lang="ts">
defineProps<{
  sections: Array<{ id: string; label: string }>
  activeSection: string
}>()

const emit = defineEmits<{
  sectionChange: [section: string]
}>()
</script>

<template>
  <nav class="category-settings-nav" aria-label="Category settings sections">
    <button
      v-for="section in sections"
      :key="section.id"
      type="button"
      :class="{ active: activeSection === section.id }"
      @click="emit('sectionChange', section.id)"
    >
      {{ section.label }}
    </button>
  </nav>
</template>

<style scoped>
.category-settings-nav {
  display: grid;
  align-content: start;
  gap: 3px;
}

.category-settings-nav button {
  border: 0;
  background: transparent;
  border-radius: 6px;
  color: var(--muted);
  padding: 9px 10px;
  text-align: left;
}

.category-settings-nav button:hover,
.category-settings-nav button.active {
  background: #eaf6f6;
  color: var(--teal-dark);
}
</style>
