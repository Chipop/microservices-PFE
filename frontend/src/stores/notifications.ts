import { defineStore, acceptHMRUpdate } from 'pinia';
import {
  notificationWebSocketUrl,
  notificationsApi,
  type NotificationItem,
  type Page,
} from '@/services/api';

interface NotificationWebSocketMessage {
  type: 'notifications.connected' | 'notification.created';
  payload: NotificationItem | null;
}

interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  connected: boolean;
  socket: WebSocket | null;
  reconnectTimer: number | null;
}

export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({
    items: [],
    unreadCount: 0,
    loading: false,
    connected: false,
    socket: null,
    reconnectTimer: null,
  }),

  actions: {
    async hydrate() {
      this.loading = true;
      try {
        const [page, unread] = await Promise.all([
          notificationsApi.list(),
          notificationsApi.unreadCount(),
        ]);
        this.items = normalizePage(page).content;
        this.unreadCount = unread.count;
      } finally {
        this.loading = false;
      }
    },

    connect() {
      const url = notificationWebSocketUrl();
      if (!url || this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
        return;
      }

      this.clearReconnect();
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        this.connected = true;
      };
      socket.onmessage = (event) => {
        this.applySocketMessage(event.data);
      };
      socket.onclose = () => {
        if (this.socket === socket) {
          this.connected = false;
          this.socket = null;
          this.scheduleReconnect();
        }
      };
      socket.onerror = () => {
        socket.close();
      };
    },

    disconnect() {
      this.clearReconnect();
      this.connected = false;
      this.socket?.close();
      this.socket = null;
    },

    reset() {
      this.disconnect();
      this.items = [];
      this.unreadCount = 0;
      this.loading = false;
    },

    async markRead(notification: NotificationItem) {
      const updated = await notificationsApi.markRead(notification.id);
      this.items = this.items.map((item) => (item.id === updated.id ? updated : item));
      if (!notification.isRead) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    },

    async markAllRead() {
      await notificationsApi.markAllRead();
      this.items = this.items.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() }));
      this.unreadCount = 0;
    },

    async remove(notification: NotificationItem) {
      await notificationsApi.remove(notification.id);
      this.items = this.items.filter((item) => item.id !== notification.id);
      if (!notification.isRead) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    },

    applySocketMessage(raw: string) {
      let message: NotificationWebSocketMessage;
      try {
        message = JSON.parse(raw) as NotificationWebSocketMessage;
      } catch {
        return;
      }
      if (message.type !== 'notification.created' || !message.payload) {
        return;
      }
      const incoming = message.payload;
      this.items = [incoming, ...this.items.filter((item) => item.id !== incoming.id)].slice(0, 20);
      if (!incoming.isRead) {
        this.unreadCount += 1;
      }
    },

    scheduleReconnect() {
      this.clearReconnect();
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    },

    clearReconnect() {
      if (this.reconnectTimer !== null) {
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    },
  },
});

function normalizePage(page: Page<NotificationItem>) {
  return page;
}

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useNotificationsStore, import.meta.hot));
}
