<script setup lang="ts">
import { formatDateTime } from '@/utils/format';
import { useNotificationsStore } from '@/stores/notifications';

const notifications = useNotificationsStore();
</script>

<template>
  <q-btn flat dense round icon="notifications" aria-label="Notifications" class="notification-button">
    <q-badge v-if="notifications.unreadCount" color="red-6" floating>
      {{ notifications.unreadCount }}
    </q-badge>
    <q-menu anchor="bottom right" self="top right" max-width="390px">
      <section class="notification-menu">
        <header class="notification-head">
          <div>
            <strong>Notifications</strong>
            <span>{{ notifications.connected ? 'Live updates on' : 'Live updates off' }}</span>
          </div>
          <q-btn
            v-if="notifications.unreadCount"
            dense
            flat
            no-caps
            color="primary"
            label="Mark all read"
            @click="notifications.markAllRead"
          />
        </header>
        <q-separator />
        <q-list v-if="notifications.items.length" class="notification-list">
          <q-item
            v-for="notification in notifications.items"
            :key="notification.id"
            clickable
            class="notification-item"
            :class="{ unread: !notification.isRead }"
            @click="notifications.markRead(notification)"
          >
            <q-item-section>
              <q-item-label class="notification-title">{{ notification.title }}</q-item-label>
              <q-item-label caption lines="2">{{ notification.message }}</q-item-label>
              <q-item-label caption>{{ formatDateTime(notification.createdAt) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="grey-7"
                aria-label="Delete notification"
                @click.stop="notifications.remove(notification)"
              />
            </q-item-section>
          </q-item>
        </q-list>
        <div v-else class="notification-empty">No notifications yet.</div>
      </section>
    </q-menu>
    <q-tooltip>Notifications</q-tooltip>
  </q-btn>
</template>

<style scoped>
.notification-menu {
  width: min(390px, calc(100vw - 24px));
}

.notification-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
}

.notification-head strong,
.notification-head span {
  display: block;
}

.notification-head span {
  color: var(--ff-muted);
  font-size: 0.78rem;
}

.notification-list {
  max-height: 420px;
  overflow: auto;
}

.notification-item.unread {
  background: rgba(8, 174, 183, 0.08);
}

.notification-title {
  font-weight: 760;
}

.notification-empty {
  padding: 28px 16px;
  color: var(--ff-muted);
  text-align: center;
}
</style>
