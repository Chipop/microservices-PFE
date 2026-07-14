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
const saving = ref(false)
const updateError = ref('')
const task = computed(() => app.tasks.find(t => t.id === route.params.id || t.key === route.params.id))
const categoryName = computed(() => task.value ? app.categories.find(p => p.id === task.value?.categoryId)?.name : '')
const canEditTask = computed(() => task.value?.permissions?.canContribute === true)
const canDeleteTask = computed(() => task.value?.permissions?.canDelete === true)
const isReadOnly = computed(() => task.value?.permissions && !canEditTask.value)
const controlsDisabled = computed(() => loading.value || saving.value || !canEditTask.value)
const visibleError = computed(() => updateError.value || app.error)

async function hydrate() {
  loading.value = true
  updateError.value = ''
  try {
    await app.hydrateTaskDetails(String(route.params.id))
  } finally {
    loading.value = false
  }
}

async function updateStatus(e: Event) {
  const select = e.target as HTMLSelectElement
  if (!task.value || !canEditTask.value) return
  saving.value = true
  updateError.value = ''
  try {
    await app.updateTask(task.value.id, { status: select.value as TaskStatus })
    await hydrate()
  } catch (exc) {
    updateError.value = exc instanceof Error ? exc.message : 'Could not update task status.'
    if (task.value) select.value = task.value.status
  } finally {
    saving.value = false
  }
}

async function updatePriority(e: Event) {
  const select = e.target as HTMLSelectElement
  if (!task.value || !canEditTask.value) return
  saving.value = true
  updateError.value = ''
  try {
    await app.updateTask(task.value.id, { priority: select.value as Priority })
    await hydrate()
  } catch (exc) {
    updateError.value = exc instanceof Error ? exc.message : 'Could not update task priority.'
    if (task.value) select.value = task.value.priority
  } finally {
    saving.value = false
  }
}

async function addComment() {
  if (!task.value || !comment.value.trim() || !canEditTask.value) return
  saving.value = true
  updateError.value = ''
  try {
    await app.addComment(task.value.id, comment.value.trim())
    comment.value = ''
    await hydrate()
  } catch (exc) {
    updateError.value = exc instanceof Error ? exc.message : 'Could not add comment.'
  } finally {
    saving.value = false
  }
}

onMounted(hydrate)
watch(() => route.params.id, hydrate)
</script>
<template>
  <div v-if="task" class="task-detail-page">
    <header class="task-detail-header">
      <div><button class="link-button" @click="router.back()">Back</button>
        <p class="eyebrow">{{ task.key }} · {{ categoryName }}</p>
        <h1>{{ task.title }}</h1>
      </div>
      <div class="header-actions"><button class="btn" :disabled="!canEditTask">
          <Archive :size="15" />Archive
        </button><button class="btn btn-danger" :disabled="!canDeleteTask">
          <Trash2 :size="15" />Delete
        </button></div>
    </header>
    <div class="task-detail-grid">
      <main class="task-main panel">
        <section>
          <h2>Description</h2>
          <p class="editable-block">{{ task.description || 'No description yet.' }}</p>
        </section>
        <section>
          <h2>Subtasks</h2><label v-for="s in task.subtasks" :key="s.id" class="subtask"><input v-model="s.done"
              :disabled="!canEditTask"
              type="checkbox" />{{ s.title }}</label>
          <p v-if="!task.subtasks.length">No subtasks yet.</p>
        </section>
        <section>
          <h2>Attachments</h2>
          <div v-if="task.attachments.length" class="file-list">
            <div v-for="a in task.attachments" :key="a.id">
              <Paperclip :size="18" /><span><strong>{{ a.name }}</strong><small>{{ a.size }}</small></span>
            </div>
          </div>
          <p v-else>No files attached.</p>
        </section>
        <section>
          <h2>Comments</h2>
          <p v-if="isReadOnly" class="permission-note">You can view this task, but you do not have permission to edit it.</p>
          <form class="comment-composer" @submit.prevent="addComment">
            <Avatar :initials="app.currentUser.initials" size="sm" /><textarea v-model="comment"
              :disabled="controlsDisabled" placeholder="Add a comment..."></textarea><button class="btn btn-primary"
              :disabled="controlsDisabled || !comment.trim()">Comment</button>
          </form>
          <p v-if="loading">Loading details...</p>
          <article v-for="c in task.comments" :key="c.id" class="comment">
            <Avatar :initials="c.author.initials" size="sm" />
            <div><strong>{{ c.author.name }}</strong><small>{{ c.createdAt }}</small>
              <p>{{ c.body }}</p>
            </div>
          </article>
        </section>
        <section>
          <h2>Activity</h2>
          <div class="activity-list">
            <div v-for="activity in task.activities" :key="activity.id">
              <StatusBadge :value="activity.type.replace(/_/g, ' ')" />
              <p>{{ activity.actor.name }} {{ activity.message }}<small>{{ activity.createdAt }}</small></p>
            </div>
            <p v-if="!task.activities.length">No activity yet.</p>
          </div>
        </section>
      </main>
      <aside class="task-sidebar panel">
        <h2>Details</h2>
        <p v-if="isReadOnly" class="permission-note">You can view this task, but you do not have permission to edit it.</p>
        <p v-if="visibleError" class="form-error">{{ visibleError }}</p>
        <label>Status<select :value="task.status" :disabled="controlsDisabled" @change="updateStatus">
            <option>Backlog</option>
            <option>To do</option>
            <option>In progress</option>
            <option>Review</option>
            <option>Done</option>
          </select></label><label>Priority<select :value="task.priority" :disabled="controlsDisabled" @change="updatePriority">
            <option>Highest</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select></label><label>Assignee<div class="person-field">
            <Avatar :initials="task.assignee?.initials ?? '?'" size="sm" />{{ task.assignee?.name ?? 'Unassigned' }}
          </div></label><label>Reporter<div class="person-field">
            <Avatar :initials="task.reporter.initials" size="sm" />{{ task.reporter.name }}
          </div></label><label>
          <Calendar :size="15" />Due date<input type="date" :value="task.dueDate" :disabled="!canEditTask" />
        </label><label>Tags<div class="tag-list"><span v-for="tag in task.tags" :key="tag">{{ tag }}</span></div>
          </label>
        <hr />
        <h2>More</h2><button class="detail-action">
          <Link2 :size="16" />Dependencies <span>{{ task.dependencies.length }}</span>
        </button><button class="detail-action">
          <Repeat2 :size="16" />Recurrence <span>{{ task.recurrence ?? 'None' }}</span>
        </button><button class="detail-action">
          <Bell :size="16" />Reminders <span>{{ task.reminders.length }}</span>
        </button>
      </aside>
    </div>
  </div>
  <div v-else class="page">
    <div class="empty-state">
      <h2>Task not found</h2>
      <RouterLink to="/your-work" class="btn">Back to your work</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.permission-note,
.form-error {
  margin: 0 0 12px;
  border-radius: 6px;
  padding: 9px 10px;
  font-size: 12px;
}

.permission-note {
  border: 1px solid #d8e4e7;
  background: #f5f9fa;
  color: var(--charcoal);
}

.form-error {
  border: 1px solid #efc6c2;
  background: #fff5f4;
  color: var(--danger);
}
</style>
