<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTaskCreation } from '@/composables/useTaskCreation'
import { useAppStore } from '@/stores/app'
import TaskRow from '@/components/task/TaskRow.vue'

const app = useAppStore()
const { openCreateTask } = useTaskCreation()
const query = ref('')
const status = ref('All')

const rows = computed(() =>
  app.tasks.filter(task =>
    task.assignee?.id === app.currentUser.id &&
    (status.value === 'All' || task.status === status.value) &&
    task.title.toLowerCase().includes(query.value.toLowerCase())
  )
)
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Your work</h1>
        <p>Tasks assigned to you across the workspace.</p>
      </div>
      <button class="btn btn-primary" @click="openCreateTask()">Create task</button>
    </header>
    <div class="toolbar">
      <input v-model="query" placeholder="Search your work"/>
      <select v-model="status">
        <option>All</option>
        <option>Backlog</option>
        <option>To do</option>
        <option>In progress</option>
        <option>Review</option>
        <option>Done</option>
      </select>
      <select>
        <option>All priorities</option>
        <option>Highest</option>
        <option>High</option>
        <option>Medium</option>
        <option>Low</option>
      </select>
      <select>
        <option>Sort by updated</option>
        <option>Sort by due date</option>
      </select>
    </div>
    <section class="panel">
      <div class="task-list">
        <TaskRow v-for="task in rows" :key="task.id" :task="task"/>
      </div>
    </section>
  </div>
</template>
