<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: string
}>()

const statusKey = computed(() => props.value.toLowerCase().replace(/\s+/g, '-'))
</script>

<template>
  <span
    class="status-badge"
    :data-status="statusKey"
  >
    {{ value }}
  </span>
</template>
