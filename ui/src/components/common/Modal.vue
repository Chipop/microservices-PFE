<script setup lang="ts">
defineProps<{
  title: string
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-backdrop"
      @mousedown.self="emit('close')"
    >
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header>
          <h2>{{ title }}</h2>
          <button
            class="icon-btn"
            type="button"
            aria-label="Close"
            @click="emit('close')"
          >
            x
          </button>
        </header>

        <div class="modal-body">
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>
