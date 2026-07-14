<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  icon: string;
  tone?: 'teal' | 'amber' | 'coral' | 'ink';
}>();
</script>

<template>
  <article class="metric-tile ff-card" :class="`metric-${tone ?? 'ink'}`">
    <div class="metric-icon"><q-icon :name="icon" size="22px" /></div>
    <div>
      <strong class="metric-value">{{ value }}</strong>
      <span class="metric-label">{{ label }}</span>
    </div>
  </article>
</template>

<style scoped>
.metric-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 96px;
  padding: 18px;
}

.metric-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 8px;
  background: #eef5f6;
}

.metric-value {
  display: block;
  font-size: 1.7rem;
  line-height: 1;
}

.metric-label {
  color: var(--ff-muted);
  font-weight: 650;
}

.metric-teal .metric-icon {
  background: rgba(8, 174, 183, 0.12);
  color: var(--ff-teal-dark);
}

.metric-amber .metric-icon {
  background: rgba(247, 185, 20, 0.18);
  color: var(--ff-amber-dark);
}

.metric-coral .metric-icon {
  background: rgba(230, 95, 76, 0.12);
  color: var(--ff-coral);
}
</style>
