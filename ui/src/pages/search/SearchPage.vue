<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { searchApi } from '@/services/api'

const route = useRoute()
const app = useAppStore()
const query = ref(String(route.query.q ?? ''))
const type = ref('All')
const loading = ref(false)
const remoteResults = ref<Array<{ type: string; id: string; title: string; meta: string; to: string }>>([])

const localResults = computed(() => {
  const q = query.value.toLowerCase()
  const all = [
    ...app.tasks.map(t => ({ type: 'Task', id: t.id, title: t.title, meta: `${t.key} · ${t.status}`, to: `/tasks/${t.id}` })),
    ...app.projects.map(p => ({ type: 'Project', id: p.id, title: p.name, meta: `${p.key} · ${p.description}`, to: `/projects/${p.id}/overview` })),
    ...app.workspaces.map(w => ({ type: 'Workspace', id: w.id, title: w.name, meta: w.description, to: '/workspaces' })),
  ]
  return all.filter(r => (type.value === 'All' || r.type === type.value) && (!q || (`${r.title} ${r.meta}`).toLowerCase().includes(q)))
})
const results = computed(() => remoteResults.value.length ? remoteResults.value : localResults.value)

watch(() => route.query.q, q => { query.value = String(q ?? '') })
watch([query, type], search, { immediate: true })

async function search() {
  if (!query.value.trim() || import.meta.env.VITE_USE_MOCKS === 'true') {
    remoteResults.value = []
    return
  }
  loading.value = true
  try {
    const response = await searchApi.global(query.value, type.value === 'All' ? undefined : type.value.toLowerCase())
    remoteResults.value = response.results.map(item => ({
      type: item.type,
      id: item.id,
      title: item.title,
      meta: item.snippet,
      to: item.type === 'task' ? `/tasks/${item.id}` : item.type === 'project' ? `/projects/${item.id}/overview` : '/search',
    }))
  } catch {
    remoteResults.value = []
  } finally {
    loading.value = false
  }
}
</script>
<template><div class="page"><header class="page-header"><div><h1>Search</h1><p>Find tasks, projects, workspaces and people.</p></div></header><div class="search-hero"><input v-model="query" autofocus placeholder="Search FlowForge"/><select v-model="type"><option>All</option><option>Task</option><option>Project</option><option>Workspace</option></select></div><div class="search-layout"><aside><button class="active">All results</button><button>Tasks</button><button>Projects</button><button>People</button><button>Comments</button></aside><section class="panel"><div class="panel-header"><div><h2>{{results.length}} results</h2><p v-if="query">{{loading ? 'Searching...' : `Results for ${query}`}}</p></div></div><RouterLink v-for="r in results" :key="r.type+r.id" :to="r.to" class="search-result"><span class="result-type">{{r.type}}</span><span><strong>{{r.title}}</strong><small>{{r.meta}}</small></span></RouterLink><div v-if="!results.length" class="empty-state"><h3>No results found</h3><p>Try fewer words or a different filter.</p></div></section></div></div></template>
