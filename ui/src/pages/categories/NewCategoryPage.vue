<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
const route = useRoute()
const saving = shallowRef(false)
const error = shallowRef('')
const form = reactive({
  name: '',
  key: '',
  description: '',
  color: '#00a9ad',
})

const cancelTarget = computed(() => {
  const target = Array.isArray(route.query.returnTo) ? route.query.returnTo[0] : route.query.returnTo
  return target?.startsWith('/') ? target : '/categories'
})

async function submit() {
  if (!form.name.trim()) return
  saving.value = true
  error.value = ''
  try {
    const category = await app.createCategory({
      name: form.name.trim(),
      key: form.key.trim(),
      description: form.description.trim(),
      color: form.color,
    })
    router.push(`/categories/${category.id}/overview`)
  } catch (exc) {
    error.value = exc instanceof Error ? exc.message : 'Could not create category.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page narrow-page">
    <header class="page-header">
      <div>
        <h1>Create category</h1>
        <p>Create a focused space for related work.</p>
      </div>
    </header>

    <form
      class="panel form-stack"
      @submit.prevent="submit"
    >
      <label>
        Category name
        <input
          v-model="form.name"
          required
          placeholder="Example: Web Experience"
        >
      </label>

      <label>
        Key
        <input
          v-model="form.key"
          required
          maxlength="8"
          placeholder="WEB"
        >
        <small>Used in task identifiers such as WEB-42.</small>
      </label>

      <label>
        Description
        <textarea
          v-model="form.description"
          rows="4"
          placeholder="What is this category responsible for?"
        />
      </label>

      <label>
        Category color
        <input
          v-model="form.color"
          type="color"
        >
      </label>

      <p
        v-if="error"
        class="form-error"
      >
        {{ error }}
      </p>

      <div class="modal-actions">
        <RouterLink
          class="btn"
          :to="cancelTarget"
        >
          Cancel
        </RouterLink>
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="saving"
        >
          {{ saving ? 'Creating...' : 'Create category' }}
        </button>
      </div>
    </form>
  </div>
</template>
