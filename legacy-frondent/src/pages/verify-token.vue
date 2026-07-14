<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card flat bordered class="auth-card q-pa-lg">
          <q-card-section class="text-center q-pb-none">
            <q-icon name="verified" size="48px" color="primary" />
            <div class="text-h5 q-mt-sm">{{ title }}</div>
            <div class="text-caption text-grey-7">Confirm the token sent by the auth service</div>
          </q-card-section>

          <q-card-section>
            <q-form class="q-gutter-md" @submit.prevent="onSubmit">
              <q-select
                v-model="kind"
                label="Token type"
                outlined
                emit-value
                map-options
                :options="kindOptions"
              >
                <template #prepend><q-icon name="fact_check" /></template>
              </q-select>

              <q-input
                v-model="token"
                label="Token"
                outlined
                autofocus
                :rules="[(v) => !!v.trim() || 'Token is required']"
              >
                <template #prepend><q-icon name="key" /></template>
              </q-input>

              <q-btn
                type="submit"
                color="primary"
                label="Confirm token"
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
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { authApi } from '@/services/api';

type VerificationKind = 'email' | 'activation';

const kindOptions = [
  { label: 'Email verification', value: 'email' },
  { label: 'Account activation', value: 'activation' },
];

const $q = useQuasar();
const route = useRoute();
const router = useRouter();

const initialKind = route.query.kind === 'activation' ? 'activation' : 'email';
const kind = ref<VerificationKind>(initialKind);
const token = ref(String(route.query.token ?? ''));
const loading = ref(false);
const title = computed(() =>
  kind.value === 'activation' ? 'Activate account' : 'Verify email',
);

async function onSubmit() {
  loading.value = true;
  try {
    if (kind.value === 'activation') {
      await authApi.confirmAccountActivation(token.value.trim());
    } else {
      await authApi.confirmEmailVerification(token.value.trim());
    }
    $q.notify({ type: 'positive', message: 'Token confirmed' });
    await router.replace('/login');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not confirm token';
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
