<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TopNavbar from './TopNavbar.vue'
import Sidebar from './Sidebar.vue'
import Modal from '@/components/common/Modal.vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import type { Priority, TaskStatus } from '@/types'
const app=useAppStore(); const auth=useAuthStore(); const notifications=useNotificationStore(); const router=useRouter(); const createOpen=ref(false)
const form=ref({title:'',projectId:'',status:'To do' as TaskStatus,priority:'Medium' as Priority,dueDate:''})
const createError=ref('')
onMounted(async()=>{ await app.initialize(); form.value.projectId=app.currentProjects[0]?.id ?? ''; await notifications.initialize(); notifications.connectSocket() })
async function createTask(){ createError.value=''; if(!form.value.title.trim()) return; if(!form.value.projectId){ createError.value='Create a project before adding tasks.'; return } await app.createTask(form.value); createOpen.value=false; form.value.title='' }
async function logout(){ notifications.reset(); app.reset(); await auth.logoutRemote(); router.push('/login') }
</script>
<template>
<div class="app-shell"><TopNavbar @create="createOpen=true" @logout="logout"/><Sidebar/><main class="app-main" :class="{expanded:app.sidebarCollapsed}"><RouterView/></main>
<Modal title="Create task" :open="createOpen" @close="createOpen=false"><form class="form-stack" @submit.prevent="createTask"><label>Title<input v-model="form.title" autofocus placeholder="What needs to be done?"/></label><label>Project<select v-model="form.projectId"><option value="" disabled>Select project</option><option v-for="p in app.currentProjects" :key="p.id" :value="p.id">{{p.name}}</option></select></label><div class="form-grid"><label>Status<select v-model="form.status"><option>Backlog</option><option>To do</option><option>In progress</option><option>Review</option><option>Done</option></select></label><label>Priority<select v-model="form.priority"><option>Highest</option><option>High</option><option>Medium</option><option>Low</option></select></label></div><label>Due date<input v-model="form.dueDate" type="date"/></label><p v-if="createError" class="form-error">{{createError}}</p><div class="modal-actions"><button type="button" class="btn" @click="createOpen=false">Cancel</button><button class="btn btn-primary">Create task</button></div></form></Modal>
</div>
</template>
