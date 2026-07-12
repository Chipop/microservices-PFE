<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="row items-center no-wrap">
          <q-icon name="checklist" class="q-mr-sm" />
          Tasks
        </q-toolbar-title>

        <q-chip v-if="auth.displayName" color="white" text-color="primary" icon="person">
          {{ auth.displayName }}
        </q-chip>
        <q-btn flat dense round icon="notifications" aria-label="Notifications">
          <q-badge v-if="notifications.unreadCount" color="red" floating>
            {{ notifications.unreadCount }}
          </q-badge>
          <q-menu anchor="bottom right" self="top right" max-width="360px">
            <q-list style="min-width: 320px">
              <q-item-label header class="row items-center justify-between">
                <span>Notifications</span>
                <q-btn
                  v-if="notifications.unreadCount"
                  flat
                  dense
                  no-caps
                  color="primary"
                  label="Mark all read"
                  @click="notifications.markAllRead"
                />
              </q-item-label>
              <q-separator />
              <q-item
                v-for="notification in notifications.items"
                :key="notification.id"
                clickable
                @click="notifications.markRead(notification)"
              >
                <q-item-section>
                  <q-item-label :class="notification.isRead ? 'text-grey-7' : 'text-weight-medium'">
                    {{ notification.title }}
                  </q-item-label>
                  <q-item-label caption lines="2">
                    {{ notification.message }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ formatNotificationDate(notification.createdAt) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    dense
                    round
                    icon="delete"
                    color="grey-7"
                    aria-label="Delete notification"
                    @click.stop="notifications.remove(notification)"
                  />
                </q-item-section>
              </q-item>
              <q-item v-if="!notifications.items.length">
                <q-item-section class="text-grey-7">No notifications</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <q-tooltip>Notifications</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="logout" aria-label="Logout" @click="onLogout">
          <q-tooltip>Sign out</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list padding>
        <q-item-label header>Navigation</q-item-label>

          <q-item clickable v-ripple to="/" exact active-class="text-primary bg-blue-1">
            <q-item-section avatar><q-icon name="list_alt" /></q-item-section>
          <q-item-section>My Tasks</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/profile" active-class="text-primary bg-blue-1">
          <q-item-section avatar><q-icon name="account_circle" /></q-item-section>
          <q-item-section>Profile</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/security" active-class="text-primary bg-blue-1">
          <q-item-section avatar><q-icon name="shield" /></q-item-section>
          <q-item-section>Security</q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <q-item clickable v-ripple @click="onLogout">
          <q-item-section avatar><q-icon name="logout" /></q-item-section>
          <q-item-section>Sign out</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useNotificationsStore } from '@/stores/notifications';

const router = useRouter();
const auth = useAuthStore();
const tasks = useTasksStore();
const notifications = useNotificationsStore();

const leftDrawerOpen = ref(false);
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// Hydrate the profile once for the whole authenticated area (e.g. after reload).
onMounted(() => {
  if (auth.isSignedIn && !auth.profile) {
    void auth.loadProfile();
  }
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
  notifications.reset();
  await router.replace('/login');
}

function formatNotificationDate(iso: string) {
  return new Date(iso).toLocaleString();
}
</script>
