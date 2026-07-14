<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { AuthSessionDto } from '@/services/api'

const auth = useAuthStore()
const router = useRouter()
const status = reactive({
  error: '',
  loggingOutAll: false,
  revokingId: null as number | null,
})

const activeSessions = computed(() => auth.sessions.filter(session => session.active && !session.revoked_at))
const logoutAllLabel = computed(() => status.loggingOutAll ? 'Logging out...' : 'Log out all sessions')

onMounted(async () => {
  status.error = ''
  try {
    await auth.loadSessions()
  } catch (exc) {
    status.error = exc instanceof Error ? exc.message : 'Could not load sessions.'
  }
})

function deviceName(session: AuthSessionDto) {
  const agent = session.user_agent || 'Unknown device'
  const browser = agent.includes('Firefox')
    ? 'Firefox'
    : agent.includes('Edg')
      ? 'Edge'
      : agent.includes('Chrome')
        ? 'Chrome'
        : agent.includes('Safari')
          ? 'Safari'
          : 'Browser'
  const os = agent.includes('Windows')
    ? 'Windows'
    : agent.includes('Mac')
      ? 'macOS'
      : agent.includes('Linux')
        ? 'Linux'
        : agent.includes('Android')
          ? 'Android'
          : agent.includes('iPhone') || agent.includes('iPad')
            ? 'iOS'
            : 'unknown OS'

  return `${browser} on ${os}`
}

function sessionMeta(session: AuthSessionDto) {
  const state = session.active && !session.revoked_at ? 'Active' : 'Revoked'
  return `${session.ip_address || 'Unknown IP'} · ${state}`
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function revoke(session: AuthSessionDto) {
  status.error = ''
  status.revokingId = session.id
  try {
    await auth.revokeSession(session.id)
  } catch (exc) {
    status.error = exc instanceof Error ? exc.message : 'Could not revoke this session.'
  } finally {
    status.revokingId = null
  }
}

async function logoutAll() {
  status.error = ''
  status.loggingOutAll = true
  try {
    await auth.logoutAllSessions()
    await router.push('/login')
  } catch (exc) {
    status.error = exc instanceof Error ? exc.message : 'Could not log out all sessions.'
  } finally {
    status.loggingOutAll = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Sessions</h1>
        <p>Review devices currently signed into your account.</p>
      </div>
      <button class="btn btn-danger" :disabled="status.loggingOutAll || auth.sessionsLoading" @click="logoutAll">
        {{ logoutAllLabel }}
      </button>
    </header>

    <div class="settings-layout">
      <nav>
        <RouterLink to="/profile">Profile</RouterLink>
        <RouterLink to="/security">Security</RouterLink>
        <RouterLink to="/sessions">Sessions</RouterLink>
      </nav>

      <section class="panel session-list">
        <div v-if="auth.sessionsLoading" class="empty-state">
          <p>Loading sessions...</p>
        </div>
        <div v-else-if="!auth.sessions.length" class="empty-state">
          <h2>No active sessions</h2>
          <p>There are no sessions to review.</p>
        </div>
        <template v-else>
          <article v-for="session in auth.sessions" :key="session.id">
            <div>
              <strong>{{ deviceName(session) }}</strong>
              <p>{{ sessionMeta(session) }}</p>
              <small>Created {{ formatSessionDate(session.created_at) }}</small>
            </div>
            <button
              v-if="session.active && !session.revoked_at"
              class="btn"
              :disabled="status.revokingId === session.id"
              @click="revoke(session)"
            >
              {{ status.revokingId === session.id ? 'Revoking...' : 'Revoke' }}
            </button>
            <span v-else class="status-badge">Revoked</span>
          </article>
        </template>
        <p v-if="status.error" class="form-error session-error">{{ status.error }}</p>
        <p v-if="activeSessions.length" class="session-summary">{{ activeSessions.length }} active session{{ activeSessions.length === 1 ? '' : 's' }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.form-error {
  color: var(--danger);
  font-weight: 600;
  margin: 0;
}

.session-error,
.session-summary {
  padding: 0 16px 16px;
}

.session-summary {
  margin: 0;
  font-size: 12px;
}
</style>
