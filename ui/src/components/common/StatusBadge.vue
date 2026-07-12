<script setup lang="ts">defineProps<{ value:string }>()</script>
<template><span class="status-badge" :data-status="value.toLowerCase().replace(/\s+/g,'-')">{{ value }}</span></template>
