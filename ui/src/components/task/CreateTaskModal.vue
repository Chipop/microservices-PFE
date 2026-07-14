<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Modal from '@/components/common/Modal.vue'
import { useAppStore } from '@/stores/app'
import type { Priority, TaskStatus, User } from '@/types'

const props = defineProps<{
  open: boolean
  defaultCategoryId?: string
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const app = useAppStore()
const router = useRouter()
const route = useRoute()
const saving = shallowRef(false)
const submitError = shallowRef('')
const form = reactive({
  title: '',
  categoryId: '',
  description: '',
  assigneeUsername: '',
  status: 'To do' as TaskStatus,
  priority: 'Medium' as Priority,
  dueDate: '',
  tagsText: '',
  subtasks: [''],
  reminders: [''],
  recurrence: '',
})
const createError = computed(() => {
  if (app.currentCategories.length > 0 || form.categoryId) return ''
  return 'Create a category before adding tasks.'
})
const hasCategories = computed(() => app.currentCategories.length > 0)
const assigneeOptions = computed(() => {
  const members: User[] = [...app.workspaceMembers]
  if (app.currentUser.id && !members.some(member => member.username === app.currentUser.username)) {
    members.unshift(app.currentUser)
  }
  return members
})
const selectedAssignee = computed(() => assigneeOptions.value.find(user => user.username === form.assigneeUsername))
const parsedTags = computed(() => [...new Set(form.tagsText.split(',').map(tag => tag.trim()).filter(Boolean))])
const parsedSubtasks = computed(() => form.subtasks.map(subtask => subtask.trim()).filter(Boolean))
const parsedReminders = computed(() => form.reminders.map(reminder => reminder.trim()).filter(Boolean))

watch(
  () => [props.open, props.defaultCategoryId, app.currentWorkspaceId, app.currentCategories.map(category => category.id).join('|'), app.currentUser.username] as const,
  () => {
    if (!props.open) return
    const preferredCategory = app.currentCategories.find(category => category.id === props.defaultCategoryId)
    form.categoryId = preferredCategory?.id ?? app.currentCategories[0]?.id ?? ''
    form.assigneeUsername = app.currentUser.username
    submitError.value = ''
  },
  { immediate: true },
)

async function createTask() {
  if (!form.title.trim() || !form.categoryId) return
  saving.value = true
  submitError.value = ''
  try {
    await app.createTask({
      title: form.title.trim(),
      categoryId: form.categoryId,
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate,
      assignee: selectedAssignee.value,
      assigneeUsername: form.assigneeUsername,
      assigneeUserId: selectedAssignee.value?.id,
      tags: parsedTags.value,
      subtaskTitles: parsedSubtasks.value,
      reminderDates: parsedReminders.value,
      recurrence: form.recurrence,
    })
    resetForm()
    emit('created')
    emit('close')
  } catch (exc) {
    submitError.value = exc instanceof Error ? exc.message : 'Could not create task.'
  } finally {
    saving.value = false
  }
}

function goToCategoryCreation() {
  emit('close')
  router.push({ path: '/categories/new', query: { returnTo: route.fullPath } })
}

function addSubtask() {
  form.subtasks.push('')
}

function removeSubtask(index: number) {
  form.subtasks.splice(index, 1)
  if (!form.subtasks.length) form.subtasks.push('')
}

function addReminder() {
  form.reminders.push('')
}

function removeReminder(index: number) {
  form.reminders.splice(index, 1)
  if (!form.reminders.length) form.reminders.push('')
}

function resetForm() {
  form.title = ''
  form.description = ''
  form.dueDate = ''
  form.tagsText = ''
  form.subtasks = ['']
  form.reminders = ['']
  form.recurrence = ''
}
</script>

<template>
  <Modal title="Create task" :open="open" @close="emit('close')">
    <form class="task-create-form" @submit.prevent="createTask">
      <div class="task-create-banner">
        <span>New work order</span>
        <strong>{{ app.currentWorkspace?.name ?? 'Current workspace' }}</strong>
      </div>

      <template v-if="hasCategories">
        <section class="task-create-section task-create-section-top">
          <label>
            Category
            <select v-model="form.categoryId">
              <option value="" disabled>Select category</option>
              <option v-for="category in app.currentCategories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
          <label>
            Assignee
            <select v-model="form.assigneeUsername">
              <option value="">Unassigned</option>
              <option v-for="member in assigneeOptions" :key="member.id" :value="member.username">
                {{ member.name }} ({{ member.username }})
              </option>
            </select>
          </label>
          <label>
            Status
            <select v-model="form.status">
              <option>Backlog</option>
              <option>To do</option>
              <option>In progress</option>
              <option>Review</option>
              <option>Done</option>
            </select>
          </label>
          <label>
            Priority
            <select v-model="form.priority">
              <option>Highest</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>
        </section>

        <section class="task-create-section">
          <header>
            <h3>Essentials</h3>
            <p>Only title and category are required.</p>
          </header>
          <label>
            Title
            <input v-model="form.title" autofocus placeholder="What needs to be done?" />
          </label>
          <label>
            Description
            <textarea v-model="form.description" rows="4" placeholder="Add context, requirements, links, or acceptance notes"></textarea>
          </label>
          <label>
            Tags
            <input v-model="form.tagsText" placeholder="frontend, urgent, release" />
          </label>
        </section>

        <section class="task-create-grid">
          <fieldset class="task-create-section">
            <legend>Planning</legend>
            <label>
              Due date
              <input v-model="form.dueDate" type="date" />
            </label>

            <label>
              Recurrence
              <select v-model="form.recurrence">
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <div class="task-create-stack">
              <span class="task-create-label">Reminders</span>
              <div v-for="(_, index) in form.reminders" :key="index" class="inline-field-row">
                <input v-model="form.reminders[index]" type="datetime-local" />
                <button type="button" class="btn" @click="removeReminder(index)">Remove</button>
              </div>
              <button type="button" class="btn align-start" @click="addReminder">Add reminder</button>
            </div>
          </fieldset>

          <fieldset class="task-create-section">
            <legend>Breakdown</legend>
            <div v-for="(_, index) in form.subtasks" :key="index" class="inline-field-row">
              <input v-model="form.subtasks[index]" placeholder="Subtask title" />
              <button type="button" class="btn" @click="removeSubtask(index)">Remove</button>
            </div>
            <button type="button" class="btn align-start" @click="addSubtask">Add subtask</button>
          </fieldset>
        </section>
      </template>

      <div v-else class="modal-empty-state">
        <p>{{ createError }}</p>
        <button type="button" class="btn" @click="goToCategoryCreation">Create category</button>
      </div>

      <div class="task-create-actions">
        <button type="button" class="btn" @click="emit('close')">Cancel</button>
        <button class="btn btn-primary" :disabled="saving || !hasCategories || !form.title.trim()">
          {{ saving ? 'Creating...' : 'Create task' }}
        </button>
      </div>
      <p v-if="submitError" class="form-error">{{ submitError }}</p>
    </form>
  </Modal>
</template>
