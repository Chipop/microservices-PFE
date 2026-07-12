<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Archive, Bell, Calendar, Link2, Paperclip, Repeat2, Trash2 } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import Avatar from '@/components/common/Avatar.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { Priority, TaskStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const comment = ref('')
const loading = ref(false)
const task = computed(() => app.tasks.find(t => t.id === route.params.id || t.key === route.params.id))
const projectName = computed(() => task.value ? app.projects.find(p => p.id === task.value?.projectId)?.name : '')

async function hydrate() {
  loading.value = true
  try {
    await app.hydrateTaskDetails(String(route.params.id))
  } finally {
    loading.value = false
  }
}

function updateStatus(e: Event) {
  if (task.value) app.updateTask(task.value.id, { status: (e.target as HTMLSelectElement).value as TaskStatus })
}

function updatePriority(e: Event) {
  if (task.value) app.updateTask(task.value.id, { priority: (e.target as HTMLSelectElement).value as Priority })
}

async function addComment() {
  if (!task.value || !comment.value.trim()) return
  await app.addComment(task.value.id, comment.value.trim())
  comment.value = ''
}

onMounted(hydrate)
watch(() => route.params.id, hydrate)
</script>
<template><div v-if="task" class="task-detail-page"><header class="task-detail-header"><div><button class="link-button" @click="router.back()">Back</button><p class="eyebrow">{{task.key}} · {{projectName}}</p><h1>{{task.title}}</h1></div><div class="header-actions"><button class="btn"><Archive :size="15"/>Archive</button><button class="btn btn-danger"><Trash2 :size="15"/>Delete</button></div></header><div class="task-detail-grid"><main class="task-main panel"><section><h2>Description</h2><p class="editable-block">{{task.description || 'No description yet.'}}</p></section><section><h2>Subtasks</h2><label v-for="s in task.subtasks" :key="s.id" class="subtask"><input v-model="s.done" type="checkbox"/>{{s.title}}</label><p v-if="!task.subtasks.length">No subtasks yet.</p></section><section><h2>Attachments</h2><div v-if="task.attachments.length" class="file-list"><div v-for="a in task.attachments" :key="a.id"><Paperclip :size="18"/><span><strong>{{a.name}}</strong><small>{{a.size}}</small></span></div></div><p v-else>No files attached.</p></section><section><h2>Comments</h2><form class="comment-composer" @submit.prevent="addComment"><Avatar :initials="app.currentUser.initials" size="sm"/><textarea v-model="comment" placeholder="Add a comment..."></textarea><button class="btn btn-primary">Comment</button></form><p v-if="loading">Loading details...</p><article v-for="c in task.comments" :key="c.id" class="comment"><Avatar :initials="c.author.initials" size="sm"/><div><strong>{{c.author.name}}</strong><small>{{c.createdAt}}</small><p>{{c.body}}</p></div></article></section><section><h2>Activity</h2><div class="activity-list"><div><StatusBadge value="Updated"/><p>Task status changed to {{task.status}}<small>{{task.updatedAt}}</small></p></div><div><StatusBadge value="Created"/><p>{{task.reporter.name}} created this task<small>{{task.createdAt}}</small></p></div></div></section></main><aside class="task-sidebar panel"><h2>Details</h2><label>Status<select :value="task.status" @change="updateStatus"><option>Backlog</option><option>To do</option><option>In progress</option><option>Review</option><option>Done</option></select></label><label>Priority<select :value="task.priority" @change="updatePriority"><option>Highest</option><option>High</option><option>Medium</option><option>Low</option></select></label><label>Assignee<div class="person-field"><Avatar :initials="task.assignee?.initials ?? '?'" size="sm"/>{{task.assignee?.name ?? 'Unassigned'}}</div></label><label>Reporter<div class="person-field"><Avatar :initials="task.reporter.initials" size="sm"/>{{task.reporter.name}}</div></label><label><Calendar :size="15"/>Due date<input type="date" :value="task.dueDate"/></label><label>Tags<div class="tag-list"><span v-for="tag in task.tags" :key="tag">{{tag}}</span></div></label><hr/><h2>More</h2><button class="detail-action"><Link2 :size="16"/>Dependencies <span>{{task.dependencies.length}}</span></button><button class="detail-action"><Repeat2 :size="16"/>Recurrence <span>{{task.recurrence ?? 'None'}}</span></button><button class="detail-action"><Bell :size="16"/>Reminders <span>{{task.reminders.length}}</span></button></aside></div></div><div v-else class="page"><div class="empty-state"><h2>Task not found</h2><RouterLink to="/tasks" class="btn">Back to tasks</RouterLink></div></div></template>
