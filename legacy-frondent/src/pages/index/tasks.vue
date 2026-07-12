<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EmptyState from '@/components/common/EmptyState.vue';
import { useTasksStore } from '@/stores/tasks';
import { useWorkspacesStore } from '@/stores/workspaces';
import { formatDate, formatDateTime, fileSize } from '@/utils/format';
import type { Priority, Task } from '@/services/api';

const route = useRoute();
const router = useRouter();
const tasks = useTasksStore();
const workspaces = useWorkspacesStore();
const createOpen = shallowRef(false);
const saving = shallowRef(false);
const commentBody = shallowRef('');
const newSubtask = shallowRef('');
const attachmentFile = shallowRef<File | null>(null);
const newTag = reactive({ name: '', color: '#08aeb7' });
const newAssignment = shallowRef<number | null>(null);
const newDependency = shallowRef<number | null>(null);
const reminderAt = shallowRef('');
const recurrenceEnabled = shallowRef(false);
const recurrenceRule = shallowRef('{"frequency":"weekly","interval":1}');

const form = reactive<{
  title: string;
  description: string;
  workspace_id: number | null;
  priority: Priority;
  due_at: string;
}>({
  title: '',
  description: '',
  workspace_id: null,
  priority: 'normal',
  due_at: '',
});

const selectedTaskId = computed(() => Number(route.query.id || 0) || null);
const workspaceOptions = computed(() =>
  workspaces.activeWorkspaces.map((workspace) => ({ label: workspace.name, value: workspace.id })),
);
const statusOptions = computed(() => tasks.statuses.map((status) => ({ label: status.name, value: status.id })));
const selectedWorkspace = computed({
  get: () => tasks.filters.workspace_id ?? null,
  set: (value: number | null) => {
    void tasks.hydrate({ ...tasks.filters, workspace_id: value || undefined });
  },
});
const priorityFilter = computed({
  get: () => tasks.filters.priority ?? null,
  set: (value: Priority | null) => {
    void tasks.hydrate({ ...tasks.filters, priority: value || undefined });
  },
});

onMounted(async () => {
  await Promise.all([tasks.hydrateMetadata(), workspaces.hydrate()]);
  await tasks.hydrate();
  if (selectedTaskId.value) await tasks.loadTask(selectedTaskId.value);
});

watch(selectedTaskId, (id) => {
  if (id) void tasks.loadTask(id);
});

async function createTask() {
  saving.value = true;
  try {
    const task = await tasks.createTask({
      title: form.title,
      description: form.description,
      workspace_id: form.workspace_id,
      priority: form.priority,
      due_at: form.due_at || null,
    });
    Object.assign(form, { title: '', description: '', workspace_id: null, priority: 'normal', due_at: '' });
    createOpen.value = false;
    await router.replace({ path: '/tasks', query: { id: task.id } });
  } finally {
    saving.value = false;
  }
}

async function selectTask(task: Task) {
  await router.replace({ path: '/tasks', query: { id: task.id } });
}

async function submitComment() {
  if (!tasks.current || !commentBody.value.trim()) return;
  await tasks.addComment(tasks.current.id, commentBody.value.trim());
  commentBody.value = '';
}

async function submitSubtask() {
  if (!tasks.current || !newSubtask.value.trim()) return;
  await tasks.addSubtask(tasks.current.id, newSubtask.value.trim());
  newSubtask.value = '';
}

async function submitTag() {
  if (!tasks.current || !newTag.name.trim()) return;
  await tasks.addTag(tasks.current.id, newTag.name.trim(), newTag.color);
  newTag.name = '';
}

async function submitAssignment() {
  if (!tasks.current || !newAssignment.value) return;
  await tasks.addAssignment(tasks.current.id, newAssignment.value);
  newAssignment.value = null;
}

async function submitReminder() {
  if (!tasks.current || !reminderAt.value) return;
  await tasks.addReminder(tasks.current.id, new Date(reminderAt.value).toISOString());
  reminderAt.value = '';
}

async function submitDependency() {
  if (!tasks.current || !newDependency.value) return;
  await tasks.addDependency(tasks.current.id, newDependency.value);
  newDependency.value = null;
}

async function submitRecurrence() {
  if (!tasks.current) return;
  const rule = JSON.parse(recurrenceRule.value) as Record<string, unknown>;
  await tasks.saveRecurrence(tasks.current.id, recurrenceEnabled.value, rule);
}

async function uploadFiles(file: File | readonly File[] | FileList | null) {
  const selected = file instanceof File ? file : file?.[0];
  if (!tasks.current || !selected) return;
  await tasks.uploadAttachment(tasks.current.id, selected);
  attachmentFile.value = null;
}
</script>

<template>
  <q-page class="ff-page tasks-page">
    <header class="tasks-toolbar">
      <div>
        <h1 class="page-title">Tasks</h1>
        <p>Plan work, assign people, collect files, and keep comments next to the actual task.</p>
      </div>
      <q-btn color="primary" icon="add" label="Create task" no-caps @click="createOpen = true" />
    </header>

    <section class="filter-bar ff-card">
      <q-select v-model="selectedWorkspace" :options="workspaceOptions" emit-value map-options clearable outlined dense label="Workspace" />
      <q-select
        v-model="priorityFilter"
        :options="['low', 'normal', 'high', 'urgent']"
        clearable
        outlined
        dense
        label="Priority"
      />
      <q-toggle
        :model-value="Boolean(tasks.filters.include_archived)"
        label="Include archived"
        @update:model-value="tasks.hydrate({ ...tasks.filters, include_archived: Boolean($event) })"
      />
      <q-btn outline color="dark" icon="bookmark_add" label="Save filter" no-caps @click="tasks.saveCurrentFilter('Saved view')" />
    </section>

    <section class="tasks-layout">
      <div class="board ff-card">
        <div v-if="tasks.loading" class="skeleton-stack">
          <q-skeleton v-for="row in 8" :key="row" height="74px" />
        </div>
        <div v-else-if="tasks.items.length" class="columns">
          <article v-for="group in tasks.groupedByColumn" :key="group.name" class="task-column">
            <header>
              <strong>{{ group.name }}</strong>
              <span>{{ group.tasks.length }}</span>
            </header>
            <button
              v-for="task in group.tasks"
              :key="task.id"
              type="button"
              class="task-card"
              :class="{ active: tasks.current?.id === task.id }"
              @click="selectTask(task)"
            >
              <span class="task-card-title">{{ task.title }}</span>
              <span class="task-card-meta">
                <q-icon name="event" size="16px" /> {{ formatDate(task.due_at) }}
              </span>
              <span class="task-card-footer">
                <span class="ff-chip" :class="`ff-priority-${task.priority}`">{{ task.priority }}</span>
                <span>{{ task.assignments.length }} assigned</span>
              </span>
            </button>
          </article>
        </div>
        <EmptyState v-else icon="view_kanban" title="No tasks match this view" message="Create a task or adjust the workspace, priority, and archive filters." />
      </div>

      <aside class="detail ff-card">
        <div v-if="tasks.detailLoading" class="detail-skeleton">
          <q-skeleton height="40px" />
          <q-skeleton height="120px" />
          <q-skeleton v-for="row in 6" :key="row" height="34px" />
        </div>
        <template v-else-if="tasks.current">
          <header class="detail-head">
            <div>
              <h2>{{ tasks.current.title }}</h2>
              <p>{{ tasks.current.status?.name ?? 'No status' }} · Updated {{ formatDateTime(tasks.current.updated_at) }}</p>
            </div>
            <q-btn-dropdown flat dense round icon="more_vert">
              <q-list dense>
                <q-item clickable v-close-popup @click="tasks.completeTask(tasks.current!.id)">
                  <q-item-section>Mark complete</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="tasks.archiveTask(tasks.current!.id)">
                  <q-item-section>Archive</q-item-section>
                </q-item>
                <q-item clickable v-close-popup class="text-negative" @click="tasks.removeTask(tasks.current!.id)">
                  <q-item-section>Delete</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </header>

          <q-input
            :model-value="tasks.current.title"
            outlined
            dense
            label="Title"
            @change="tasks.updateTask(tasks.current!.id, { title: String($event) })"
          />
          <q-input
            :model-value="tasks.current.description"
            outlined
            autogrow
            label="Description"
            @change="tasks.updateTask(tasks.current!.id, { description: String($event) })"
          />
          <div class="detail-row">
            <q-select
              :model-value="tasks.current.status?.id"
              :options="statusOptions"
              emit-value
              map-options
              outlined
              dense
              label="Status"
              @update:model-value="tasks.updateTask(tasks.current!.id, { status_id: Number($event) })"
            />
            <q-select
              :model-value="tasks.current.priority"
              :options="['low', 'normal', 'high', 'urgent']"
              outlined
              dense
              label="Priority"
              @update:model-value="tasks.updateTask(tasks.current!.id, { priority: $event as Priority })"
            />
          </div>

          <section class="detail-block">
            <h3>Subtasks</h3>
            <q-list dense>
              <q-item v-for="subtask in tasks.current.subtasks" :key="subtask.id">
                <q-item-section avatar>
                  <q-checkbox :model-value="subtask.done" @update:model-value="tasks.toggleSubtask(tasks.current!.id, subtask.id, Boolean($event))" />
                </q-item-section>
                <q-item-section>{{ subtask.title }}</q-item-section>
              </q-item>
            </q-list>
            <div class="inline-form">
              <q-input v-model="newSubtask" dense outlined label="New subtask" @keyup.enter="submitSubtask" />
              <q-btn icon="add" color="primary" aria-label="Add subtask" @click="submitSubtask" />
            </div>
          </section>

          <section class="detail-block">
            <h3>Tags and assignment</h3>
            <div class="tag-list">
              <span v-for="tag in tasks.current.tags" :key="tag.id" class="ff-chip" :style="{ borderColor: tag.color, color: tag.color }">{{ tag.name }}</span>
            </div>
            <div class="inline-form">
              <q-input v-model="newTag.name" dense outlined label="Tag" />
              <q-input v-model="newTag.color" dense outlined label="Color" />
              <q-btn icon="sell" color="primary" aria-label="Add tag" @click="submitTag" />
            </div>
            <div class="inline-form">
              <q-input v-model.number="newAssignment" type="number" dense outlined label="Assignee user id" />
              <q-btn icon="person_add" color="primary" aria-label="Assign user" @click="submitAssignment" />
            </div>
          </section>

          <section class="detail-block">
            <h3>Dependencies and recurrence</h3>
            <q-list dense>
              <q-item v-for="dependency in tasks.current.dependencies" :key="dependency.id">
                <q-item-section>Depends on task {{ dependency.depends_on_task_id }}</q-item-section>
              </q-item>
            </q-list>
            <div class="inline-form">
              <q-input v-model.number="newDependency" type="number" dense outlined label="Depends on task id" />
              <q-btn icon="account_tree" color="primary" aria-label="Add dependency" @click="submitDependency" />
            </div>
            <q-toggle v-model="recurrenceEnabled" label="Enable recurrence" />
            <q-input v-model="recurrenceRule" outlined autogrow label="Recurrence rule JSON" />
            <q-btn outline color="primary" icon="repeat" label="Save recurrence" no-caps @click="submitRecurrence" />
          </section>

          <section class="detail-block">
            <h3>Reminders and files</h3>
            <q-list dense>
              <q-item v-for="reminder in tasks.current.reminders" :key="reminder.id">
                <q-item-section>{{ formatDateTime(reminder.remind_at) }}</q-item-section>
                <q-item-section side>{{ reminder.status }}</q-item-section>
              </q-item>
            </q-list>
            <div class="inline-form">
              <q-input v-model="reminderAt" type="datetime-local" dense outlined label="Reminder" />
              <q-btn icon="alarm_add" color="primary" aria-label="Add reminder" @click="submitReminder" />
            </div>
            <q-file v-model="attachmentFile" outlined dense label="Upload attachment" @update:model-value="uploadFiles" />
            <q-list dense>
              <q-item v-for="attachment in tasks.attachments" :key="attachment.id" clickable @click="tasks.openAttachment(attachment)">
                <q-item-section avatar><q-icon name="attach_file" /></q-item-section>
                <q-item-section>
                  <q-item-label>{{ attachment.originalFilename }}</q-item-label>
                  <q-item-label caption>{{ fileSize(attachment.sizeBytes) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </section>

          <section class="detail-block">
            <h3>Comments</h3>
            <q-list separator>
              <q-item v-for="comment in tasks.comments" :key="comment.id">
                <q-item-section>
                  <q-item-label>{{ comment.body }}</q-item-label>
                  <q-item-label caption>User {{ comment.author_user_id }} · {{ formatDateTime(comment.created_at) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <q-input v-model="commentBody" outlined autogrow label="Add comment" />
            <q-btn color="primary" icon="send" label="Comment" no-caps @click="submitComment" />
          </section>
        </template>
        <EmptyState v-else icon="ads_click" title="Select a task" message="Open a task from the board to edit fields, comments, subtasks, assignments, reminders, and attachments." />
      </aside>
    </section>

    <q-dialog v-model="createOpen">
      <q-card class="create-dialog">
        <q-card-section>
          <h2 class="ff-section-title">Create task</h2>
        </q-card-section>
        <q-card-section class="dialog-form">
          <q-input v-model="form.title" outlined label="Title" :rules="[(value) => !!value || 'Title is required']" />
          <q-input v-model="form.description" outlined autogrow label="Description" />
          <q-select v-model="form.workspace_id" :options="workspaceOptions" emit-value map-options clearable outlined label="Workspace" />
          <q-select v-model="form.priority" :options="['low', 'normal', 'high', 'urgent']" outlined label="Priority" />
          <q-input v-model="form.due_at" type="datetime-local" outlined label="Due date" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" no-caps v-close-popup />
          <q-btn color="primary" label="Create" no-caps :loading="saving" :disable="!form.title" @click="createTask" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.tasks-page {
  display: grid;
  gap: 18px;
}

.tasks-toolbar,
.filter-bar,
.tasks-layout,
.detail-row,
.inline-form,
.tag-list {
  display: flex;
  gap: 12px;
}

.tasks-toolbar {
  align-items: end;
  justify-content: space-between;
}

.page-title {
  margin: 0 0 6px;
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 880;
  line-height: 1;
}

.tasks-toolbar p {
  margin: 0;
  color: var(--ff-muted);
}

.filter-bar {
  align-items: center;
  flex-wrap: wrap;
  padding: 14px;
}

.filter-bar > * {
  min-width: 190px;
}

.tasks-layout {
  align-items: start;
}

.board {
  flex: 1 1 auto;
  min-width: 0;
  padding: 14px;
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.task-column {
  min-height: 560px;
  padding: 12px;
  border: 1px solid var(--ff-line);
  border-radius: 8px;
  background: #f8fbfb;
}

.task-column header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--ff-muted);
  font-weight: 800;
}

.task-card {
  display: grid;
  width: 100%;
  gap: 10px;
  margin-bottom: 10px;
  padding: 13px;
  border: 1px solid rgba(16, 18, 20, 0.08);
  border-radius: 8px;
  background: white;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 140ms ease, transform 140ms ease;
}

.task-card:hover,
.task-card.active {
  border-color: var(--ff-teal);
  transform: translateY(-1px);
}

.task-card-title {
  font-weight: 820;
}

.task-card-meta,
.task-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--ff-muted);
  font-size: 0.82rem;
}

.detail {
  position: sticky;
  top: 88px;
  width: min(520px, 40vw);
  max-height: calc(100vh - 110px);
  padding: 18px;
  overflow: auto;
}

.detail-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.detail-head h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 850;
}

.detail-head p {
  margin: 4px 0 0;
  color: var(--ff-muted);
}

.detail-block {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.detail-block h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 840;
}

.detail-row > * {
  flex: 1;
}

.inline-form {
  align-items: center;
}

.inline-form .q-field {
  flex: 1;
}

.tag-list {
  flex-wrap: wrap;
}

.skeleton-stack,
.detail-skeleton,
.dialog-form {
  display: grid;
  gap: 12px;
}

.create-dialog {
  width: min(560px, calc(100vw - 28px));
}

@media (max-width: 1100px) {
  .tasks-layout {
    display: grid;
  }

  .detail {
    position: static;
    width: 100%;
    max-height: none;
  }
}

@media (max-width: 720px) {
  .tasks-toolbar,
  .filter-bar,
  .inline-form,
  .detail-row {
    display: grid;
  }

  .filter-bar > * {
    min-width: 0;
  }
}
</style>
