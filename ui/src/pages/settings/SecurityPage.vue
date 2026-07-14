<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const status = reactive({
  saving: false,
  error: '',
})

const updateLabel = computed(() => status.saving ? 'Updating...' : 'Update password')

async function updatePassword() {
  status.error = ''
  if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
    status.error = 'Fill in all password fields.'
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    status.error = 'New password and confirmation do not match.'
    return
  }

  status.saving = true
  try {
    await auth.changePassword(form.currentPassword, form.newPassword)
    auth.logout()
    await router.push({ path: '/login', query: { redirect: '/security' } })
  } catch (exc) {
    status.error = exc instanceof Error ? exc.message : 'Could not update password.'
  } finally {
    status.saving = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Security</h1>
        <p>Manage password and two-factor authentication.</p>
      </div>
    </header>

    <div class="settings-layout">
      <nav>
        <RouterLink to="/profile">Profile</RouterLink>
        <RouterLink to="/security">Security</RouterLink>
        <RouterLink to="/sessions">Sessions</RouterLink>
      </nav>

      <form class="panel form-stack" @submit.prevent="updatePassword">
        <h2>Change password</h2>
        <label>
          Current password
          <input v-model="form.currentPassword" type="password" autocomplete="current-password" required />
        </label>
        <label>
          New password
          <input v-model="form.newPassword" type="password" autocomplete="new-password" required />
        </label>
        <label>
          Confirm password
          <input v-model="form.confirmPassword" type="password" autocomplete="new-password" required />
        </label>
        <p v-if="status.error" class="form-error">{{ status.error }}</p>
        <button class="btn btn-primary align-start" :disabled="status.saving || auth.loading">
          {{ updateLabel }}
        </button>

        <hr />
        <div class="setting-row">
          <div>
            <h2>Two-factor authentication</h2>
            <p>Add a TOTP authenticator for stronger account security.</p>
          </div>
          <button class="btn" type="button">Set up 2FA</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-error {
  color: var(--danger);
  font-weight: 600;
  margin: 0;
}
</style>
