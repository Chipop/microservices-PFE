<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card flat bordered class="auth-card q-pa-lg">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="person_add" size="48px" color="primary" />
            <div class="text-h5 q-mt-sm">Create account</div>
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
                v-model="email"
                label="Email"
                type="email"
                outlined
                autocomplete="email"
                :rules="[
                  (v) => !!v || 'Email is required',
                  (v) => /.+@.+\..+/.test(v) || 'Enter a valid email',
                ]"
              >
                <template #prepend><q-icon name="mail" /></template>
              </q-input>

              <q-input
                v-model="password"
                label="Password"
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
                label="Create account"
                color="primary"
                class="full-width"
                size="md"
                :loading="loading"
                no-caps
              />
            </q-form>
          </q-card-section>

          <q-card-section class="text-center q-pt-none text-grey-7">
            Already registered?
            <router-link to="/login" class="text-primary">Sign in</router-link>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth';

const $q = useQuasar();
const router = useRouter();
const auth = useAuthStore();

const username = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    await auth.register(username.value, email.value, password.value);
    $q.notify({ type: 'positive', message: `Welcome, ${username.value}!` });
    await router.replace('/');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
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
