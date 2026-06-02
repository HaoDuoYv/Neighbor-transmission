<template>
  <div class="chat-page">
    <!-- 左侧会话列表 -->
    <div class="conversation-list">
      <div class="list-header">
        <h3>聊天</h3>
      </div>

      <div class="list-content">
        <div
          v-for="device in chatDevices"
          :key="device.id"
          class="conversation-item"
          :class="{ active: currentChatDeviceId === device.id }"
          @click="selectChat(device.id)"
        >
          <el-avatar :size="40">{{ device.name.charAt(0) }}</el-avatar>
          <div class="conversation-info">
            <span class="name">{{ device.name }}</span>
            <span class="last-message">{{ getLastMessage(device.id) }}</span>
          </div>
          <span v-if="device.isOnline" class="online-dot"></span>
        </div>

        <el-empty v-if="chatDevices.length === 0" description="暂无会话" :image-size="60" />
      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-area">
      <template v-if="currentChatDeviceId">
        <div class="chat-header">
          <h3>{{ currentDeviceName }}</h3>
          <span class="status" :class="{ online: isCurrentDeviceOnline }">
            {{ isCurrentDeviceOnline ? '在线' : '离线' }}
          </span>
        </div>

        <div class="messages-container" ref="messagesContainer">
          <MessageBubble
            v-for="msg in currentMessages"
            :key="msg.id"
            :message="msg"
            :current-device-id="currentDeviceId"
          />
        </div>

        <div class="input-area">
          <div class="toolbar">
            <el-button text @click="insertEmoji">
              <el-icon><ChatDotRound /></el-icon>
            </el-button>
            <el-button text @click="selectFile">
              <el-icon><Paperclip /></el-icon>
            </el-button>
            <el-button text @click="insertCode">
              <el-icon><Document /></el-icon>
            </el-button>
          </div>

          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="3"
            placeholder="输入消息..."
            @keydown.enter.exact.prevent="sendMessage"
          />

          <div class="input-footer">
            <span class="hint">Enter 发送，Shift+Enter 换行</span>
            <el-button type="primary" size="small" @click="sendMessage" :disabled="!inputMessage.trim()">
              发送
            </el-button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="empty-chat">
          <el-icon :size="64" color="#c0c4cc"><ChatDotRound /></el-icon>
          <p>选择一个会话开始聊天</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChatDotRound, Paperclip, Document } from '@element-plus/icons-vue'
import { useDeviceStore } from '@/stores/device'
import { useChatStore } from '@/stores/chat'
import MessageBubble from '@/components/MessageBubble.vue'

const route = useRoute()
const deviceStore = useDeviceStore()
const chatStore = useChatStore()

const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

const currentChatDeviceId = computed(() => chatStore.currentChatDeviceId)
const currentDeviceId = ref('') // 需要从主进程获取当前设备 ID
const currentMessages = computed(() => chatStore.currentMessages)

const chatDevices = computed(() => deviceStore.devices)

const currentDevice = computed(() => deviceStore.devices.find(d => d.id === currentChatDeviceId.value))
const currentDeviceName = computed(() => currentDevice.value?.name || '')
const isCurrentDeviceOnline = computed(() => currentDevice.value?.isOnline || false)

onMounted(() => {
  deviceStore.fetchDevices()

  // 从路由参数获取设备 ID
  const deviceId = route.params.deviceId as string
  if (deviceId) {
    selectChat(deviceId)
  }
})

watch(currentMessages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

function selectChat(deviceId: string) {
  chatStore.setCurrentChat(deviceId)
  chatStore.fetchMessages(deviceId)
}

function getLastMessage(deviceId: string): string {
  const messages = chatStore.messages.get(deviceId)
  if (!messages || messages.length === 0) return ''
  const last = messages[messages.length - 1]
  if (last.type === 'text') return last.content.substring(0, 30)
  if (last.type === 'image') return '[图片]'
  if (last.type === 'file') return '[文件]'
  if (last.type === 'code') return '[代码]'
  if (last.type === 'emoji') return '[表情]'
  return ''
}

async function sendMessage() {
  if (!inputMessage.value.trim() || !currentChatDeviceId.value) return

  await chatStore.sendMessage(currentChatDeviceId.value, 'text', inputMessage.value.trim())
  inputMessage.value = ''
  scrollToBottom()
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function selectFile() {
  const filePaths = await window.electronAPI.selectFile()
  if (filePaths && filePaths.length > 0 && currentChatDeviceId.value) {
    // 发送文件消息
    await chatStore.sendMessage(currentChatDeviceId.value, 'file', filePaths[0], {
      fileName: filePaths[0].split('\\').pop()
    })
  }
}

function insertEmoji() {
  // TODO: 打开表情选择器
}

function insertCode() {
  // TODO: 打开代码编辑器
}
</script>

<style scoped>
.chat-page {
  height: 100%;
  display: flex;
  background: var(--bg-page);
}

.conversation-list {
  width: 280px;
  border-right: 1px solid var(--border-color);
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.list-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.list-content {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}

.conversation-item:hover {
  background: var(--bg-hover);
}

.conversation-item.active {
  background: var(--bg-active);
  border-left-color: var(--accent-color);
}

.conversation-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.conversation-info .name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.conversation-info .last-message {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 3px rgba(16, 185, 129, 0.4);
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  padding: 14px 20px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.chat-header .status {
  font-size: 12px;
  color: var(--text-secondary);
}

.chat-header .status.online {
  color: var(--success);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}

.input-area {
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
}

.toolbar {
  padding: 8px 16px 4px;
  display: flex;
  gap: 4px;
}

.input-footer {
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-footer .hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}
</style>
