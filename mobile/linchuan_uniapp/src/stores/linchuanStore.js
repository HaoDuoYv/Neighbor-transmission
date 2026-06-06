import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { normalizeHeartbeat } from '../protocol/linchuanProtocol.js'
import { createNetworkBridge } from '../services/networkBridge.js'

const STORAGE_KEYS = {
  deviceId: 'linchuan.mobile.deviceId',
  deviceName: 'linchuan.mobile.deviceName'
}

export const useLinchuanStore = defineStore('linchuan', () => {
  const bridge = createNetworkBridge()
  const localDevice = ref({
    deviceId: '',
    deviceName: '手机邻传',
    ip: '0.0.0.0'
  })
  const devices = ref([])
  const selectedDeviceId = ref('')
  const messages = ref([])
  const transfers = ref([])
  const diagnostics = ref(null)
  const networkRunning = ref(false)
  const busy = ref(false)
  const notice = ref('')

  const selectedDevice = computed(() => devices.value.find((device) => device.id === selectedDeviceId.value) || null)
  const onlineDevices = computed(() => devices.value.filter((device) => device.isOnline))
  const messagesForSelectedDevice = computed(() => {
    const target = selectedDevice.value
    if (!target) return []
    return messages.value.filter((message) => {
      return message.fromDevice === target.id || message.toDevice === target.id
    })
  })

  function bootstrap() {
    localDevice.value.deviceId = getOrSetStorage(STORAGE_KEYS.deviceId, createDeviceId())
    localDevice.value.deviceName = getOrSetStorage(STORAGE_KEYS.deviceName, createDefaultDeviceName())

    bridge.on('device', (device) => upsertDevice(device))
    bridge.on('message', (message) => {
      messages.value.push(message)
      if (message.fromDevice) selectedDeviceId.value = message.fromDevice
    })
    bridge.on('messageAck', (payload) => markMessageSent(payload.msgId || payload.messageId))
    bridge.on('transfer', (transfer) => upsertTransfer(transfer))
    bridge.on('transferProgress', (transfer) => upsertTransfer(transfer))
    bridge.on('transferComplete', (transfer) => upsertTransfer({ ...transfer, status: 'completed', progress: 1 }))
    bridge.on('error', (error) => showNotice(error.message || String(error)))
  }

  async function resumeNetwork() {
    if (networkRunning.value) return
    try {
      await bridge.startDiscovery(localDevice.value)
      networkRunning.value = true
    } catch (error) {
      showNotice(error.message)
    }
  }

  async function pauseNetwork() {
    try {
      await bridge.stopDiscovery()
    } finally {
      networkRunning.value = false
    }
  }

  async function scanNow() {
    busy.value = true
    try {
      await bridge.startDiscovery(localDevice.value)
      networkRunning.value = true
      showNotice('已发起局域网发现')
    } catch (error) {
      showNotice(error.message)
    } finally {
      busy.value = false
    }
  }

  async function manualConnect(targetIP) {
    const ip = targetIP.trim()
    if (!ip) return
    busy.value = true
    try {
      const result = await bridge.manualConnect(localDevice.value, ip)
      if (result?.device) upsertDevice(result.device)
      showNotice(result?.ok === false ? '已添加手动设备，App 端可继续发起 TCP 探测' : '手动连接成功')
    } catch (error) {
      showNotice(error.message)
    } finally {
      busy.value = false
    }
  }

  async function sendText(content) {
    const target = selectedDevice.value
    const text = content.trim()
    if (!target || !text) return
    const message = await bridge.sendMessage(localDevice.value, target, text)
    messages.value.push(message)
  }

  async function sendFile() {
    const target = selectedDevice.value
    if (!target) return
    const transfer = await bridge.chooseAndSendFile(localDevice.value, target)
    if (transfer) upsertTransfer(transfer)
  }

  async function runDiagnostics() {
    busy.value = true
    try {
      diagnostics.value = await bridge.runDiagnostics()
    } catch (error) {
      showNotice(error.message)
    } finally {
      busy.value = false
    }
  }

  function selectDevice(deviceId) {
    selectedDeviceId.value = deviceId
  }

  function updateDeviceName(name) {
    const nextName = name.trim() || '手机邻传'
    localDevice.value.deviceName = nextName
    try {
      uni.setStorageSync(STORAGE_KEYS.deviceName, nextName)
    } catch {
      // Storage is unavailable in Node-only tests.
    }
  }

  function ingestHeartbeat(packet, senderIP = '') {
    const device = normalizeHeartbeat(packet, senderIP)
    upsertDevice(device)
  }

  function upsertDevice(device) {
    const index = devices.value.findIndex((item) => item.id === device.id)
    if (index === -1) {
      devices.value.unshift(device)
    } else {
      devices.value[index] = { ...devices.value[index], ...device }
    }
  }

  function upsertTransfer(transfer) {
    const index = transfers.value.findIndex((item) => item.id === transfer.id)
    if (index === -1) {
      transfers.value.unshift(transfer)
    } else {
      transfers.value[index] = { ...transfers.value[index], ...transfer }
    }
  }

  function markMessageSent(msgId) {
    if (!msgId) return
    messages.value = messages.value.map((message) => {
      if (message.id !== msgId) return message
      return { ...message, status: 'sent' }
    })
  }

  function showNotice(message) {
    notice.value = message
    if (typeof uni !== 'undefined' && typeof uni.showToast === 'function') {
      uni.showToast({
        title: message,
        icon: 'none'
      })
    }
  }

  return {
    localDevice,
    devices,
    selectedDeviceId,
    selectedDevice,
    onlineDevices,
    messages,
    messagesForSelectedDevice,
    transfers,
    diagnostics,
    networkRunning,
    busy,
    notice,
    bootstrap,
    resumeNetwork,
    pauseNetwork,
    scanNow,
    manualConnect,
    sendText,
    sendFile,
    runDiagnostics,
    selectDevice,
    updateDeviceName,
    ingestHeartbeat
  }
})

function getOrSetStorage(key, fallback) {
  try {
    const existing = uni.getStorageSync(key)
    if (existing) return existing
    uni.setStorageSync(key, fallback)
  } catch {
    return fallback
  }
  return fallback
}

function createDeviceId() {
  return `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createDefaultDeviceName() {
  try {
    const systemInfo = uni.getSystemInfoSync()
    return `${systemInfo.deviceBrand || '手机'}邻传`
  } catch {
    return '手机邻传'
  }
}
