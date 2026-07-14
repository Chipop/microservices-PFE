<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import NotificationMenu from '@/components/notifications/NotificationMenu.vue';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import { useTasksStore } from '@/stores/tasks';
import { useWorkspacesStore } from '@/stores/workspaces';

const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const tasks = useTasksStore();
const workspaces = useWorkspacesStore();
const leftDrawerOpen = shallowRef(false);

const navItems = [
  { label: 'Command center', icon: 'dashboard', to: '/home' },
  { label: 'Tasks', icon: 'view_kanban', to: '/tasks' },
  { label: 'Workspaces', icon: 'hub', to: '/workspaces' },
  { label: 'Search', icon: 'search', to: '/search' },
  { label: 'Notifications', icon: 'notifications', to: '/notifications' },
  { label: 'Profile', icon: 'account_circle', to: '/profile' },
  { label: 'Security', icon: 'shield', to: '/security' },
];

const displayName = computed(() => auth.displayName || 'FlowForge');

onMounted(() => {
  if (auth.isSignedIn && !auth.profile) void auth.loadProfile();
  if (auth.isSignedIn) {
    void notifications.hydrate().catch(() => undefined);
    notifications.connect();
  }
});

onUnmounted(() => {
  notifications.disconnect();
});

async function onLogout() {
  await auth.logoutRemote();
  tasks.reset();
  workspaces.reset();
  notifications.reset();
  await router.replace('/login');
}
</script>

<template>
  <q-layout view="lHh LpR lFf" class="app-shell">
    <q-header class="shell-header">
      <q-toolbar class="shell-toolbar">
        <q-btn flat dense round icon="menu" aria-label="Open navigation" @click="leftDrawerOpen = !leftDrawerOpen" />
        <router-link to="/home" class="brand-lockup">
          <img src="/logo.png" alt="FlowForge" />
        </router-link>
        <q-space />
        <div class="connection-pill" :class="{ live: notifications.connected }">
          <span />
          {{ notifications.connected ? 'Live' : 'Polling' }}
        </div>
        <NotificationMenu />
        <q-btn-dropdown flat no-caps class="profile-menu">
          <template #label>
            <q-avatar size="30px" color="primary" text-color="white">
              {{ displayName.slice(0, 1).toUpperCase() }}
            </q-avatar>
          </template>
          <q-list dense>
            <q-item clickable to="/profile" v-close-popup>
              <q-item-section avatar><q-icon name="account_circle" /></q-item-section>
              <q-item-section>Profile</q-item-section>
            </q-item>
            <q-item clickable to="/security" v-close-popup>
              <q-item-section avatar><q-icon name="shield" /></q-item-section>
              <q-item-section>Security</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup @click="onLogout">
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>Sign out</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above :width="280" class="shell-drawer">
      <div class="drawer-panel ff-facet">
        <div class="drawer-user">
          <q-avatar size="46px" color="dark" text-color="white">
            {{ displayName.slice(0, 1).toUpperCase() }}
          </q-avatar>
          <div>
            <strong>{{ displayName }}</strong>
            <span>{{ auth.profile?.email }}</span>
          </div>
        </div>
        <q-list class="drawer-nav">
          <q-item
            v-for="item in navItems"
            :key="item.to"
            clickable
            v-ripple
            :to="item.to"
            exact
            active-class="active-nav"
          >
            <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.shell-header {
  background: rgba(255, 255, 255, 0.92);
  color: var(--ff-ink);
  border-bottom: 1px solid var(--ff-line);
  backdrop-filter: blur(18px);
}

.shell-toolbar {
  min-height: 68px;
  padding: 0 20px;
}

.brand-lockup {
  display: inline-flex;
  align-items: center;
  width: 156px;
  height: 42px;
  overflow: hidden;
}

.brand-lockup img {
  width: 220px;
  transform: translateX(-10px);
}

.connection-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
  color: var(--ff-muted);
  font-size: 0.8rem;
  font-weight: 750;
}

.connection-pill span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ff-amber);
}

.connection-pill.live span {
  background: var(--ff-green);
}

.shell-drawer {
  background: transparent;
  border-right: 0;
}

.drawer-panel {
  height: calc(100% - 24px);
  margin: 12px;
  padding: 18px;
  border: 1px solid rgba(16, 18, 20, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: var(--ff-shadow);
}

.drawer-user {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 78px;
  margin-bottom: 14px;
}

.drawer-user strong,
.drawer-user span {
  display: block;
}

.drawer-user span {
  max-width: 170px;
  overflow: hidden;
  color: var(--ff-muted);
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-nav {
  position: relative;
  z-index: 1;
}

.drawer-nav :deep(.q-item) {
  min-height: 46px;
  margin-bottom: 4px;
  border-radius: 8px;
  color: #334149;
  font-weight: 720;
}

.drawer-nav :deep(.active-nav) {
  background: linear-gradient(90deg, rgba(8, 174, 183, 0.14), rgba(247, 185, 20, 0.12));
  color: var(--ff-ink);
}

@media (max-width: 700px) {
  .connection-pill {
    display: none;
  }

  .brand-lockup {
    width: 130px;
  }
}
</style>
