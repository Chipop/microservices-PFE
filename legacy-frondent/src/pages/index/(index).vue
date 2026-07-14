<template>
  <q-page class="q-pa-md">
    <div class="page-wrap">
      <div class="row items-center justify-between q-mb-md">
        <div>
          <div class="text-h5">My Tasks</div>
          <div class="text-caption text-grey-7">
            {{ tasks.remaining }} open · {{ tasks.total }} total
          </div>
        </div>
        <q-btn
          flat
          round
          icon="refresh"
          color="primary"
          :loading="tasks.loading"
          aria-label="Refresh"
          @click="refresh"
        >
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
      </div>

      <!-- Add a task -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <q-form @submit.prevent="onAdd" class="row q-col-gutter-sm items-start">
            <div class="col">
              <q-input
                v-model="newTitle"
                outlined
                dense
                placeholder="What needs to be done?"
                maxlength="200"
                :rules="[(v) => !!v.trim() || 'Enter a title']"
                hide-bottom-space
              >
                <template #prepend><q-icon name="add_task" /></template>
              </q-input>
            </div>
            <div class="col-auto">
              <q-btn
                type="submit"
                color="primary"
                icon="add"
                label="Add"
                no-caps
                :loading="adding"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <!-- List -->
      <q-card flat bordered>
        <q-inner-loading :showing="tasks.loading && !tasks.items.length" />

        <q-list separator>
          <q-item v-for="task in tasks.items" :key="task.id">
            <q-item-section side top>
              <q-checkbox
                :model-value="task.done"
                color="primary"
                @update:model-value="onToggle(task)"
              />
            </q-item-section>

            <q-item-section>
              <q-item-label
                :class="task.done ? 'text-strike text-grey-6' : ''"
              >
                {{ task.title }}
              </q-item-label>
              <q-item-label caption>
                {{ task.status?.name ?? 'Todo' }} · {{ task.priority }} · {{ formatDate(task.created_at) }}
              </q-item-label>
            </q-item-section>

            <q-item-section side>
              <div class="row items-center no-wrap">
                <q-btn
                  flat
                  round
                  dense
                  icon="edit"
                  color="grey-7"
                  aria-label="Edit"
                  @click="onRename(task)"
                />
                <q-btn
                  flat
                  round
                  dense
                  icon="archive"
                  color="grey-7"
                  aria-label="Archive"
                  @click="onArchive(task)"
                />
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  color="negative"
                  aria-label="Delete"
                  @click="onDelete(task)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <div
          v-if="!tasks.loading && !tasks.items.length"
          class="column flex-center text-grey-6 q-pa-xl"
        >
          <q-icon name="inbox" size="48px" />
          <div class="q-mt-sm">No tasks yet — add your first one above.</div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useTasksStore } from '@/stores/tasks';
import type { Task } from '@/services/api';

const $q = useQuasar();
const tasks = useTasksStore();

const newTitle = ref('');
const adding = ref(false);

onMounted(refresh);

async function refresh() {
  try {
    await tasks.fetch();
  } catch (err) {
    notifyError(err, 'Could not load tasks');
  }
}

async function onAdd() {
  const title = newTitle.value.trim();
  if (!title) return;
  adding.value = true;
  try {
    await tasks.add(title);
    newTitle.value = '';
  } catch (err) {
    notifyError(err, 'Could not add task');
  } finally {
    adding.value = false;
  }
}

async function onToggle(task: Task) {
  try {
    await tasks.toggle(task);
  } catch (err) {
    notifyError(err, 'Could not update task');
  }
}

function onRename(task: Task) {
  $q.dialog({
    title: 'Rename task',
    prompt: { model: task.title, type: 'text', isValid: (v: string) => v.trim().length > 0 },
    cancel: true,
    persistent: false,
  }).onOk((value: string) => {
    void (async () => {
      try {
        await tasks.rename(task, value.trim());
      } catch (err) {
        notifyError(err, 'Could not rename task');
      }
    })();
  });
}

function onArchive(task: Task) {
  void (async () => {
    try {
      await tasks.archive(task);
      $q.notify({ type: 'positive', message: 'Task archived' });
    } catch (err) {
      notifyError(err, 'Could not archive task');
    }
  })();
}

function onDelete(task: Task) {
  $q.dialog({
    title: 'Delete task',
    message: `Delete "${task.title}"?`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative' },
  }).onOk(() => {
    void (async () => {
      try {
        await tasks.remove(task.id);
        $q.notify({ type: 'positive', message: 'Task deleted' });
      } catch (err) {
        notifyError(err, 'Could not delete task');
      }
    })();
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function notifyError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  $q.notify({ type: 'negative', message });
}
</script>

<style scoped>
.page-wrap {
  max-width: 720px;
  margin: 0 auto;
}
.text-strike {
  text-decoration: line-through;
}
</style>
