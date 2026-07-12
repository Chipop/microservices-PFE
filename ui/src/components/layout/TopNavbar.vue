<script setup lang="ts">
import { Bell, CircleHelp, Menu, Plus, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useNotificationStore } from '@/stores/notifications'
import Avatar from '@/components/common/Avatar.vue'
import logo from '@/assets/flowforge-logo.png'

const emit = defineEmits<{ create: []; logout: [] }>()
const app = useAppStore(); const notifications = useNotificationStore(); const router=useRouter()
function runSearch(){ if(app.globalQuery.trim()) router.push({path:'/search',query:{q:app.globalQuery}}) }
</script>
<template>
<header class="topbar">
  <div class="topbar-left">
    <button class="icon-btn mobile-menu" @click="app.toggleSidebar"><Menu :size="19"/></button>
    <RouterLink to="/home" class="brand"><img :src="logo" alt="FlowForge"/><span>FlowForge</span></RouterLink>
    <select class="workspace-select" :value="app.currentWorkspaceId" @change="app.switchWorkspace(($event.target as HTMLSelectElement).value)">
      <option v-for="w in app.workspaces" :key="w.id" :value="w.id">{{w.name}}</option>
    </select>
  </div>
  <form class="global-search" @submit.prevent="runSearch"><Search :size="16"/><input v-model="app.globalQuery" placeholder="Search work, people and files"/><kbd>/</kbd></form>
  <div class="topbar-actions">
    <button class="btn btn-primary" @click="emit('create')"><Plus :size="16"/>Create</button>
    <RouterLink to="/notifications" class="icon-btn notification-button"><Bell :size="19"/><span v-if="notifications.unreadCount" class="count-badge">{{notifications.unreadCount}}</span></RouterLink>
    <button class="icon-btn"><CircleHelp :size="19"/></button>
    <RouterLink to="/profile" class="user-trigger"><Avatar :initials="app.currentUser.initials" size="sm"/><span>{{app.currentUser.name}}</span></RouterLink>
    <button class="btn" @click="emit('logout')">Log out</button>
  </div>
</header>
</template>
