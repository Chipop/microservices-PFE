<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card flat bordered class="auth-card q-pa-lg">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="lock_reset" size="48px" color="primary" />
            <div class="text-h5 q-mt-sm">Reset password</div>
            <div class="text-caption text-grey-7">Request a password reset token</div>
          </q-card-section>

          <q-card-section>
            <q-form class="q-gutter-md" @submit.prevent="onSubmit">
              <q-input
                v-model="email"
                label="Email"
                type="email"
                outlined
                autofocus
                autocomplete="email"
                :rules="[
                  (v) => !!v || 'Email is required',
                  (v) => /.+@.+\..+/.test(v) || 'Enter a valid email',
                ]"
              >
                <template #prepend><q-icon name="mail" /></template>
              </q-input>

              <q-btn
                type="submit"
                color="primary"
                label="Send reset token"
                class="full-width"
                no-caps
                :loading="loading"
              />
            </q-form>

            <q-banner v-if="debugToken" rounded class="bg-blue-1 text-primary q-mt-md">
              Debug token: <code>{{ debugToken }}</code>
            </q-banner>
          </q-card-section>

          <q-card-section class="text-center q-pt-none text-grey-7">
            <router-link to="/login" class="text-primary">Back to sign in</router-link>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { authApi } from '@/services/api';

const $q = useQuasar();
const email = ref('');
const loading = ref(false);
const debugToken = ref('');

async function onSubmit() {
  loading.value = true;
  try {
    const response = await authApi.forgotPassword(email.value);
    debugToken.value = response.token ?? '';
    $q.notify({ type: 'positive', message: response.detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not request password reset';
    $q.notify({ type: 'negative', message });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 420px;
  border-radius: 12px;
}
</style>
