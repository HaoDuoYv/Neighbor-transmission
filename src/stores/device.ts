import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Device } from '@/types'

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<Device[]>([])
  const currentDeviceId = ref<string | null>(null)

  const onlineDevices = computed(() => devices.value.filter(d => d.isOnline))
  const offlineDevices = computed(() => devices.value.filter(d => !d.isOnline))
  const currentDevice = computed(() => devices.value.find(d => d.id === currentDeviceId.value))

  async function fetchDevices() {
    devices.value = await window.electronAPI.getDevices()
  }

  function addDevice(device: Device) {
    const index = devices.value.findIndex(d => d.id === device.id)
    if (index === -1) {
      devices.value.push(device)
    } else {
      devices.value[index] = device
    }
  }

  function updateDevice(device: Device) {
    const index = devices.value.findIndex(d => d.id === device.id)
    if (index !== -1) {
      devices.value[index] = { ...devices.value[index], ...device }
    }
  }

  function setDeviceOffline(deviceId: string) {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      device.isOnline = false
    }
  }

  function setCurrentDevice(deviceId: string | null) {
    currentDeviceId.value = deviceId
  }

  async function toggleFavorite(deviceId: string) {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      device.isFavorite = !device.isFavorite
      await window.electronAPI.toggleFavorite(deviceId, device.isFavorite)
    }
  }

  return {
    devices, currentDeviceId, onlineDevices, offlineDevices, currentDevice,
    fetchDevices, addDevice, updateDevice, setDeviceOffline, setCurrentDevice, toggleFavorite
  }
})
