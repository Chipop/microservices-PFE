<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card flat bordered class="auth-card q-pa-lg">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="checklist" size="48px" color="primary" />
            <div class="text-h5 q-mt-sm">Sign in</div>
            <div class="text-caption text-grey-7">Todos microservice platform</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit.prevent="onSubmit" class="q-gutter-md">
              <q-input
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
                label="Sign in"
                color="primary"
                class="full-width"
                size="md"
                :loading="loading"
                no-caps
              />
            </q-form>
          </q-card-section>

          <q-card-section class="text-center q-pt-none text-grey-7">
            No account?
            <router-link to="/register" class="text-primary">Create one</router-link>
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
const showPassword = ref(false);
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
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
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
}
</style>
