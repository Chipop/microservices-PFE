<script setup lang="ts">
import { onMounted } from 'vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { useNotificationsStore } from '@/stores/notifications';
import { formatDateTime } from '@/utils/format';

const notifications = useNotificationsStore();

onMounted(() => {
  void notifications.hydrate();
  notifications.connect();
});
</script>

<template>
  <q-page class="ff-page notifications-page">
    <header class="page-head">
      <div>
        <h1>Notifications</h1>
        <p>Review backend-generated task, workspace, attachment, and mention events.</p>
      </div>
      <q-btn
        color="primary"
        icon="done_all"
        label="Mark all read"
        no-caps
        :disable="!notifications.unreadCount"
        @click="notifications.markAllRead"
      />
    </header>

    <section class="ff-card notification-panel">
      <div class="live-strip" :class="{ connected: notifications.connected }">
        <span />
        {{ notifications.connected ? 'WebSocket connected' : 'WebSocket reconnecting' }}
      </div>
      <q-list v-if="notifications.items.length" separator>
        <q-item
          v-for="notification in notifications.items"
          :key="notification.id"
          class="notification-row"
          :class="{ unread: !notification.isRead }"
        >
          <q-item-section avatar>
            <q-icon :name="notification.isRead ? 'notifications_none' : 'notifications_active'" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="notification-title">{{ notification.title }}</q-item-label>
            <q-item-label>{{ notification.message }}</q-item-label>
            <q-item-label caption>
              {{ notification.type }} · {{ formatDateTime(notification.createdAt) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn
                v-if="!notification.isRead"
                flat
                dense
                round
                icon="done"
                aria-label="Mark read"
                @click="notifications.markRead(notification)"
              />
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                aria-label="Delete"
                @click="notifications.remove(notification)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
      <EmptyState v-else icon="notifications_none" title="No notifications" message="Notifications appear here after task and workspace events target your user id." />
    </section>
  </q-page>
</template>

<style scoped>
.notifications-page {
  display: grid;
  gap: 18px;
}

.page-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}

.page-head h1 {
  margin: 0 0 6px;
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 880;
}

.page-head p {
  margin: 0;
  color: var(--ff-muted);
}

.notification-panel {
  overflow: hidden;
}

.live-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ff-line);
  color: var(--ff-muted);
  font-weight: 780;
}

.live-strip span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ff-amber);
}

.live-strip.connected span {
  background: var(--ff-green);
}

.notification-row.unread {
  background: rgba(8, 174, 183, 0.08);
}

.notification-title {
  font-weight: 820;
}

@media (max-width: 650px) {
  .page-head {
    display: grid;
  }
}
</style>
