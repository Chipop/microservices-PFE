<script setup lang="ts">
import { computed, onMounted } from 'vue';
import MetricTile from '@/components/common/MetricTile.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { useTasksStore } from '@/stores/tasks';
import { useWorkspacesStore } from '@/stores/workspaces';
import { formatDate } from '@/utils/format';

const tasks = useTasksStore();
const workspaces = useWorkspacesStore();

const nextTasks = computed(() =>
  [...tasks.items]
    .filter((task) => !task.done && !task.archived_at)
    .sort((a, b) => new Date(a.due_at ?? '2999-01-01').getTime() - new Date(b.due_at ?? '2999-01-01').getTime())
    .slice(0, 6),
);

onMounted(async () => {
  await Promise.all([tasks.hydrateMetadata(), tasks.hydrate(), workspaces.hydrate()]);
});
</script>

<template>
  <q-page class="ff-page dashboard-page">
    <section class="dashboard-hero ff-facet">
      <div class="hero-copy">
        <span class="hero-kicker">FlowForge command center</span>
        <h1>Shape work across tasks, teams, search, files, and live notifications.</h1>
        <p>
          The interface now follows the backend surface: workspace permissions, task collaboration, search indexes,
          account security, and notification streams are all first-class.
        </p>
      </div>
      <div class="hero-actions">
        <q-btn color="primary" icon="add_task" label="New task" to="/tasks" no-caps />
        <q-btn outline color="dark" icon="hub" label="Workspaces" to="/workspaces" no-caps />
      </div>
    </section>

    <section class="metrics-grid">
      <MetricTile label="Open tasks" :value="tasks.openCount" icon="radio_button_unchecked" tone="teal" />
      <MetricTile label="Completed" :value="tasks.doneCount" icon="task_alt" />
      <MetricTile label="High attention" :value="tasks.urgentCount" icon="priority_high" tone="amber" />
      <MetricTile label="Overdue" :value="tasks.overdueCount" icon="event_busy" tone="coral" />
    </section>

    <section class="dashboard-grid">
      <article class="ff-card panel">
        <header class="panel-head">
          <h2 class="ff-section-title">Next in queue</h2>
          <q-btn flat dense no-caps color="primary" icon-right="arrow_forward" label="Open tasks" to="/tasks" />
        </header>
        <q-list v-if="nextTasks.length" separator>
          <q-item v-for="task in nextTasks" :key="task.id" clickable :to="`/tasks?id=${task.id}`">
            <q-item-section>
              <q-item-label class="task-title">{{ task.title }}</q-item-label>
              <q-item-label caption>
                {{ task.status?.name ?? 'No status' }} · Due {{ formatDate(task.due_at) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <span class="ff-chip" :class="`ff-priority-${task.priority}`">{{ task.priority }}</span>
            </q-item-section>
          </q-item>
        </q-list>
        <EmptyState
          v-else
          icon="task_alt"
          title="No active tasks"
          message="Create a task or switch workspace filters to start filling the queue."
        />
      </article>

      <article class="ff-card panel">
        <header class="panel-head">
          <h2 class="ff-section-title">Workspace access</h2>
          <q-btn flat dense no-caps color="primary" icon-right="arrow_forward" label="Manage" to="/workspaces" />
        </header>
        <q-list v-if="workspaces.activeWorkspaces.length" separator>
          <q-item v-for="workspace in workspaces.activeWorkspaces.slice(0, 6)" :key="workspace.id" clickable to="/workspaces">
            <q-item-section avatar>
              <q-icon :name="workspace.workspaceType === 'PERSONAL' ? 'person' : 'groups'" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="task-title">{{ workspace.name }}</q-item-label>
              <q-item-label caption>{{ workspace.currentUserRole ?? 'Viewer' }} · {{ workspace.visibility }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <EmptyState
          v-else
          icon="hub"
          title="No workspaces loaded"
          message="The workspace service will create a personal workspace after registration when available."
        />
      </article>
    </section>
  </q-page>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 22px;
}

.dashboard-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: end;
  min-height: 260px;
  padding: 34px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fbfb 62%, rgba(8, 174, 183, 0.12) 100%);
  box-shadow: var(--ff-shadow);
}

.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 850px;
}

.hero-kicker {
  color: var(--ff-teal-dark);
  font-weight: 850;
  text-transform: uppercase;
}

.hero-copy h1 {
  max-width: 900px;
  margin: 10px 0;
  font-size: clamp(2.2rem, 5vw, 4.9rem);
  font-weight: 880;
  line-height: 0.96;
}

.hero-copy p {
  max-width: 720px;
  margin: 0;
  color: var(--ff-muted);
  font-size: 1.05rem;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.75fr);
  gap: 18px;
}

.panel {
  min-height: 360px;
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
}

.task-title {
  font-weight: 760;
}

@media (max-width: 1000px) {
  .metrics-grid,
  .dashboard-grid,
  .dashboard-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .dashboard-hero {
    padding: 24px;
  }
}
</style>
