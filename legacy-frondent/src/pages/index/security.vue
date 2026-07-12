<template>
  <q-page class="q-pa-md">
    <div class="page-wrap">
      <div class="row items-center justify-between q-mb-md">
        <div>
          <div class="text-h5">Security</div>
          <div class="text-caption text-grey-7">Authentication controls from the auth service</div>
        </div>
        <q-btn
          flat
          round
          icon="refresh"
          color="primary"
          :loading="auth.sessionsLoading"
          aria-label="Refresh sessions"
          @click="loadSessions"
        >
          <q-tooltip>Refresh sessions</q-tooltip>
        </q-btn>
      </div>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 q-mb-md">Password</div>
          <q-form class="q-gutter-md" @submit.prevent="changePassword">
            <q-input
              v-model="passwordForm.oldPassword"
              label="Current password"
              outlined
              :type="showOldPassword ? 'text' : 'password'"
              autocomplete="current-password"
              :rules="[(v) => !!v || 'Current password is required']"
            >
              <template #prepend><q-icon name="lock" /></template>
              <template #append>
                <q-icon
                  :name="showOldPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showOldPassword = !showOldPassword"
                />
              </template>
            </q-input>

            <q-input
              v-model="passwordForm.newPassword"
              label="New password"
              outlined
              :type="showNewPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :rules="[
                (v) => !!v || 'New password is required',
                (v) => v.length >= 8 || 'Use at least 8 characters',
              ]"
            >
              <template #prepend><q-icon name="vpn_key" /></template>
              <template #append>
                <q-icon
                  :name="showNewPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showNewPassword = !showNewPassword"
                />
              </template>
            </q-input>

            <div class="row justify-end">
              <q-btn
                type="submit"
                color="primary"
                icon="save"
                label="Change password"
                no-caps
                :loading="passwordLoading"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 q-mb-md">Verification</div>
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-btn
                color="primary"
                outline
                icon="mark_email_read"
                label="Send email token"
                no-caps
                class="full-width"
                :loading="emailLoading"
                @click="requestEmailVerification"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-btn
                color="primary"
                outline
                icon="verified_user"
                label="Send activation token"
                no-caps
                class="full-width"
                :loading="activationLoading"
                @click="requestAccountActivation"
              />
            </div>
          </div>
          <q-banner v-if="debugToken" rounded class="bg-blue-1 text-primary q-mt-md">
            Debug token: <code>{{ debugToken }}</code>
          </q-banner>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="row items-center justify-between q-mb-md">
            <div class="text-subtitle1">Two-factor authentication</div>
            <q-chip color="grey-2" text-color="grey-8" icon="security">TOTP</q-chip>
          </div>

          <div v-if="twoFactorSetup" class="q-gutter-md">
            <q-input v-model="twoFactorSetup.secret" label="Secret" outlined readonly>
              <template #prepend><q-icon name="key" /></template>
            </q-input>
            <q-input v-model="twoFactorSetup.otpauth_url" label="Authenticator URI" outlined readonly>
              <template #prepend><q-icon name="qr_code_2" /></template>
            </q-input>
          </div>

          <q-form class="q-gutter-md q-mt-md" @submit.prevent="confirmTwoFactor">
            <q-input
              v-model="twoFactorCode"
              label="Authenticator code"
              outlined
              inputmode="numeric"
              maxlength="6"
              :rules="[(v) => !v || /^\d{6}$/.test(v) || 'Enter the 6-digit code']"
            >
              <template #prepend><q-icon name="password" /></template>
            </q-input>

            <div class="row q-gutter-sm justify-end">
              <q-btn
                color="primary"
                outline
                icon="add_moderator"
                label="Create setup"
                no-caps
                :loading="twoFactorLoading"
                @click="setupTwoFactor"
              />
              <q-btn
                type="submit"
                color="primary"
                icon="check"
                label="Enable"
                no-caps
                :loading="twoFactorLoading"
              />
              <q-btn
                flat
                color="negative"
                icon="remove_moderator"
                label="Disable"
                no-caps
                :loading="twoFactorLoading"
                @click="disableTwoFactor"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-card-section>
          <div class="row items-center justify-between">
            <div class="text-subtitle1">Active sessions</div>
            <q-btn
              flat
              color="negative"
              icon="logout"
              label="Logout everywhere"
              no-caps
              @click="logoutEverywhere"
            />
          </div>
        </q-card-section>
        <q-separator />
        <q-list separator>
          <q-item v-for="session in auth.sessions" :key="session.id">
            <q-item-section avatar>
              <q-icon :name="session.active ? 'devices' : 'block'" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ session.user_agent || 'Unknown device' }}</q-item-label>
              <q-item-label caption>
                {{ session.ip_address || 'No IP' }} · created {{ formatDate(session.created_at) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                :disable="!session.active"
                aria-label="Revoke session"
                @click="revokeSession(session.id)"
              >
                <q-tooltip>Revoke session</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
        <q-card-section v-if="!auth.sessionsLoading && auth.sessions.length === 0" class="text-grey-6">
          No sessions found.
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import type { TwoFactorSetup } from '@/services/api';

const $q = useQuasar();
const router = useRouter();
const auth = useAuthStore();
const tasks = useTasksStore();

const passwordForm = reactive({ oldPassword: '', newPassword: '' });
const passwordLoading = ref(false);
const emailLoading = ref(false);
const activationLoading = ref(false);
const twoFactorLoading = ref(false);
const twoFactorCode = ref('');
const twoFactorSetup = ref<TwoFactorSetup | null>(null);
const debugToken = ref('');
const showOldPassword = ref(false);
const showNewPassword = ref(false);

onMounted(loadSessions);

async function changePassword() {
  passwordLoading.value = true;
  try {
    await auth.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    $q.notify({ type: 'positive', message: 'Password changed' });
  } catch (err) {
    notifyError(err, 'Could not change password');
  } finally {
    passwordLoading.value = false;
  }
}

async function requestEmailVerification() {
  emailLoading.value = true;
  try {
    const response = await auth.requestEmailVerification();
    debugToken.value = response.token ?? '';
    $q.notify({ type: 'positive', message: response.detail });
  } catch (err) {
    notifyError(err, 'Could not request email verification');
  } finally {
    emailLoading.value = false;
  }
}

async function requestAccountActivation() {
  activationLoading.value = true;
  try {
    const response = await auth.requestAccountActivation();
    debugToken.value = response.token ?? '';
    $q.notify({ type: 'positive', message: response.detail });
  } catch (err) {
    notifyError(err, 'Could not request account activation');
  } finally {
    activationLoading.value = false;
  }
}

async function setupTwoFactor() {
  twoFactorLoading.value = true;
  try {
    twoFactorSetup.value = await auth.setupTwoFactor();
  } catch (err) {
    notifyError(err, 'Could not start two-factor setup');
  } finally {
    twoFactorLoading.value = false;
  }
}

async function confirmTwoFactor() {
  if (!twoFactorCode.value) return;
  twoFactorLoading.value = true;
  try {
    await auth.confirmTwoFactor(twoFactorCode.value);
    twoFactorCode.value = '';
    twoFactorSetup.value = null;
    $q.notify({ type: 'positive', message: 'Two-factor authentication enabled' });
  } catch (err) {
    notifyError(err, 'Could not enable two-factor authentication');
  } finally {
    twoFactorLoading.value = false;
  }
}

async function disableTwoFactor() {
  if (!twoFactorCode.value) {
    $q.notify({ type: 'warning', message: 'Enter the current authenticator code first' });
    return;
  }
  twoFactorLoading.value = true;
  try {
    await auth.disableTwoFactor(twoFactorCode.value);
    twoFactorCode.value = '';
    twoFactorSetup.value = null;
    $q.notify({ type: 'positive', message: 'Two-factor authentication disabled' });
  } catch (err) {
    notifyError(err, 'Could not disable two-factor authentication');
  } finally {
    twoFactorLoading.value = false;
  }
}

async function loadSessions() {
  try {
    await auth.loadSessions();
  } catch (err) {
    notifyError(err, 'Could not load sessions');
  }
}

async function revokeSession(id: number) {
  try {
    await auth.revokeSession(id);
    $q.notify({ type: 'positive', message: 'Session revoked' });
  } catch (err) {
    notifyError(err, 'Could not revoke session');
  }
}

async function logoutEverywhere() {
  await auth.logoutEverywhere();
  tasks.reset();
  await router.replace('/login');
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
  max-width: 820px;
  margin: 0 auto;
}
</style>
