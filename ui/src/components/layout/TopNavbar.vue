<script setup lang="ts">
import { Bell, CircleHelp, Menu, Plus, Search } from 'lucide-vue-next'
import { computed, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskCreation } from '@/composables/useTaskCreation'
import { searchApi } from '@/services/api'
import { useAppStore } from '@/stores/app'
import { useNotificationStore } from '@/stores/notifications'
import Avatar from '@/components/common/Avatar.vue'
import logo from '@/assets/flowforge-logo.png'

type SearchResult = {
  type: string
  id: string
  title: string
  meta: string
  to: string
}

const emit = defineEmits<{ logout: [] }>()
const app = useAppStore(); const notifications = useNotificationStore(); const router = useRouter()
const { openCreateTask } = useTaskCreation()
const searchOpen = shallowRef(false)
const searchLoading = shallowRef(false)
const searchError = shallowRef('')
const searchResults = shallowRef<SearchResult[]>([])
let searchTimer: ReturnType<typeof window.setTimeout> | undefined
let searchRun = 0

const searchQuery = computed(() => app.globalQuery.trim())
const canManageWorkspace = computed(() => app.currentWorkspace?.role === 'OWNER' || app.currentWorkspace?.role === 'ADMIN')
const searchStatus = computed(() => {
  if (searchLoading.value) return 'Searching...'
  if (searchError.value) return searchError.value
  if (!searchQuery.value) return 'Start typing to search FlowForge.'
  if (!searchResults.value.length) return 'No results found.'
  return ''
})

watch(searchQuery, query => {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchOpen.value = Boolean(query)
  searchError.value = ''
  if (!query) {
    searchLoading.value = false
    searchResults.value = []
    return
  }
  searchTimer = window.setTimeout(() => runSearch(query), 250)
})

async function runSearch(query = searchQuery.value) {
  if (!query) return
  const run = ++searchRun
  searchLoading.value = true
  searchError.value = ''
  try {
    const response = await searchApi.global(query)
    if (run !== searchRun) return
    searchResults.value = response.results.slice(0, 8).map(item => ({
      type: item.type,
      id: item.id,
      title: item.title,
      meta: item.snippet,
      to: resultTarget(item.type, item.id),
    }))
    searchOpen.value = true
  } catch (exc) {
    if (run !== searchRun) return
    searchResults.value = []
    searchError.value = exc instanceof Error ? exc.message : 'Search failed.'
  } finally {
    if (run === searchRun) searchLoading.value = false
  }
}

function resultTarget(type: string, id: string) {
  if (type === 'task') return `/tasks/${id}`
  if (type === 'category') return `/categories/${id}/overview`
  if (type === 'workspace') return '/workspaces'
  if (type === 'user' && canManageWorkspace.value) return '/workspace/settings#members'
  return ''
}

function submitSearch() {
  searchOpen.value = true
  void runSearch()
}

function selectResult(result: SearchResult) {
  searchOpen.value = false
  if (result.to) void router.push(result.to)
}
</script>
<template>
  <header class="topbar">
    <div class="topbar-left">
      <button class="icon-btn mobile-menu" @click="app.toggleSidebar">
        <Menu :size="19" />
      </button>
      <RouterLink to="/home" class="brand"><img :src="logo" alt="FlowForge" /><span>FlowForge</span></RouterLink>
      <select class="workspace-select" :value="app.currentWorkspaceId"
        @change="app.switchWorkspace(($event.target as HTMLSelectElement).value)">
        <option v-for="w in app.workspaces" :key="w.id" :value="w.id">{{ w.name }}</option>
      </select>
    </div>
    <form class="global-search" @submit.prevent="submitSearch">
      <Search :size="16" /><input v-model="app.globalQuery" placeholder="Search work, people and files" @focus="searchOpen = Boolean(searchQuery)" /><kbd>/</kbd>
      <div v-if="searchOpen" class="global-search-results">
        <button
          v-for="result in searchResults"
          :key="`${result.type}-${result.id}`"
          class="global-search-result"
          type="button"
          @mousedown.prevent="selectResult(result)"
        >
          <span class="result-type">{{ result.type }}</span>
          <span>
            <strong>{{ result.title }}</strong>
            <small>{{ result.meta }}</small>
          </span>
        </button>
        <p v-if="searchStatus" class="global-search-status">{{ searchStatus }}</p>
      </div>
    </form>
    <div class="topbar-actions">
      <button class="btn btn-primary" @click="openCreateTask()">
        <Plus :size="16" />Create
      </button>
      <RouterLink to="/notifications" class="icon-btn notification-button">
        <Bell :size="19" /><span v-if="notifications.unreadCount"
          class="count-badge">{{ notifications.unreadCount }}</span>
      </RouterLink>
      <button class="icon-btn">
        <CircleHelp :size="19" />
      </button>
      <RouterLink to="/profile" class="user-trigger">
        <Avatar :initials="app.currentUser.initials" size="sm" /><span>{{ app.currentUser.name }}</span>
      </RouterLink>
      <button class="btn" @click="emit('logout')">Log out</button>
    </div>
  </header>
</template>
