<script setup lang="ts">
import { Bell, ChevronLeft, ChevronRight, CircleUserRound, FolderKanban, Home, ListTodo, Search, Settings, Star, Users, Workflow } from 'lucide-vue-next'
import type { Component } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
const app=useAppStore()
const route = useRoute()

type NavItem = {
  label: string
  to: string
  icon: Component
  section: string
}

const main: NavItem[] = [
  { label: 'Home', to: '/home', icon: Home, section: '/home' },
  { label: 'Your Work', to: '/your-work', icon: Workflow, section: '/your-work' },
  { label: 'Projects', to: '/projects', icon: FolderKanban, section: '/projects' },
  { label: 'Tasks', to: '/tasks', icon: ListTodo, section: '/tasks' },
  { label: 'Search', to: '/search', icon: Search, section: '/search' },
  { label: 'Members', to: '/members', icon: Users, section: '/members' },
  { label: 'Notifications', to: '/notifications', icon: Bell, section: '/notifications' },
  { label: 'Workspace Settings', to: '/workspace/settings', icon: Settings, section: '/workspace/settings' }
]

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
    <div class="sidebar-heading"><span>Favorite projects</span><Star :size="13"/></div>
    <RouterLink v-for="project in app.currentProjects.filter(p=>p.favorite)" :key="project.id" :to="`/projects/${project.id}/overview`" class="project-link"><span class="project-dot" :style="{background:project.color}"></span><span>{{project.name}}</span></RouterLink>
  </div>
  <div class="sidebar-section">
    <div class="sidebar-heading">Recent</div>
    <RouterLink v-for="project in app.currentProjects.slice(0,3)" :key="project.id" :to="`/projects/${project.id}/overview`" class="project-link"><span class="project-key">{{project.key}}</span><span>{{project.name}}</span></RouterLink>
  </div>
  <div class="sidebar-footer"><RouterLink to="/profile"><CircleUserRound :size="18"/><span>Account</span></RouterLink><button class="collapse-button" @click="app.toggleSidebar"><ChevronRight v-if="app.sidebarCollapsed" :size="17"/><ChevronLeft v-else :size="17"/></button></div>
</aside>
</template>
