import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { notificationRepository } from '@/data/repositories'
import type { Notification } from '@/types'
import { notificationWebSocketUrl, notificationsApi, type NotificationDto } from '@/services/api'
import { notificationToView } from '@/services/mappers'
import { useAuthStore } from './auth'

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([])
  const socketState = ref<'disconnected'|'connecting'|'connected'>('disconnected')
  const socket = ref<WebSocket | null>(null)
  const reconnectTimer = ref<number | null>(null)
  const unreadCount = computed(() => items.value.filter(n => !n.isRead).length)

  async function initialize() { items.value = await notificationRepository.list() }
  async function markRead(id: string) {
    const item = items.value.find(n => n.id === id)
    if (!item || item.isRead) return
    item.isRead = true
    const updated = await notificationsApi.markRead(Number(id))
    Object.assign(item, notificationToView(updated))
  }
  async function markAllRead() {
    items.value.forEach(n => n.isRead = true)
    await notificationsApi.markAllRead()
  }
  async function remove(id: string) {
    items.value = items.value.filter(n => n.id !== id)
    await notificationsApi.remove(Number(id))
  }
  function receive(notification: Notification) { items.value.unshift(notification) }

  function connectSocket() {
    const auth = useAuthStore()
    const url = notificationWebSocketUrl()
    if (!auth.isSignedIn || !url || socket.value?.readyState === WebSocket.OPEN || socket.value?.readyState === WebSocket.CONNECTING) return
    clearReconnect()
    socketState.value = 'connecting'
    const nextSocket = new WebSocket(url)
    socket.value = nextSocket
    nextSocket.onopen = () => { socketState.value = 'connected' }
    nextSocket.onmessage = event => applySocketMessage(event.data)
    nextSocket.onerror = () => nextSocket.close()
    nextSocket.onclose = () => {
      if (socket.value !== nextSocket) return
      socket.value = null
      socketState.value = 'disconnected'
      if (useAuthStore().isSignedIn) scheduleReconnect()
    }
  }
  function disconnectSocket() {
    clearReconnect()
    socket.value?.close()
    socket.value = null
    socketState.value = 'disconnected'
  }
  function reset() {
    disconnectSocket()
    items.value = []
  }
  function applySocketMessage(raw: string) {
    let message: { type: string; payload?: NotificationDto | null }
    try {
      message = JSON.parse(raw) as { type: string; payload?: NotificationDto | null }
    } catch {
      return
    }
    if (message.type !== 'notification.created' || !message.payload) return
    const incoming = notificationToView(message.payload)
    items.value = [incoming, ...items.value.filter(item => item.id !== incoming.id)].slice(0, 50)
  }
  function scheduleReconnect() {
    clearReconnect()
    reconnectTimer.value = window.setTimeout(() => {
      reconnectTimer.value = null
      connectSocket()
    }, 3000)
  }
  function clearReconnect() {
    if (reconnectTimer.value !== null) {
      window.clearTimeout(reconnectTimer.value)
      reconnectTimer.value = null
    }
  }

  return { items, unreadCount, socketState, initialize, markRead, markAllRead, remove, receive, connectSocket, disconnectSocket, reset }
})
