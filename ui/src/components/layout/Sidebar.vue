<script setup lang="ts">
import { BarChart3, Bell, ChevronLeft, ChevronRight, CircleUserRound, FolderKanban, Home, Settings, Star, Workflow } from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
const app=useAppStore()
const route = useRoute()

type NavItem = {
  label: string
  to: string
  icon: Component
  section: string
  adminOnly?: boolean
}

const main = computed<NavItem[]>(() => {
  const canManageWorkspace = app.currentWorkspace?.role === 'OWNER' || app.currentWorkspace?.role === 'ADMIN'
  return [
  { label: 'Home', to: '/home', icon: Home, section: '/home' },
  { label: 'Your Work', to: '/your-work', icon: Workflow, section: '/your-work' },
  { label: 'Categories', to: '/categories', icon: FolderKanban, section: '/categories' },
  { label: 'Statistics', to: '/statistics', icon: BarChart3, section: '/statistics' },
  { label: 'Notifications', to: '/notifications', icon: Bell, section: '/notifications' },
  ...(canManageWorkspace ? [{ label: 'Workspace Settings', to: '/workspace/settings', icon: Settings, section: '/workspace/settings' }] : [])
  ]
})

function isMainItemActive(item: NavItem) {
  if (item.section === '/tasks') {
    return route.path.startsWith('/tasks')
  }

  return route.path === item.section || route.path.startsWith(`${item.section}/`)
}
</script>
<template>
<aside class="sidebar" :class="{collapsed:app.sidebarCollapsed}">
  <nav class="sidebar-nav">
    <RouterLink v-for="item in main" :key="item.label" :to="item.to" custom v-slot="{ href, navigate }">
      <a :href="href" class="nav-item" :class="{ active: isMainItemActive(item) }" @click="navigate"><component :is="item.icon" :size="18"/><span>{{item.label}}</span></a>
    </RouterLink>
  </nav>
  <div class="sidebar-section">
    <div class="sidebar-heading"><span>Favorite categories</span><Star :size="13"/></div>
    <RouterLink v-for="category in app.currentCategories.filter(p=>p.favorite)" :key="category.id" :to="`/categories/${category.id}/overview`" class="category-link"><span class="category-dot" :style="{background:category.color}"></span><span>{{category.name}}</span></RouterLink>
  </div>
  <div class="sidebar-section">
    <div class="sidebar-heading">Recent</div>
    <RouterLink v-for="category in app.currentCategories.slice(0,3)" :key="category.id" :to="`/categories/${category.id}/overview`" class="category-link"><span class="category-key">{{category.key}}</span><span>{{category.name}}</span></RouterLink>
  </div>
  <div class="sidebar-footer"><RouterLink to="/profile"><CircleUserRound :size="18"/><span>Account</span></RouterLink><button class="collapse-button" @click="app.toggleSidebar"><ChevronRight v-if="app.sidebarCollapsed" :size="17"/><ChevronLeft v-else :size="17"/></button></div>
</aside>
</template>
