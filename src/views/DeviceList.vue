<template>
  <div class="page device-list-page">
    <div class="page-header">
      <h2>局域网设备</h2>
      <el-input
        v-model="searchQuery"
        placeholder="搜索设备..."
        prefix-icon="Search"
        clearable
        style="width: 240px"
      />
    </div>

    <div class="device-grid">
      <DeviceCard
        v-for="device in filteredDevices"
        :key="device.id"
        :device="device"
        @chat="handleChat"
        @send-file="handleSendFile"
        @toggle-favorite="handleToggleFavorite"
      />

      <el-empty v-if="filteredDevices.length === 0" description="暂未发现设备" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import DeviceCard from '@/components/DeviceCard.vue'
import type { Device } from '@/types'

const router = useRouter()
const deviceStore = useDeviceStore()
const searchQuery = ref('')

const filteredDevices = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return deviceStore.devices.filter(d =>
    d.name.toLowerCase().includes(query) || d.ip.includes(query)
  )
})

onMounted(() => {
  deviceStore.fetchDevices()
})

function handleChat(device: Device) {
  deviceStore.setCurrentDevice(device.id)
  router.push(`/chat/${device.id}`)
}

async function handleSendFile(device: Device) {
  const filePaths = await window.electronAPI.selectFile()
  if (filePaths && filePaths.length > 0) {
    for (const filePath of filePaths) {
      await window.electronAPI.sendFile(filePath, device.ip, device.port)
    }
  }
}

function handleToggleFavorite(device: Device) {
  deviceStore.toggleFavorite(device.id)
}
</script>

<style scoped>
.device-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding: 2px;
}
</style>
