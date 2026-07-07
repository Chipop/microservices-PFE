<template>
  <q-page class="q-pa-md">
    <div class="page-wrap">
      <div class="row items-center justify-between q-mb-md">
        <div>
          <div class="text-h5">My Todos</div>
          <div class="text-caption text-grey-7">
            {{ todos.remaining }} open · {{ todos.total }} total
          </div>
        </div>
        <q-btn
          flat
          round
          icon="refresh"
          color="primary"
          :loading="todos.loading"
          aria-label="Refresh"
          @click="refresh"
        >
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
      </div>

      <!-- Add a todo -->
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
        <q-inner-loading :showing="todos.loading && !todos.items.length" />

        <q-list separator>
          <q-item v-for="todo in todos.items" :key="todo.id">
            <q-item-section side top>
              <q-checkbox
                :model-value="todo.done"
                color="primary"
                @update:model-value="onToggle(todo)"
              />
            </q-item-section>

            <q-item-section>
              <q-item-label
                :class="todo.done ? 'text-strike text-grey-6' : ''"
              >
                {{ todo.title }}
              </q-item-label>
              <q-item-label caption>
                {{ formatDate(todo.created_at) }}
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
                  @click="onRename(todo)"
                />
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  color="negative"
                  aria-label="Delete"
                  @click="onDelete(todo)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <div
          v-if="!todos.loading && !todos.items.length"
          class="column flex-center text-grey-6 q-pa-xl"
        >
          <q-icon name="inbox" size="48px" />
          <div class="q-mt-sm">No todos yet — add your first one above.</div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useTodosStore } from '@/stores/todos';
import type { Todo } from '@/services/api';

const $q = useQuasar();
const todos = useTodosStore();

const newTitle = ref('');
const adding = ref(false);

onMounted(refresh);

async function refresh() {
  try {
    await todos.fetch();
  } catch (err) {
    notifyError(err, 'Could not load todos');
  }
}

async function onAdd() {
  const title = newTitle.value.trim();
  if (!title) return;
  adding.value = true;
  try {
    await todos.add(title);
    newTitle.value = '';
  } catch (err) {
    notifyError(err, 'Could not add todo');
  } finally {
    adding.value = false;
  }
}

async function onToggle(todo: Todo) {
  try {
    await todos.toggle(todo);
  } catch (err) {
    notifyError(err, 'Could not update todo');
  }
}

function onRename(todo: Todo) {
  $q.dialog({
    title: 'Rename todo',
    prompt: { model: todo.title, type: 'text', isValid: (v: string) => v.trim().length > 0 },
    cancel: true,
    persistent: false,
  }).onOk((value: string) => {
    void (async () => {
      try {
        await todos.rename(todo, value.trim());
      } catch (err) {
        notifyError(err, 'Could not rename todo');
      }
    })();
  });
}

function onDelete(todo: Todo) {
  $q.dialog({
    title: 'Delete todo',
    message: `Delete "${todo.title}"?`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative' },
  }).onOk(() => {
    void (async () => {
      try {
        await todos.remove(todo.id);
        $q.notify({ type: 'positive', message: 'Todo deleted' });
      } catch (err) {
        notifyError(err, 'Could not delete todo');
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
