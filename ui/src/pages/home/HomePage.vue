<script setup lang="ts">
import { ArrowRight, Bell, FolderPlus, ListTodo, Plus, Settings, Star, Users } from 'lucide-vue-next'
import { computed } from 'vue'
import { useTaskCreation } from '@/composables/useTaskCreation'
import { useAppStore } from '@/stores/app'
import { useNotificationStore } from '@/stores/notifications'
import TaskRow from '@/components/task/TaskRow.vue'
const app = useAppStore(); const notifications = useNotificationStore()
const { openCreateTask } = useTaskCreation()
const greetingName = computed(() => app.currentUser.name || app.currentUser.username)
const assigned = computed(() => app.tasks.filter(t => t.assignee?.id === app.currentUser.id && t.status !== 'Done').slice(0, 5))
const dueSoon = computed(() => app.tasks.filter(t => t.dueDate && t.status !== 'Done').slice(0, 4))
const recentCategories = computed(() => app.currentCategories.slice(0, 4))
const canManageWorkspace = computed(() => app.currentWorkspace?.role === 'OWNER' || app.currentWorkspace?.role === 'ADMIN')
</script>
<template>
    <div class="page home-page">
        <header class="page-header">
            <div>
                <p class="eyebrow">{{ app.currentWorkspace?.name }}</p>
                <h1>Good afternoon, {{ greetingName }}</h1>
                <p>Here is the work that needs attention across your workspace.</p>
            </div>
            <div class="header-actions"><button class="btn btn-primary" @click="openCreateTask()">
                    <Plus :size="16" />Create task
                </button></div>
        </header>
        <section class="quick-actions">
            <RouterLink to="/your-work">
                <ListTodo :size="19" /><span><strong>Your work</strong><small>View assigned tasks</small></span>
            </RouterLink>
            <RouterLink to="/categories">
                <FolderPlus :size="19" /><span><strong>Browse categories</strong><small>Open category spaces</small></span>
            </RouterLink>
            <RouterLink v-if="canManageWorkspace" to="/workspace/settings">
                <Settings :size="19" /><span><strong>Workspace settings</strong><small>Manage access</small></span>
            </RouterLink>
            <RouterLink to="/notifications">
                <Bell :size="19" /><span><strong>Notifications</strong><small>{{ notifications.unreadCount }} unread
                        updates</small></span>
            </RouterLink>
        </section>
        <div class="home-grid">
            <section class="panel span-2">
                <div class="panel-header">
                    <div>
                        <h2>Assigned to you</h2>
                        <p>Open work across your categories</p>
                    </div>
                    <RouterLink to="/your-work">View all
                        <ArrowRight :size="15" />
                    </RouterLink>
                </div>
                <div class="task-list">
                    <TaskRow v-for="task in assigned" :key="task.id" :task="task" />
                    <div v-if="!assigned.length" class="empty-state compact">
                        <h3>No assigned tasks</h3>
                        <p>Tasks assigned to you will appear here.</p>
                    </div>
                </div>
            </section>
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <h2>Recent categories</h2>
                        <p>Your latest category spaces</p>
                    </div>
                </div>
                <div class="category-list">
                    <RouterLink v-for="category in recentCategories" :key="category.id"
                        :to="`/categories/${category.id}/overview`" class="category-card-compact"><span class="category-icon"
                            :style="{ background: category.color }">{{ category.key.slice(0, 1) }}</span><span><strong>{{ category.name }}</strong><small>{{ category.completedCount }}
                                of {{ category.taskCount }} complete</small></span>
                        <Star v-if="category.favorite" :size="14" class="favorite-star" />
                    </RouterLink>
                    <div v-if="!recentCategories.length" class="empty-state compact">
                        <h3>No categories yet</h3>
                        <p>Create a category to organize workspace tasks.</p>
                    </div>
                </div>
            </section>
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <h2>Due soon</h2>
                        <p>Upcoming task deadlines</p>
                    </div>
                </div>
                <div class="due-list">
                    <RouterLink v-for="task in dueSoon" :key="task.id" :to="`/tasks/${task.id}`"><span
                            class="date-box"><b>{{ task.dueDate?.slice(8) }}</b><small>{{ task.dueDate?.slice(5, 7) }}</small></span><span><strong>{{ task.title }}</strong><small>{{ task.key }}
                                · {{ task.priority }}</small></span></RouterLink>
                    <div v-if="!dueSoon.length" class="empty-state compact">
                        <h3>No upcoming deadlines</h3>
                        <p>Tasks with due dates will appear here.</p>
                    </div>
                </div>
            </section>
            <section class="panel">
                <div class="panel-header">
                    <div>
                        <h2>Workspace members</h2>
                        <p>People with access to this workspace</p>
                    </div>
                </div>
                <div class="activity-list">
                    <div v-for="member in app.workspaceMembers.slice(0, 4)" :key="member.id">
                        <Users :size="16" />
                        <p><strong>{{ member.name }}</strong><small>{{ member.role }}</small></p>
                    </div>
                    <div v-if="!app.workspaceMembers.length" class="empty-state compact">
                        <h3>No members loaded</h3>
                        <p>Workspace members will appear after the workspace loads.</p>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>
