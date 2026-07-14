<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logo from '@/assets/flowforge-logo.png'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const username = ref('')
const password = ref('')

async function login() {
  await auth.login(username.value, password.value)
  router.push(String(route.query.redirect ?? '/home'))
}
</script>

<template><main class="auth-page"><section class="auth-panel"><img :src="logo" alt="FlowForge"/><h1>Log in to FlowForge</h1><p>Continue to your workspace and pick up where you left off.</p><form @submit.prevent="login"><label>Username<input v-model="username" autocomplete="username" required/></label><label>Password<input v-model="password" type="password" autocomplete="current-password" required/></label><p v-if="auth.error" class="form-error">{{auth.error}}</p><button class="btn btn-primary btn-full" :disabled="auth.loading">{{auth.loading?'Signing in...':'Log in'}}</button></form><div class="auth-links"><RouterLink to="/forgot-password">Forgot password?</RouterLink><RouterLink to="/register">Create account</RouterLink></div></section><aside class="auth-aside"><div><span class="eyebrow">Work in one place</span><h2>Projects, tasks and collaboration without the ornamental nonsense.</h2><p>Plan work, track delivery and keep teams aligned through one compact workspace.</p></div></aside></main></template>
