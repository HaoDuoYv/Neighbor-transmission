import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage } from '@/types'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Map<string, ChatMessage[]>>(new Map())
  const currentChatDeviceId = ref<string | null>(null)

  const currentMessages = computed(() => {
    if (!currentChatDeviceId.value) return []
    return messages.value.get(currentChatDeviceId.value) || []
  })

  const unreadCounts = computed(() => {
    const counts: Record<string, number> = {}
    return counts
  })

  async function fetchMessages(deviceId: string) {
    const msgs = await window.electronAPI.getMessages('', deviceId)
    messages.value.set(deviceId, msgs as ChatMessage[])
  }

  function addMessage(message: ChatMessage) {
    const chatId = message.fromDevice === currentChatDeviceId.value ? message.fromDevice : message.toDevice
    const chatMessages = messages.value.get(chatId) || []
    chatMessages.push(message)
    messages.value.set(chatId, chatMessages)
  }

  function updateMessageStatus(msgId: string, status: ChatMessage['status']) {
    for (const chatMessages of messages.value.values()) {
      const msg = chatMessages.find(m => m.id === msgId)
      if (msg) {
        msg.status = status
        break
      }
    }
  }

  async function sendMessage(toDevice: string, type: ChatMessage['type'], content: string, metadata?: Record<string, unknown>) {
    const message = await window.electronAPI.sendMessage(toDevice, type, content, metadata)
    addMessage(message as ChatMessage)
    return message
  }

  function setCurrentChat(deviceId: string | null) {
    currentChatDeviceId.value = deviceId
  }

  return {
    messages, currentChatDeviceId, currentMessages, unreadCounts,
    fetchMessages, addMessage, updateMessageStatus, sendMessage, setCurrentChat
  }
})
