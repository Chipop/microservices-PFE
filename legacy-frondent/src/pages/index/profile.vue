<template>
  <q-page class="q-pa-md">
    <div class="page-wrap">
      <div class="row items-center justify-between q-mb-md">
        <div>
          <div class="text-h5">Profile</div>
          <div class="text-caption text-grey-7">Account metadata from the user service</div>
        </div>
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
          <q-card-section class="row items-center q-col-gutter-md">
            <div class="col-auto">
              <q-avatar color="primary" text-color="white" size="84px">
                <q-img
                  v-if="auth.profile.profile_picture_url"
                  :src="auth.profile.profile_picture_url"
                  ratio="1"
                />
                <template v-else>{{ initial }}</template>
              </q-avatar>
            </div>
            <div class="col">
              <div class="text-h6">{{ auth.profile.username }}</div>
              <div class="text-caption text-grey-7">{{ auth.profile.email }}</div>
              <div class="row q-gutter-sm q-mt-sm">
                <q-btn
                  color="primary"
                  icon="upload"
                  label="Picture"
                  no-caps
                  :loading="pictureLoading"
                  @click="pictureInput?.pickFiles()"
                />
                <q-btn
                  v-if="auth.profile.profile_picture_url"
                  flat
                  color="negative"
                  icon="delete"
                  label="Remove"
                  no-caps
                  :loading="pictureLoading"
                  @click="removePicture"
                />
                <q-file
                  ref="pictureInput"
                  v-model="pictureFile"
                  class="hidden"
                  :accept="PROFILE_PICTURE_ACCEPT"
                  @update:model-value="uploadPicture"
                />
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-form class="q-gutter-md" @submit.prevent="saveProfile">
              <q-input
                v-model="form.username"
                label="Username"
                outlined
                :rules="[(v) => !!v.trim() || 'Username is required']"
              >
                <template #prepend><q-icon name="person" /></template>
              </q-input>

              <q-input
                v-model="form.biography"
                label="Biography"
                type="textarea"
                outlined
                autogrow
                maxlength="500"
                counter
              >
                <template #prepend><q-icon name="article" /></template>
              </q-input>

              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-select
                    v-model="form.language"
                    label="Language"
                    outlined
                    emit-value
                    map-options
                    :options="LANGUAGE_OPTIONS"
                  >
                    <template #prepend><q-icon name="translate" /></template>
                  </q-select>
                </div>
                <div class="col-12 col-sm-6">
                  <q-select
                    v-model="form.timezone"
                    label="Timezone"
                    outlined
                    use-input
                    input-debounce="0"
                    emit-value
                    map-options
                    :options="filteredTimezones"
                    @filter="filterTimezones"
                  >
                    <template #prepend><q-icon name="schedule" /></template>
                  </q-select>
                </div>
              </div>

              <div class="row justify-between items-center q-gutter-sm">
                <q-btn
                  flat
                  color="primary"
                  icon="public"
                  label="Public view"
                  no-caps
                  :to="`/public/${auth.profile.username}`"
                />
                <q-btn
                  type="submit"
                  color="primary"
                  icon="save"
                  label="Save changes"
                  no-caps
                  :loading="saving"
                />
              </div>
            </q-form>
          </q-card-section>

          <q-separator />

          <q-list>
            <q-item>
              <q-item-section avatar><q-icon name="badge" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Profile ID</q-item-label>
                <q-item-label>{{ auth.profile.id }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="key" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Auth user ID</q-item-label>
                <q-item-label>{{ auth.profile.auth_user_id }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="event" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Joined</q-item-label>
                <q-item-label>{{ formatDate(auth.profile.created_at) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </template>

        <q-card-section v-else-if="!auth.loading" class="column flex-center text-grey-6 q-pa-xl">
          <q-icon name="person_off" size="48px" />
          <div class="q-mt-sm">No profile found.</div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useQuasar, type QFile } from 'quasar';
import { useAuthStore } from '@/stores/auth';
import {
  LANGUAGE_OPTIONS,
  PROFILE_PICTURE_ACCEPT,
  TIMEZONE_OPTIONS,
} from '@/config/profile';

const $q = useQuasar();
const auth = useAuthStore();

const saving = ref(false);
const pictureLoading = ref(false);
const pictureInput = ref<QFile | null>(null);
const pictureFile = ref<File | null>(null);
const filteredTimezones = ref(TIMEZONE_OPTIONS);
const form = reactive({
  username: '',
  biography: '',
  timezone: 'UTC',
  language: 'en',
});

const initial = computed(() => auth.profile?.username?.charAt(0).toUpperCase() ?? '?');

watch(
  () => auth.profile,
  (profile) => {
    if (!profile) return;
    form.username = profile.username;
    form.biography = profile.biography ?? '';
    form.timezone = profile.timezone || 'UTC';
    form.language = profile.language || 'en';
  },
  { immediate: true },
);

onMounted(() => {
  if (!auth.profile) void refresh();
});

async function refresh() {
  try {
    await auth.loadProfile();
  } catch (err) {
    notifyError(err, 'Could not load profile');
  }
}

async function saveProfile() {
  saving.value = true;
  try {
    await auth.updateProfile({
      username: form.username.trim(),
      biography: form.biography,
      timezone: form.timezone,
      language: form.language,
    });
    $q.notify({ type: 'positive', message: 'Profile updated' });
  } catch (err) {
    notifyError(err, 'Could not update profile');
  } finally {
    saving.value = false;
  }
}

async function uploadPicture(file: File | null) {
  if (!file) return;
  pictureLoading.value = true;
  try {
    await auth.uploadProfilePicture(file);
    $q.notify({ type: 'positive', message: 'Profile picture updated' });
  } catch (err) {
    notifyError(err, 'Could not upload profile picture');
  } finally {
    pictureFile.value = null;
    pictureLoading.value = false;
  }
}

async function removePicture() {
  pictureLoading.value = true;
  try {
    await auth.deleteProfilePicture();
    $q.notify({ type: 'positive', message: 'Profile picture removed' });
  } catch (err) {
    notifyError(err, 'Could not remove profile picture');
  } finally {
    pictureLoading.value = false;
  }
}

function filterTimezones(value: string, update: (callback: () => void) => void) {
  update(() => {
    const needle = value.toLowerCase();
    filteredTimezones.value = TIMEZONE_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(needle),
    );
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function notifyError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  $q.notify({ type: 'negative', message });
}
</script>

<style scoped>
.page-wrap {
  max-width: 760px;
  margin: 0 auto;
}
</style>
