<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="row items-center no-wrap">
          <q-icon name="checklist" class="q-mr-sm" />
          Todos
        </q-toolbar-title>

        <q-chip v-if="auth.displayName" color="white" text-color="primary" icon="person">
          {{ auth.displayName }}
        </q-chip>
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
          <q-item-section>My Todos</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/profile" active-class="text-primary bg-blue-1">
          <q-item-section avatar><q-icon name="account_circle" /></q-item-section>
          <q-item-section>Profile</q-item-section>
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTodosStore } from '@/stores/todos';

const router = useRouter();
const auth = useAuthStore();
const todos = useTodosStore();

const leftDrawerOpen = ref(false);
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// Hydrate the profile once for the whole authenticated area (e.g. after reload).
onMounted(() => {
  if (auth.isSignedIn && !auth.profile) {
    void auth.loadProfile();
  }
});

async function onLogout() {
  auth.logout();
  todos.reset();
  await router.replace('/login');
}
</script>
