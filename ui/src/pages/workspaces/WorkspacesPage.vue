<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { Plus } from 'lucide-vue-next'
import Modal from '@/components/common/Modal.vue'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const createOpen = shallowRef(false)
const saving = shallowRef(false)
const error = shallowRef('')
const form = reactive({
  name: '',
  description: '',
  visibility: 'PRIVATE' as const,
})

function openCreateModal() {
  error.value = ''
  form.name = ''
  form.description = ''
  form.visibility = 'PRIVATE'
  createOpen.value = true
}

async function submitWorkspace() {
  if (!form.name.trim()) return
  saving.value = true
  error.value = ''
  try {
    await app.createWorkspace({
      name: form.name.trim(),
      description: form.description.trim(),
      visibility: form.visibility,
    })
    createOpen.value = false
  } catch (exc) {
    error.value = exc instanceof Error ? exc.message : 'Could not create workspace.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Workspaces</h1>
        <p>Switch between organizations and personal workspaces.</p>
      </div>
      <button
        class="btn btn-primary"
        type="button"
        @click="openCreateModal"
      >
        <Plus :size="16" />
        Create workspace
      </button>
    </header>

    <section class="workspace-cards">
      <article
        v-for="workspace in app.workspaces"
        :key="workspace.id"
        class="panel"
      >
        <span class="workspace-avatar">{{ workspace.key }}</span>
        <div>
          <h2>{{ workspace.name }}</h2>
          <p>{{ workspace.description }}</p>
          <small>{{ workspace.memberCount }} members · {{ workspace.role }}</small>
        </div>
        <button
          class="btn"
          type="button"
          :disabled="app.currentWorkspaceId === workspace.id"
          @click="app.switchWorkspace(workspace.id)"
        >
          {{ app.currentWorkspaceId === workspace.id ? 'Current' : 'Open' }}
        </button>
      </article>
    </section>

    <Modal
      title="Create workspace"
      :open="createOpen"
      @close="createOpen = false"
    >
      <form
        class="form-stack"
        @submit.prevent="submitWorkspace"
      >
        <label>
          Workspace name
          <input
            v-model="form.name"
            required
            maxlength="120"
            placeholder="Example: Product team"
          >
        </label>

        <label>
          Description
          <textarea
            v-model="form.description"
            rows="4"
            maxlength="500"
            placeholder="What work belongs in this workspace?"
          />
        </label>

        <label>
          Visibility
          <select v-model="form.visibility">
            <option value="PRIVATE">Private</option>
            <option value="PUBLIC">Public</option>
          </select>
        </label>

        <p
          v-if="error"
          class="form-error"
        >
          {{ error }}
        </p>

        <div class="modal-actions">
          <button
            class="btn"
            type="button"
            @click="createOpen = false"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="saving"
          >
            {{ saving ? 'Creating...' : 'Create workspace' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
