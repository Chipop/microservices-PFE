<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { searchApi, type SearchResponse } from '@/services/api';

const loading = shallowRef(false);
const response = shallowRef<SearchResponse | null>(null);
const query = reactive({ q: '', scope: 'global', type: '', priority: '' });
const scopes = [
  { label: 'All', value: 'global' },
  { label: 'Tasks', value: 'tasks' },
  { label: 'Workspaces', value: 'workspaces' },
  { label: 'Users', value: 'users' },
  { label: 'Comments', value: 'comments' },
];
const resultCount = computed(() => response.value?.total ?? 0);

async function runSearch(page = 0) {
  if (!query.q.trim()) return;
  loading.value = true;
  try {
    if (query.scope === 'tasks') response.value = await searchApi.tasks({ q: query.q, priority: query.priority as never, page });
    else if (query.scope === 'workspaces') response.value = await searchApi.workspaces({ q: query.q, page });
    else if (query.scope === 'users') response.value = await searchApi.users({ q: query.q, page });
    else if (query.scope === 'comments') response.value = await searchApi.comments({ q: query.q, page });
    else response.value = await searchApi.global({ q: query.q, type: query.type, page });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <q-page class="ff-page search-page">
    <header class="search-head ff-card ff-facet">
      <h1>Search</h1>
      <p>Query the search service across tasks, workspaces, public users, and comments.</p>
      <div class="search-controls">
        <q-input v-model="query.q" outlined label="Search terms" @keyup.enter="runSearch()" />
        <q-select v-model="query.scope" :options="scopes" emit-value map-options outlined label="Scope" />
        <q-input v-if="query.scope === 'global'" v-model="query.type" outlined label="Type filter" placeholder="task,user,workspace" />
        <q-select v-if="query.scope === 'tasks'" v-model="query.priority" :options="['', 'low', 'normal', 'high', 'urgent']" outlined label="Priority" />
        <q-btn color="primary" icon="search" label="Search" no-caps :loading="loading" @click="runSearch()" />
      </div>
    </header>

    <section class="results ff-card">
      <header class="results-head">
        <h2 class="ff-section-title">Results</h2>
        <span class="ff-chip">{{ resultCount }} matches</span>
      </header>
      <div v-if="loading" class="result-list">
        <q-skeleton v-for="row in 6" :key="row" height="74px" />
      </div>
      <q-list v-else-if="response?.results.length" separator>
        <q-item v-for="result in response.results" :key="`${result.type}-${result.id}`">
          <q-item-section avatar><q-icon :name="result.type === 'task' ? 'task_alt' : result.type === 'user' ? 'person' : 'article'" /></q-item-section>
          <q-item-section>
            <q-item-label class="result-title">{{ result.title }}</q-item-label>
            <q-item-label caption lines="2">{{ result.snippet }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <span class="ff-chip">{{ result.type }}</span>
          </q-item-section>
        </q-item>
      </q-list>
      <EmptyState v-else icon="search" title="No search results" message="Run a search using a term indexed by the search service." />
    </section>
  </q-page>
</template>

<style scoped>
.search-page,
.result-list {
  display: grid;
  gap: 16px;
}

.search-head,
.results {
  padding: 22px;
}

.search-head h1 {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 4.4rem);
  font-weight: 880;
}

.search-head p {
  position: relative;
  z-index: 1;
  margin: 8px 0 20px;
  color: var(--ff-muted);
}

.search-controls,
.results-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-controls .q-field {
  min-width: 190px;
  flex: 1;
}

.results-head {
  justify-content: space-between;
  margin-bottom: 12px;
}

.result-title {
  font-weight: 790;
}

@media (max-width: 780px) {
  .search-controls {
    display: grid;
  }
}
</style>
