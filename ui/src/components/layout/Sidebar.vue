<script setup lang="ts">
import { Bell, ChevronLeft, ChevronRight, CircleUserRound, FolderKanban, Home, ListTodo, Search, Settings, Star, Users, Workflow } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
const app=useAppStore()
const main=[['Home','/home',Home],['Your Work','/tasks?assigned=me',Workflow],['Projects','/projects',FolderKanban],['Tasks','/tasks',ListTodo],['Search','/search',Search],['Members','/members',Users],['Notifications','/notifications',Bell],['Workspace Settings','/workspace/settings',Settings]]
</script>
<template>
<aside class="sidebar" :class="{collapsed:app.sidebarCollapsed}">
  <nav class="sidebar-nav">
    <RouterLink v-for="[label,to,icon] in main" :key="String(label)" :to="String(to)" class="nav-item"><component :is="icon" :size="18"/><span>{{label}}</span></RouterLink>
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
