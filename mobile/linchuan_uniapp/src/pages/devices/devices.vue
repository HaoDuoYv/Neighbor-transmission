<template>
  <view class="screen">
    <view class="screen-header">
      <view>
        <view class="eyebrow">LAN DISCOVERY</view>
        <view class="title">附近设备</view>
        <view class="subtitle">{{ store.onlineDevices.length }} 台在线，{{ store.localDevice.deviceName }}</view>
      </view>
      <view class="actions">
        <button class="icon-button" aria-label="扫描" :disabled="store.busy" @tap="store.scanNow">↻</button>
        <button class="icon-button" aria-label="修复" @tap="goRepair">!</button>
      </view>
    </view>

    <view class="toolbar">
      <input v-model="manualIP" class="input" placeholder="输入电脑 IP，例如 192.168.1.8" />
      <button class="primary-button" @tap="connectManual">连接</button>
    </view>

    <view v-if="store.devices.length === 0" class="empty">
      还没有发现设备。请确认手机和电脑在同一 Wi-Fi，也可以直接输入电脑 IP 连接。
    </view>

    <view v-else class="list">
      <view
        v-for="device in store.devices"
        :key="device.id"
        class="item"
        :class="{ active: store.selectedDeviceId === device.id }"
        @tap="selectDevice(device)"
      >
        <view class="item-row">
          <view>
            <view class="item-title">{{ device.name }}</view>
            <view class="item-meta">{{ device.ip }} · TCP {{ device.port }} · WS {{ device.wsPort }}</view>
          </view>
          <view class="badge" :class="{ warning: !device.isOnline }">{{ device.isOnline ? '在线' : '离线' }}</view>
        </view>
        <view class="actions" style="margin-top: 20rpx;">
          <button class="secondary-button" @tap.stop="openChat(device)">聊天</button>
          <button class="primary-button" @tap.stop="sendFile(device)">传文件</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useLinchuanStore } from '../../stores/linchuanStore'

const store = useLinchuanStore()
const manualIP = ref('')

function connectManual() {
  store.manualConnect(manualIP.value)
}

function selectDevice(device) {
  store.selectDevice(device.id)
}

function openChat(device) {
  store.selectDevice(device.id)
  uni.switchTab({ url: '/pages/chat/chat' })
}

function sendFile(device) {
  store.selectDevice(device.id)
  store.sendFile()
}

function goRepair() {
  uni.switchTab({ url: '/pages/repair/repair' })
}
</script>
