<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import TaskRow from '@/components/task/TaskRow.vue'
import { useAppStore } from '@/stores/app'
import type { Category } from '@/types'

const props = defineProps<{
  category: Category
}>()

const app = useAppStore()
const filter = shallowRef('')

const rows = computed(() => {
  const q = filter.value.toLowerCase()
  return app.tasks.filter(task => task.categoryId === props.category.id && task.title.toLowerCase().includes(q))
})
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <input
        v-model="filter"
        placeholder="Filter tasks"
      >
      <select>
        <option>All statuses</option>
        <option>Open</option>
        <option>Completed</option>
      </select>
      <select>
        <option>Sort by updated</option>
        <option>Sort by priority</option>
      </select>
    </div>

    <div class="task-list">
      <TaskRow
        v-for="task in rows"
        :key="task.id"
        :task="task"
      />
    </div>
  </section>
</template>
