<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card flat bordered class="auth-card q-pa-lg">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="checklist" size="48px" color="primary" />
            <div class="text-h5 q-mt-sm">Sign in</div>
            <div class="text-caption text-grey-7">Task microservice platform</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit.prevent="onSubmit" class="q-gutter-md">
              <q-input
                v-if="twoFactorRequired"
                v-model="twoFactorCode"
                label="Two-factor code"
                outlined
                autofocus
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                :rules="[
                  (v) => !!v || 'Code is required',
                  (v) => /^\d{6}$/.test(v) || 'Enter the 6-digit code',
                ]"
              >
                <template #prepend><q-icon name="password" /></template>
              </q-input>

              <q-input
                v-if="!twoFactorRequired"
                v-model="username"
                label="Username"
                outlined
                autofocus
                autocomplete="username"
                :rules="[(v) => !!v || 'Username is required']"
              >
                <template #prepend><q-icon name="person" /></template>
              </q-input>

              <q-input
                v-if="!twoFactorRequired"
                v-model="password"
                label="Password"
                outlined
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :rules="[(v) => !!v || 'Password is required']"
              >
                <template #prepend><q-icon name="lock" /></template>
                <template #append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <q-btn
                type="submit"
                :label="twoFactorRequired ? 'Verify code' : 'Sign in'"
                color="primary"
                class="full-width"
                size="md"
                :loading="loading"
                no-caps
              />

              <q-btn
                v-if="twoFactorRequired"
                flat
                label="Use another account"
                class="full-width"
                no-caps
                @click="resetTwoFactor"
              />
            </q-form>
          </q-card-section>

          <q-card-section class="text-center q-pt-none text-grey-7">
            <template v-if="!twoFactorRequired">
              No account?
              <router-link to="/register" class="text-primary">Create one</router-link>
              <span class="q-mx-xs">·</span>
              <router-link to="/forgot-password" class="text-primary">Forgot password?</router-link>
            </template>
            <template v-else>Open your authenticator app to continue.</template>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/services/api';

const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const username = ref('');
const password = ref('');
const twoFactorCode = ref('');
const twoFactorRequired = ref(false);
const showPassword = ref(false);
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    const result = twoFactorRequired.value
      ? await auth.completeTwoFactor(twoFactorCode.value)
      : await auth.login(username.value, password.value);
    if (result.twoFactorRequired) {
      twoFactorRequired.value = true;
      twoFactorCode.value = '';
      return;
    }
    const next = (route.query.next as string) || '/';
    await router.replace(next);
  } catch (err) {
    const message =
      err instanceof ApiError && err.status === 401
        ? 'Invalid username or password'
        : err instanceof Error
          ? err.message
          : 'Login failed';
    $q.notify({ type: 'negative', message });
  } finally {
    loading.value = false;
  }
}

function resetTwoFactor() {
  auth.logout();
  twoFactorRequired.value = false;
  twoFactorCode.value = '';
  password.value = '';
}
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
}
</style>
