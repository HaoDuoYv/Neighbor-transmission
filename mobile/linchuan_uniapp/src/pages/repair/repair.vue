<template>
  <view class="screen">
    <view class="screen-header">
      <view>
        <view class="eyebrow">REPAIR</view>
        <view class="title">网络自检</view>
        <view class="subtitle">{{ store.diagnostics?.summary || '检查权限、端口和局域网地址' }}</view>
      </view>
      <button class="primary-button" :disabled="store.busy" @tap="store.runDiagnostics">自检</button>
    </view>

    <view v-if="!store.diagnostics" class="empty">
      点“自检”查看 UDP 12345、TCP 12346、WebSocket 12347 和 Android 权限状态。
    </view>

    <view v-else class="list">
      <view class="panel">
        <view class="item-row">
          <view>
            <view class="item-title">整体状态</view>
            <view class="item-meta">{{ store.diagnostics.generatedAt ? timeText(store.diagnostics.generatedAt) : '' }}</view>
          </view>
          <view class="badge" :class="statusClass(store.diagnostics.status)">{{ statusText(store.diagnostics.status) }}</view>
        </view>
      </view>

      <view v-for="check in store.diagnostics.checks" :key="check.id" class="item">
        <view class="item-row">
          <view>
            <view class="item-title">{{ check.title }}</view>
            <view class="item-meta">{{ check.detail }}</view>
          </view>
          <view class="badge" :class="statusClass(check.status)">{{ statusText(check.status) }}</view>
        </view>
        <view v-if="check.suggestion" class="item-meta" style="margin-top: 16rpx;">{{ check.suggestion }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { useLinchuanStore } from '../../stores/linchuanStore'

const store = useLinchuanStore()

onShow(() => {
  if (!store.diagnostics) store.runDiagnostics()
})

function statusText(status) {
  if (status === 'ok') return '正常'
  if (status === 'warning') return '注意'
  return '阻断'
}

function statusClass(status) {
  if (status === 'warning') return 'warning'
  if (status === 'error') return 'error'
  return ''
}

function timeText(timestamp) {
  return new Date(timestamp).toLocaleString()
}
</script>
