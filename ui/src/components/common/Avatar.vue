<script setup lang="ts">defineProps<{ initials:string; size?:'sm'|'md'|'lg' }>()</script>
<template><span class="avatar" :class="`avatar-${size ?? 'md'}`">{{ initials }}</span></template>
