<template>
  <div class="app-container">
    <Sidebar />
    <div class="app-main">
      <div class="title-bar">
        <div class="title-bar-drag">
          <span class="title-text">邻传</span>
        </div>
        <div class="window-controls">
          <div class="win-btn" @click="minimize" title="最小化">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" fill="currentColor"/></svg>
          </div>
          <div class="win-btn" @click="maximize" title="最大化">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1"/></svg>
          </div>
          <div class="win-btn win-btn-close" @click="closeWindow" title="关闭">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.2"/></svg>
          </div>
        </div>
      </div>
      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import { useDeviceStore } from '@/stores/device'
import { useChatStore } from '@/stores/chat'
import { useTransferStore } from '@/stores/transfer'

const deviceStore = useDeviceStore()
const chatStore = useChatStore()
const transferStore = useTransferStore()

function minimize() {
  window.electronAPI?.minimizeWindow()
}
function maximize() {
  window.electronAPI?.maximizeWindow()
}
function closeWindow() {
  window.electronAPI?.closeWindow()
}

const unsubscribers: (() => void)[] = []

onMounted(() => {
  const saved = localStorage.getItem('linchuan-theme')
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved)
  }

  // 订阅设备事件
  unsubscribers.push(
    window.electronAPI.onDeviceOnline((device: any) => {
      deviceStore.addDevice(device)
    }),
    window.electronAPI.onDeviceOffline((deviceId: string) => {
      deviceStore.setDeviceOffline(deviceId)
    }),
    window.electronAPI.onDeviceUpdate((device: any) => {
      deviceStore.updateDevice(device)
    })
  )

  // 订阅消息事件
  unsubscribers.push(
    window.electronAPI.onMessageReceived((message: any) => {
      chatStore.addMessage(message)
    }),
    window.electronAPI.onMessageSent((message: any) => {
      chatStore.updateMessageStatus(message.id, message.status)
    }),
    window.electronAPI.onMessageError(({ msgId }: any) => {
      chatStore.updateMessageStatus(msgId, 'failed')
    })
  )

  // 订阅传输事件
  unsubscribers.push(
    window.electronAPI.onTransferProgress((task: any) => {
      transferStore.addTransfer(task)
    }),
    window.electronAPI.onTransferComplete((task: any) => {
      transferStore.addTransfer(task)
    }),
    window.electronAPI.onTransferError(({ fileId }: any) => {
      const transfer = transferStore.transfers.find(t => t.id === fileId)
      if (transfer) transfer.status = 'failed'
    })
  )

  // 初始加载
  deviceStore.fetchDevices()
  transferStore.fetchTransfers()
})

onBeforeUnmount(() => {
  unsubscribers.forEach(fn => fn())
})
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--bg-page);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  background: var(--titlebar-bg);
  flex-shrink: 0;
  -webkit-app-region: drag;
  padding-left: 8px;
}

.title-bar-drag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
  -webkit-app-region: drag;
}

.title-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.window-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.win-btn {
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s;
  -webkit-app-region: no-drag;
}

.win-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.win-btn-close:hover {
  background: #e81123;
  color: #fff;
}

.content-area {
  flex: 1;
  overflow: hidden;
}
</style>
