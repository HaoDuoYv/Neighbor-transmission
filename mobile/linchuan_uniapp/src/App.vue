<template>
  <view class="app-shell">
    <slot />
  </view>
</template>

<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useLinchuanStore } from './stores/linchuanStore'

const store = useLinchuanStore()

onLaunch(() => {
  store.bootstrap()
})

onShow(() => {
  store.resumeNetwork()
})

onHide(() => {
  store.pauseNetwork()
})
</script>
