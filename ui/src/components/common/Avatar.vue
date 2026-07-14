<script setup lang="ts">defineProps<{ initials:string; size?:'sm'|'md'|'lg'; src?:string }>()</script>
<template><span class="avatar" :class="`avatar-${size ?? 'md'}`"><img v-if="src" :src="src" alt=""/><span v-else>{{ initials }}</span></span></template>

<style scoped>
.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
</style>
