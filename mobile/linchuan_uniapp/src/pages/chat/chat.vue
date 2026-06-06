<template>
  <view class="screen">
    <view class="screen-header">
      <view>
        <view class="eyebrow">CHAT</view>
        <view class="title">{{ store.selectedDevice?.name || '选择设备' }}</view>
        <view class="subtitle">
          {{ store.selectedDevice ? `${store.selectedDevice.ip}:${store.selectedDevice.wsPort}` : '先到设备页选择一台电脑或手机' }}
        </view>
      </view>
      <button class="icon-button" aria-label="设备" @tap="goDevices">⌂</button>
    </view>

    <view v-if="!store.selectedDevice" class="empty">
      还没有选中设备。发现设备后，点“聊天”即可进入对话。
    </view>

    <scroll-view v-else scroll-y class="chat-list">
      <view
        v-for="message in store.messagesForSelectedDevice"
        :key="message.id"
        class="bubble"
        :class="{ mine: message.fromDevice === store.localDevice.deviceId }"
      >
        <text>{{ message.content }}</text>
        <view class="bubble-status">{{ statusText(message.status) }}</view>
      </view>
      <view v-if="store.messagesForSelectedDevice.length === 0" class="empty">
        还没有消息。发送一条文本，桌面端收到后会返回 ACK。
      </view>
    </scroll-view>

    <view class="composer">
      <button class="icon-button" aria-label="文件" :disabled="!store.selectedDevice" @tap="store.sendFile">＋</button>
      <input v-model="draft" class="input" placeholder="输入消息" confirm-type="send" @confirm="send" />
      <button class="primary-button" :disabled="!store.selectedDevice || !draft.trim()" @tap="send">发送</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useLinchuanStore } from '../../stores/linchuanStore'

const store = useLinchuanStore()
const draft = ref('')

async function send() {
  const text = draft.value
  draft.value = ''
  await store.sendText(text)
}

function statusText(status) {
  if (status === 'sent') return '已送达'
  if (status === 'failed') return '失败'
  if (status === 'read') return '已读'
  return '发送中'
}

function goDevices() {
  uni.switchTab({ url: '/pages/devices/devices' })
}
</script>
