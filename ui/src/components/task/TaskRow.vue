<script setup lang="ts">
import Avatar from '@/components/common/Avatar.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { Task } from '@/types'

defineProps<{
  task: Task
}>()
</script>

<template>
  <RouterLink
    :to="`/tasks/${task.id}`"
    class="task-row"
  >
    <span class="task-key">{{ task.key }}</span>
    <span class="task-title">{{ task.title }}</span>
    <StatusBadge :value="task.status" />
    <span
      class="priority"
      :data-priority="task.priority.toLowerCase()"
    >
      {{ task.priority }}
    </span>
    <Avatar
      v-if="task.assignee"
      :initials="task.assignee.initials"
      size="sm"
    />
    <span class="task-date">{{ task.dueDate ?? 'No due date' }}</span>
  </RouterLink>
</template>
