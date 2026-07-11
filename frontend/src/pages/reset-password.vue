<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card flat bordered class="auth-card q-pa-lg">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="vpn_key" size="48px" color="primary" />
            <div class="text-h5 q-mt-sm">Set new password</div>
            <div class="text-caption text-grey-7">Use the token from your reset email</div>
          </q-card-section>

          <q-card-section>
            <q-form class="q-gutter-md" @submit.prevent="onSubmit">
              <q-input
                v-model="token"
                label="Reset token"
                outlined
                autofocus
                :rules="[(v) => !!v.trim() || 'Token is required']"
              >
                <template #prepend><q-icon name="key" /></template>
              </q-input>

              <q-input
                v-model="password"
                label="New password"
                outlined
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :rules="[
                  (v) => !!v || 'Password is required',
                  (v) => v.length >= 8 || 'Use at least 8 characters',
                ]"
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
                color="primary"
                label="Update password"
                class="full-width"
                no-caps
                :loading="loading"
              />
            </q-form>
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
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { authApi } from '@/services/api';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();

const token = ref(String(route.query.token ?? ''));
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    await authApi.resetPassword(token.value.trim(), password.value);
    $q.notify({ type: 'positive', message: 'Password updated' });
    await router.replace('/login');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reset password';
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
