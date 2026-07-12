<script setup lang="ts">
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import logo from '@/assets/flowforge-logo.png'
import { useProvisioningStatus } from '@/composables/useProvisioningStatus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const provisioning = useProvisioningStatus()
const profileName = computed(() => auth.profile?.username ?? auth.currentUser.username)
const isFailed = computed(() => provisioning.state.value === 'failed')
const isReady = computed(() => provisioning.state.value === 'ready')

onMounted(() => {
  void run()
})

async function run() {
  const workspace = await provisioning.waitUntilReady()
  if (workspace) {
    await router.replace('/home')
  }
}

async function retry() {
  await provisioning.retry()
  if (isReady.value) {
    await router.replace('/home')
  }
}
</script>

<template>
  <main class="provisioning-page">
    <section class="provisioning-panel">
      <img :src="logo" alt="FlowForge" class="provisioning-logo" />
      <div class="provisioning-status" :class="{ failed: isFailed, ready: isReady }">
        <RefreshCw v-if="isFailed" :size="28" />
        <CheckCircle2 v-else-if="isReady" :size="28" />
        <Loader2 v-else :size="28" class="spin" />
      </div>
      <p class="eyebrow">Account created</p>
      <h1>Preparing your workspace</h1>
      <p class="provisioning-copy">
        {{ profileName }}, we are setting up your profile and private workspace.
      </p>
      <div class="provisioning-progress" aria-hidden="true">
        <span />
      </div>
      <p v-if="!isFailed" class="provisioning-detail">
        {{ provisioning.detail.value }}
      </p>
      <div v-else class="provisioning-error">
        <p>{{ provisioning.error.value }}</p>
        <button class="btn btn-primary" @click="retry">
          <RefreshCw :size="16" />
          Try again
        </button>
      </div>
    </section>
  </main>
</template>
