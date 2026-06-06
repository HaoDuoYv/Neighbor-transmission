<template>
  <view class="screen">
    <view class="screen-header">
      <view>
        <view class="eyebrow">SETTINGS</view>
        <view class="title">设置</view>
        <view class="subtitle">设备身份和协议端口</view>
      </view>
      <button class="secondary-button" @tap="saveName">保存</button>
    </view>

    <view class="settings-group">
      <view class="panel">
        <view class="item-title">本机名称</view>
        <input v-model="deviceName" class="input" style="margin-top: 16rpx;" placeholder="手机邻传" />
        <view class="item-meta">桌面端设备列表会显示这个名称。</view>
      </view>

      <view class="panel">
        <view class="item-title">设备 ID</view>
        <view class="item-meta">{{ store.localDevice.deviceId }}</view>
      </view>

      <view class="panel">
        <view class="item-title">协议端口</view>
        <view class="item-meta">UDP 12345 · TCP 12346 · WebSocket 12347 · 分片 64KB</view>
      </view>

      <view class="panel">
        <view class="item-title">兼容说明</view>
        <view class="item-meta">
          移动端使用邻传桌面端现有协议。自动发现受路由器、Android 组播权限和 VPN 影响时，可在设备页手动输入电脑 IP。
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useLinchuanStore } from '../../stores/linchuanStore'

const store = useLinchuanStore()
const deviceName = ref(store.localDevice.deviceName)

watch(() => store.localDevice.deviceName, (name) => {
  deviceName.value = name
})

function saveName() {
  store.updateDeviceName(deviceName.value)
}
</script>
