<template>
  <view class="screen">
    <view class="screen-header">
      <view>
        <view class="eyebrow">FILES</view>
        <view class="title">传输</view>
        <view class="subtitle">{{ store.selectedDevice?.name || '选择设备后即可发送文件' }}</view>
      </view>
      <button class="primary-button" :disabled="!store.selectedDevice" @tap="store.sendFile">发文件</button>
    </view>

    <view class="metric-grid">
      <view class="metric">
        <view class="metric-value">{{ completedCount }}</view>
        <view class="metric-label">已完成</view>
      </view>
      <view class="metric">
        <view class="metric-value">{{ activeCount }}</view>
        <view class="metric-label">进行中</view>
      </view>
    </view>

    <view v-if="store.transfers.length === 0" class="empty">
      暂无文件传输。选择设备后，可以从聊天页或这里发送文件。
    </view>

    <view v-else class="list">
      <view v-for="transfer in store.transfers" :key="transfer.id" class="item">
        <view class="item-row">
          <view>
            <view class="item-title">{{ transfer.fileName }}</view>
            <view class="item-meta">{{ directionText(transfer.direction) }} · {{ sizeText(transfer.fileSize) }}</view>
          </view>
          <view class="badge" :class="badgeClass(transfer.status)">{{ statusText(transfer.status) }}</view>
        </view>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: `${Math.round((transfer.progress || 0) * 100)}%` }" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useLinchuanStore } from '../../stores/linchuanStore'

const store = useLinchuanStore()
const completedCount = computed(() => store.transfers.filter((item) => item.status === 'completed').length)
const activeCount = computed(() => store.transfers.filter((item) => item.status === 'pending' || item.status === 'transferring').length)

function directionText(direction) {
  return direction === 'send' ? '发送' : '接收'
}

function sizeText(size) {
  if (!size) return '未知大小'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function statusText(status) {
  const labels = {
    pending: '等待',
    transferring: '传输中',
    completed: '完成',
    failed: '失败',
    cancelled: '取消',
    paused: '暂停'
  }
  return labels[status] || status
}

function badgeClass(status) {
  if (status === 'failed' || status === 'cancelled') return 'error'
  if (status === 'pending' || status === 'paused') return 'warning'
  return ''
}
</script>
