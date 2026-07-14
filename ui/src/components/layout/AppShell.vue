<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import TopNavbar from './TopNavbar.vue'
import Sidebar from './Sidebar.vue'
import CreateTaskModal from '@/components/task/CreateTaskModal.vue'
import { provideTaskCreation, type OpenCreateTaskOptions } from '@/composables/useTaskCreation'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
const app=useAppStore(); const auth=useAuthStore(); const notifications=useNotificationStore(); const router=useRouter(); const createOpen=shallowRef(false); const defaultCategoryId=shallowRef<string | undefined>()
function openCreateTask(options?: OpenCreateTaskOptions){ defaultCategoryId.value=options?.categoryId; createOpen.value=true }
function closeCreateTask(){ createOpen.value=false; defaultCategoryId.value=undefined }
provideTaskCreation({ openCreateTask })
onMounted(async()=>{ await app.initialize(); await notifications.initialize(); notifications.connectSocket() })
async function logout(){ notifications.reset(); app.reset(); await auth.logoutRemote(); router.push('/login') }
</script>
<template>
<div class="app-shell"><TopNavbar @logout="logout"/><Sidebar/><main class="app-main" :class="{expanded:app.sidebarCollapsed}"><RouterView/></main>
<CreateTaskModal :open="createOpen" :default-category-id="defaultCategoryId" @close="closeCreateTask"/>
</div>
</template>
