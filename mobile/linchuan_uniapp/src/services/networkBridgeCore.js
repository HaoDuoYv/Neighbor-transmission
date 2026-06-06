import {
  LAN_PORTS,
  MULTICAST_GROUP,
  createAckMessage,
  createChatMessage,
  createFileRequest,
  createHeartbeat,
  createTcpDiscoveryPing
} from '../protocol/linchuanProtocol.js'
import { evaluateDiagnostics } from '../protocol/diagnostics.js'

const EVENT_NAMES = [
  'device',
  'message',
  'messageAck',
  'transfer',
  'transferProgress',
  'transferComplete',
  'error'
]

export function createNetworkBridgeCore({
  plugin = null,
  platform = 'unknown',
  chooseFile = async () => null
} = {}) {
  const listeners = new Map()
  const fallbackState = {
    devices: [],
    messages: [],
    transfers: []
  }

  const bridge = {
    pluginAvailable: Boolean(plugin),

    on(eventName, callback) {
      if (!listeners.has(eventName)) listeners.set(eventName, new Set())
      listeners.get(eventName).add(callback)
      return () => listeners.get(eventName)?.delete(callback)
    },

    async startDiscovery(localDevice) {
      if (!plugin) {
        emit(listeners, 'error', createBridgeError('当前运行环境没有原生网络插件，自动发现仅在 Android App 端可用。'))
        return { ok: false, reason: 'native-plugin-missing' }
      }

      registerPluginEvents(plugin, listeners)
      return callPlugin(plugin, 'startDiscovery', {
        multicastGroup: MULTICAST_GROUP,
        udpPort: LAN_PORTS.udp,
        tcpPort: LAN_PORTS.tcp,
        wsPort: LAN_PORTS.ws,
        heartbeat: createHeartbeat(localDevice)
      })
    },

    async stopDiscovery() {
      if (!plugin) return { ok: true }
      return callPlugin(plugin, 'stopDiscovery')
    },

    async manualConnect(localDevice, targetIP) {
      if (!plugin) {
        const fakeDevice = {
          id: `manual-${targetIP}`,
          name: `手动设备 ${targetIP}`,
          ip: targetIP,
          port: LAN_PORTS.tcp,
          wsPort: LAN_PORTS.ws,
          isOnline: true,
          isFavorite: false,
          lastSeen: Date.now()
        }
        fallbackState.devices = upsertById(fallbackState.devices, fakeDevice)
        emit(listeners, 'device', fakeDevice)
        return { ok: false, reason: 'native-plugin-missing', device: fakeDevice }
      }

      return callPlugin(plugin, 'manualConnect', {
        targetIP,
        tcpPort: LAN_PORTS.tcp,
        ping: createTcpDiscoveryPing(localDevice)
      })
    },

    async sendMessage(localDevice, targetDevice, content) {
      const envelope = createChatMessage({
        id: createId('msg'),
        fromDevice: localDevice.deviceId,
        toDevice: targetDevice.id,
        content
      })

      if (!plugin) {
        const failed = {
          ...envelope.payload,
          status: 'failed'
        }
        fallbackState.messages.push(failed)
        emit(listeners, 'message', failed)
        emit(listeners, 'error', createBridgeError('聊天需要 Android App 原生 WebSocket 服务。'))
        return failed
      }

      await callPlugin(plugin, 'sendMessage', {
        target: targetDevice,
        envelope
      })
      return envelope.payload
    },

    async acknowledgeMessage(msgId, targetDevice) {
      if (!plugin) return { ok: false, reason: 'native-plugin-missing' }
      return callPlugin(plugin, 'sendMessageAck', {
        target: targetDevice,
        envelope: createAckMessage(msgId)
      })
    },

    async chooseAndSendFile(localDevice, targetDevice) {
      const file = await chooseFile()
      if (!file) return null

      const transfer = {
        id: createId('file'),
        fileName: file.name,
        fileSize: file.size || 0,
        filePath: file.path,
        fromDevice: localDevice.deviceId,
        toDevice: targetDevice.id,
        direction: 'send',
        status: 'pending',
        progress: 0,
        speed: 0,
        createdAt: Date.now()
      }

      if (!plugin) {
        const failed = { ...transfer, status: 'failed' }
        fallbackState.transfers.push(failed)
        emit(listeners, 'transfer', failed)
        emit(listeners, 'error', createBridgeError('文件传输需要 Android App 原生 TCP 服务。'))
        return failed
      }

      await callPlugin(plugin, 'sendFile', {
        target: targetDevice,
        request: createFileRequest({
          fileId: transfer.id,
          fileName: transfer.fileName,
          fileSize: transfer.fileSize
        }),
        filePath: transfer.filePath
      })
      return transfer
    },

    async runDiagnostics() {
      if (!plugin) {
        return evaluateDiagnostics({
          platform,
          pluginAvailable: false,
          localIPs: [],
          discoveryTargets: [],
          permissions: {},
          sockets: {
            udp: false,
            tcp: false,
            ws: false
          }
        })
      }

      const raw = await callPlugin(plugin, 'runDiagnostics')
      return evaluateDiagnostics({
        platform,
        pluginAvailable: true,
        localIPs: raw.localIPs || [],
        discoveryTargets: raw.discoveryTargets || [],
        permissions: raw.permissions || {},
        sockets: raw.sockets || {}
      })
    }
  }

  return bridge
}

function registerPluginEvents(plugin, listeners) {
  if (!plugin || plugin.__linchuanEventsRegistered) return

  for (const eventName of EVENT_NAMES) {
    if (typeof plugin.on === 'function') {
      plugin.on(eventName, (payload) => emit(listeners, eventName, payload))
    }
  }

  plugin.__linchuanEventsRegistered = true
}

function callPlugin(plugin, method, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!plugin || typeof plugin[method] !== 'function') {
      reject(new Error(`linchuan-network.${method} 不可用`))
      return
    }

    try {
      const result = plugin[method](payload, (response) => {
        if (response?.ok === false) {
          reject(new Error(response.reason || response.error || `${method} 调用失败`))
          return
        }
        resolve(response || { ok: true })
      })

      if (result !== undefined) resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}

function emit(listeners, eventName, payload) {
  for (const callback of listeners.get(eventName) || []) {
    callback(payload)
  }
}

function upsertById(items, next) {
  const index = items.findIndex((item) => item.id === next.id)
  if (index === -1) return [next, ...items]
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item)
}

function createBridgeError(message) {
  return {
    message,
    createdAt: Date.now()
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
