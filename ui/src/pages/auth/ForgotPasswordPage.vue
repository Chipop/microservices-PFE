<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logo from '@/assets/flowforge-logo.png'
import { authApi } from '@/services/api'

const route = useRoute()
const router = useRouter()
const form = reactive({
  email: '',
  token: String(route.query.token ?? ''),
  newPassword: '',
})
const loading = shallowRef(false)
const resetting = shallowRef(false)
const error = shallowRef('')
const notice = shallowRef('')
const resetTokenReturned = shallowRef('')
const canReset = computed(() => Boolean(form.token.trim() && form.newPassword))

async function requestReset() {
  error.value = ''
  notice.value = ''
  resetTokenReturned.value = ''
  loading.value = true
  try {
    const response = await authApi.forgotPassword(form.email.trim())
    notice.value = response.detail
    resetTokenReturned.value = response.token ?? ''
    if (response.token) form.token = response.token
  } catch (exc) {
    error.value = exc instanceof Error ? exc.message : 'Could not request a password reset.'
  } finally {
    loading.value = false
  }
}

async function resetPassword() {
  error.value = ''
  notice.value = ''
  resetting.value = true
  try {
    await authApi.resetPassword(form.token.trim(), form.newPassword)
    await router.push('/login')
  } catch (exc) {
    error.value = exc instanceof Error ? exc.message : 'Could not reset password.'
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <main class="simple-auth">
    <section class="auth-panel">
      <img
        :src="logo"
        alt="FlowForge"
      >
      <h1>Reset your password</h1>
      <p>Enter your account email and use the reset token to choose a new password.</p>

      <form @submit.prevent="requestReset">
        <label>
          Email
          <input
            v-model="form.email"
            autocomplete="email"
            required
            type="email"
            placeholder="you@example.com"
          >
        </label>
        <button
          class="btn btn-primary btn-full"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Sending reset token...' : 'Send reset token' }}
        </button>
      </form>

      <form @submit.prevent="resetPassword">
        <label>
          Reset token
          <input
            v-model="form.token"
            required
            autocomplete="one-time-code"
            placeholder="Paste reset token"
          >
        </label>
        <label>
          New password
          <input
            v-model="form.newPassword"
            required
            type="password"
            autocomplete="new-password"
            placeholder="New password"
          >
        </label>
        <p
          v-if="resetTokenReturned"
          class="form-success"
        >
          Debug reset token loaded.
        </p>
        <p
          v-if="notice"
          class="form-success"
        >
          {{ notice }}
        </p>
        <p
          v-if="error"
          class="form-error"
        >
          {{ error }}
        </p>
        <button
          class="btn btn-primary btn-full"
          type="submit"
          :disabled="resetting || !canReset"
        >
          {{ resetting ? 'Resetting password...' : 'Reset password' }}
        </button>
      </form>

      <p class="centered">
        <RouterLink to="/login">Back to login</RouterLink>
      </p>
    </section>
  </main>
</template>
