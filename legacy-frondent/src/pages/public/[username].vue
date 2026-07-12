<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="bg-grey-2 q-pa-md">
        <div class="page-wrap">
          <q-card flat bordered>
            <q-inner-loading :showing="loading" />

            <template v-if="profile">
              <q-card-section class="row items-center q-col-gutter-md">
                <div class="col-auto">
                  <q-avatar color="primary" text-color="white" size="84px">
                    <q-img
                      v-if="profile.profile_picture_url"
                      :src="profile.profile_picture_url"
                      ratio="1"
                    />
                    <template v-else>{{ initial }}</template>
                  </q-avatar>
                </div>
                <div class="col">
                  <div class="text-h5">{{ profile.username }}</div>
                  <div class="text-caption text-grey-7">Joined {{ formatDate(profile.joined_date) }}</div>
                </div>
              </q-card-section>

              <q-separator />

              <q-card-section>
                <div class="text-body1">{{ profile.biography || 'No biography yet.' }}</div>
              </q-card-section>

              <q-list>
                <q-item>
                  <q-item-section avatar><q-icon name="translate" color="grey-7" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Language</q-item-label>
                    <q-item-label>{{ profile.language || 'Not set' }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar><q-icon name="schedule" color="grey-7" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Timezone</q-item-label>
                    <q-item-label>{{ profile.timezone || 'Not set' }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </template>

            <q-card-section v-else-if="!loading" class="column flex-center text-grey-6 q-pa-xl">
              <q-icon name="person_off" size="48px" />
              <div class="q-mt-sm">Public profile not found.</div>
            </q-card-section>
          </q-card>

          <div class="text-center q-mt-md">
            <router-link to="/login" class="text-primary">Sign in</router-link>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { profilesApi, type PublicProfile } from '@/services/api';

const $q = useQuasar();
const route = useRoute();

const loading = ref(false);
const profile = ref<PublicProfile | null>(null);
const initial = computed(() => profile.value?.username?.charAt(0).toUpperCase() ?? '?');

onMounted(loadProfile);

async function loadProfile() {
  loading.value = true;
  try {
    profile.value = await profilesApi.public(publicUsername());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load public profile';
    $q.notify({ type: 'negative', message });
  } finally {
    loading.value = false;
  }
}

function publicUsername() {
  return decodeURIComponent(route.path.split('/').filter(Boolean).at(-1) ?? '');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}
</script>

<style scoped>
.page-wrap {
  max-width: 640px;
  margin: 32px auto;
}
</style>
