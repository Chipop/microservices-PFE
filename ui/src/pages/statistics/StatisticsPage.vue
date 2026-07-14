<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef, watch } from 'vue'
import { statisticsApi, type StatisticsOverviewDto } from '@/services/api'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const loading = shallowRef(false)
const error = shallowRef('')
const selectedCategoryId = shallowRef('')
const overview = shallowRef<StatisticsOverviewDto | null>(null)

const filters = reactive({
  status: '',
  priority: '',
})

const categoryRows = computed(() => Object.entries(overview.value?.byCategory ?? {}).map(([id, count]) => ({
  id,
  count,
  name: app.categories.find(category => category.id === id)?.name ?? (id === 'uncategorized' ? 'Uncategorized' : `Category ${id}`),
})))

const statusRows = computed(() => Object.entries(overview.value?.byStatus ?? {}))
const priorityRows = computed(() => Object.entries(overview.value?.byPriority ?? {}))
const trendRows = computed(() => Object.entries(overview.value?.trends ?? {}).sort(([a], [b]) => a.localeCompare(b)).slice(-14))
const maxTrend = computed(() => Math.max(1, ...trendRows.value.map(([, count]) => count)))

async function loadStatistics() {
  if (!app.currentWorkspaceId) return
  loading.value = true
  error.value = ''
  try {
    overview.value = await statisticsApi.overview({
      workspace_id: Number(app.currentWorkspaceId),
      category_id: selectedCategoryId.value ? Number(selectedCategoryId.value) : undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
    })
  } catch (exc) {
    error.value = exc instanceof Error ? exc.message : 'Could not load statistics.'
  } finally {
    loading.value = false
  }
}

watch(() => [app.currentWorkspaceId, selectedCategoryId.value, filters.status, filters.priority] as const, loadStatistics)
onMounted(loadStatistics)
</script>

<template>
  <div class="page statistics-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Productivity</p>
        <h1>Statistics</h1>
      </div>
      <div class="statistics-filters">
        <select v-model="selectedCategoryId">
          <option value="">All categories</option>
          <option v-for="category in app.currentCategories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
        <select v-model="filters.status">
          <option value="">All statuses</option>
          <option value="backlog">Backlog</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
        <select v-model="filters.priority">
          <option value="">All priorities</option>
          <option value="urgent">Highest</option>
          <option value="high">High</option>
          <option value="normal">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
    </header>

    <div v-if="error" class="empty-state"><h3>{{ error }}</h3></div>
    <div v-else class="statistics-grid">
      <section class="metric-card">
        <span>Total tasks</span>
        <strong>{{ overview?.totalTasks ?? 0 }}</strong>
      </section>
      <section class="metric-card">
        <span>Completed</span>
        <strong>{{ overview?.completedTasks ?? 0 }}</strong>
      </section>
      <section class="metric-card">
        <span>Completion rate</span>
        <strong>{{ overview?.completionRate ?? 0 }}%</strong>
      </section>

      <section class="panel span-2">
        <div class="panel-header"><h2>Status distribution</h2></div>
        <div class="bar-list">
          <div v-for="[status, count] in statusRows" :key="status" class="bar-row">
            <span>{{ status.replace('_', ' ') }}</span>
            <i :style="{ width: `${overview?.totalTasks ? (count / overview.totalTasks) * 100 : 0}%` }"></i>
            <strong>{{ count }}</strong>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header"><h2>Priority</h2></div>
        <div class="compact-list">
          <div v-for="[priority, count] in priorityRows" :key="priority"><span>{{ priority }}</span><strong>{{ count }}</strong></div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header"><h2>Categories</h2></div>
        <div class="compact-list">
          <div v-for="row in categoryRows" :key="row.id"><span>{{ row.name }}</span><strong>{{ row.count }}</strong></div>
        </div>
      </section>

      <section class="panel span-2">
        <div class="panel-header"><h2>Completion trend</h2></div>
        <div class="trend-chart" :class="{ loading }">
          <div v-for="[day, count] in trendRows" :key="day" class="trend-bar">
            <i :style="{ height: `${Math.max(8, (count / maxTrend) * 100)}%` }"></i>
            <span>{{ day.slice(5) }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
