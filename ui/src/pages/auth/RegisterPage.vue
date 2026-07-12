<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '@/assets/flowforge-logo.png'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const email = ref('')
const password = ref('')

async function submit() {
  await auth.register(username.value, email.value, password.value)
  router.push('/home')
}
</script>

<template><main class="simple-auth"><section class="auth-panel"><img :src="logo" alt="FlowForge"/><h1>Create your account</h1><form @submit.prevent="submit"><label>Username<input v-model="username" autocomplete="username" required placeholder="your-name"/></label><label>Email<input v-model="email" type="email" autocomplete="email" required placeholder="you@example.com"/></label><label>Password<input v-model="password" type="password" autocomplete="new-password" required placeholder="At least 8 characters"/></label><p v-if="auth.error" class="form-error">{{auth.error}}</p><button class="btn btn-primary btn-full" :disabled="auth.loading">{{auth.loading?'Creating account...':'Create account'}}</button></form><p class="centered">Already registered? <RouterLink to="/login">Log in</RouterLink></p></section></main></template>
