<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import Avatar from '@/components/common/Avatar.vue'
import type { Category, Task, TaskStatus } from '@/types'

const props = defineProps<{ category: Category }>()

const app = useAppStore()
const boardError = ref('')
const columns: TaskStatus[] = ['Backlog', 'To do', 'In progress', 'Review', 'Done']

const byStatus = (status: TaskStatus) => app.tasks.filter(task => task.categoryId === props.category.id && task.status === status)
const canMove = (task: Task) => task.permissions?.canContribute === true

async function move(task: Task, event: Event) {
  const select = event.target as HTMLSelectElement
  if (!canMove(task)) return
  boardError.value = ''

  try {
    await app.updateTask(task.id, { status: select.value as TaskStatus })
  } catch (exc) {
    select.value = task.status
    boardError.value = exc instanceof Error ? exc.message : 'Could not update task status.'
  }
}
</script>

<template>
  <div class="category-board">
    <p v-if="boardError" class="form-error">{{ boardError }}</p>
    <div class="board">
      <section v-for="status in columns" :key="status" class="board-column">
        <header><span>{{ status }}</span><b>{{ byStatus(status).length }}</b></header>
        <div class="board-cards">
          <article v-for="task in byStatus(status)" :key="task.id" class="board-card">
            <RouterLink :to="`/tasks/${task.id}`">
              <small>{{ task.key }}</small>
              <h3>{{ task.title }}</h3>
              <div class="board-card-footer">
                <span class="priority" :data-priority="task.priority.toLowerCase()">{{ task.priority }}</span>
                <Avatar v-if="task.assignee" :initials="task.assignee.initials" size="sm" />
              </div>
            </RouterLink>
            <select
              :value="task.status"
              :disabled="!canMove(task)"
              :title="canMove(task) ? 'Change status' : 'You do not have permission to edit this task.'"
              @change="move(task, $event)"
            >
              <option v-for="column in columns" :key="column">{{ column }}</option>
            </select>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.category-board {
  display: grid;
  gap: 10px;
}

.form-error {
  margin: 0;
  border: 1px solid #efc6c2;
  border-radius: 6px;
  background: #fff5f4;
  color: var(--danger);
  padding: 9px 10px;
  font-size: 12px;
}
</style>
