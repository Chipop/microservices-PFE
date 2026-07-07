<template>
  <q-page class="q-pa-md">
    <div class="page-wrap">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5">Profile</div>
        <q-btn
          flat
          round
          icon="refresh"
          color="primary"
          :loading="auth.loading"
          aria-label="Refresh"
          @click="refresh"
        >
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
      </div>

      <q-card flat bordered>
        <q-inner-loading :showing="auth.loading && !auth.profile" />

        <template v-if="auth.profile">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar color="primary" text-color="white" size="64px">
              {{ initial }}
            </q-avatar>
            <div>
              <div class="text-h6">{{ auth.profile.username }}</div>
              <div class="text-caption text-grey-7">{{ auth.profile.email }}</div>
            </div>
          </q-card-section>

          <q-separator />

          <q-list>
            <q-item>
              <q-item-section avatar><q-icon name="badge" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Profile ID (users service)</q-item-label>
                <q-item-label>{{ auth.profile.id }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar><q-icon name="key" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Auth user ID (from JWT)</q-item-label>
                <q-item-label>{{ auth.profile.auth_user_id }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar><q-icon name="event" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Member since</q-item-label>
                <q-item-label>{{ formatDate(auth.profile.created_at) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-card-section class="text-caption text-grey-6">
            This profile was auto-created by the Auth service (réception) and is read here,
            JWT-scoped, from the Users service on port 8001.
          </q-card-section>
        </template>

        <q-card-section
          v-else-if="!auth.loading"
          class="column flex-center text-grey-6 q-pa-xl"
        >
          <q-icon name="person_off" size="48px" />
          <div class="q-mt-sm">No profile found.</div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth';

const $q = useQuasar();
const auth = useAuthStore();

const initial = computed(() => auth.profile?.username?.charAt(0).toUpperCase() ?? '?');

onMounted(() => {
  if (!auth.profile) void refresh();
});

async function refresh() {
  try {
    await auth.loadProfile();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load profile';
    $q.notify({ type: 'negative', message });
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}
</script>

<style scoped>
.page-wrap {
  max-width: 720px;
  margin: 0 auto;
}
</style>
