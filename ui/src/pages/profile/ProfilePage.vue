<script setup lang="ts">
import { computed, reactive, useTemplateRef, watch } from 'vue'
import Avatar from '@/components/common/Avatar.vue'
import { useAuthStore } from '@/stores/auth'

const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024
const ALLOWED_PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const auth = useAuthStore()
const photoInput = useTemplateRef<HTMLInputElement>('photoInput')
const form = reactive({
  username: '',
  biography: '',
  timezone: 'Africa/Casablanca',
  language: 'English',
})
const status = reactive({
  saving: false,
  uploadingPhoto: false,
  error: '',
  success: '',
})

const user = computed(() => auth.currentUser)
const saveLabel = computed(() => status.saving ? 'Saving...' : 'Save changes')
const photoLabel = computed(() => status.uploadingPhoto ? 'Uploading...' : 'Change photo')

watch(
  () => auth.profile,
  profile => {
    form.username = profile?.username ?? auth.currentUser.username
    form.biography = profile?.biography ?? ''
    form.timezone = profile?.timezone ?? 'Africa/Casablanca'
    form.language = profile?.language ?? 'English'
  },
  { immediate: true },
)

function openPhotoPicker() {
  photoInput.value?.click()
}

async function uploadPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  status.error = ''
  status.success = ''
  if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(file.type)) {
    status.error = 'Choose a JPG, PNG, or WebP image.'
    input.value = ''
    return
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    status.error = 'Choose an image smaller than 2 MB.'
    input.value = ''
    return
  }

  status.uploadingPhoto = true
  try {
    await auth.uploadProfilePicture(file)
    status.success = 'Profile photo updated.'
  } catch (exc) {
    status.error = exc instanceof Error ? exc.message : 'Could not upload profile photo.'
  } finally {
    status.uploadingPhoto = false
    input.value = ''
  }
}

async function saveProfile() {
  status.error = ''
  status.success = ''
  if (!form.username.trim()) {
    status.error = 'Username is required.'
    return
  }

  status.saving = true
  try {
    await auth.updateProfile({
      username: form.username.trim(),
      biography: form.biography.trim(),
      timezone: form.timezone,
      language: form.language,
    })
    status.success = 'Profile changes saved.'
  } catch (exc) {
    status.error = exc instanceof Error ? exc.message : 'Could not save profile changes.'
  } finally {
    status.saving = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Profile</h1>
        <p>Manage your public information and preferences.</p>
      </div>
    </header>

    <div class="settings-layout">
      <nav>
        <RouterLink to="/profile">Profile</RouterLink>
        <RouterLink to="/security">Security</RouterLink>
        <RouterLink to="/sessions">Sessions</RouterLink>
      </nav>

      <form class="panel form-stack" @submit.prevent="saveProfile">
        <div class="profile-photo">
          <Avatar :initials="user.initials" :src="user.avatar" size="lg" />
          <div>
            <button class="btn" type="button" :disabled="status.uploadingPhoto" @click="openPhotoPicker">
              {{ photoLabel }}
            </button>
            <input
              ref="photoInput"
              class="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="uploadPhoto"
            />
            <p>PNG, JPG, or WebP. Maximum 2 MB.</p>
          </div>
        </div>

        <label>
          Username
          <input v-model="form.username" autocomplete="username" required />
        </label>
        <label>
          Email
          <input :value="user.email" autocomplete="email" disabled />
        </label>
        <label>
          Biography
          <textarea v-model="form.biography" rows="4" placeholder="What should teammates know about your work?"></textarea>
        </label>
        <div class="form-grid">
          <label>
            Timezone
            <select v-model="form.timezone">
              <option>Africa/Casablanca</option>
              <option>UTC</option>
              <option>Europe/Paris</option>
              <option>America/New_York</option>
            </select>
          </label>
          <label>
            Language
            <select v-model="form.language">
              <option>English</option>
              <option>French</option>
            </select>
          </label>
        </div>

        <p v-if="status.error" class="form-error">{{ status.error }}</p>
        <p v-if="status.success" class="form-success">{{ status.success }}</p>
        <button class="btn btn-primary align-start" :disabled="status.saving || status.uploadingPhoto">
          {{ saveLabel }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.form-error {
  color: var(--danger);
  font-weight: 600;
  margin: 0;
}

.form-success {
  color: #216e42;
  font-weight: 600;
  margin: 0;
}
</style>
