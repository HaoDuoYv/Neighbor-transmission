import { createSocket, Socket } from 'dgram'
import { EventEmitter } from 'events'
import { getLocalIP, getBroadcastAddress } from '../utils/network'
import { HeartbeatMessage, Device } from '../../src/types'

const UDP_PORT = 12345
const HEARTBEAT_INTERVAL = 3000
const OFFLINE_TIMEOUT = 10000

export class DiscoveryService extends EventEmitter {
  private socket: Socket
  private localIP: string
  private deviceId: string
  private deviceName: string
  private tcpPort: number
  private wsPort: number
  private heartbeatTimer: NodeJS.Timeout | null = null
  private devices: Map<string, Device> = new Map()
  private offlineCheckTimer: NodeJS.Timeout | null = null
  private running = false

  constructor(deviceId: string, deviceName: string, tcpPort: number, wsPort: number) {
    super()
    this.deviceId = deviceId
    this.deviceName = deviceName
    this.tcpPort = tcpPort
    this.wsPort = wsPort
    this.localIP = getLocalIP()
    this.socket = createSocket('udp4')
  }

  start() {
    if (this.running) return
    this.running = true

    this.socket.bind(UDP_PORT, () => {
      this.socket.setBroadcast(true)
      console.log(`[Discovery] UDP 监听端口 ${UDP_PORT}`)
    })

    this.socket.on('message', (msg, rinfo) => {
      try {
        const data: HeartbeatMessage = JSON.parse(msg.toString())
        // 忽略自己的心跳
        if (data.deviceId === this.deviceId) return
        this.handleHeartbeat(data, rinfo.address)
      } catch {
        // 忽略无效消息
      }
    })

    this.socket.on('error', (err) => {
      console.error('[Discovery] UDP 错误:', err)
    })

    // 开始广播心跳
    this.startHeartbeat()

    // 开始离线检测
    this.startOfflineCheck()
  }

  private startHeartbeat() {
    const broadcast = () => {
      const message: HeartbeatMessage = {
        type: 'heartbeat',
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        ip: this.localIP,
        port: this.tcpPort,
        wsPort: this.wsPort,
        timestamp: Date.now()
      }
      const buffer = Buffer.from(JSON.stringify(message))
      const broadcastAddr = getBroadcastAddress(this.localIP)
      this.socket.send(buffer, 0, buffer.length, UDP_PORT, broadcastAddr)
    }

    // 立即广播一次
    broadcast()
    this.heartbeatTimer = setInterval(broadcast, HEARTBEAT_INTERVAL)
  }

  private startOfflineCheck() {
    this.offlineCheckTimer = setInterval(() => {
      const now = Date.now()
      for (const [id, device] of this.devices) {
        if (device.isOnline && now - device.lastSeen > OFFLINE_TIMEOUT) {
          device.isOnline = false
          this.emit('device:offline', device)
        }
      }
    }, 5000)
  }

  private handleHeartbeat(data: HeartbeatMessage, ip: string) {
    const existing = this.devices.get(data.deviceId)

    if (data.type === 'offline') {
      if (existing) {
        existing.isOnline = false
        this.emit('device:offline', existing)
      }
      return
    }

    if (existing) {
      // 更新现有设备
      existing.name = data.deviceName
      existing.ip = ip
      existing.port = data.port
      existing.wsPort = data.wsPort
      existing.lastSeen = data.timestamp
      existing.isOnline = true
      this.emit('device:update', existing)
    } else {
      // 新设备上线
      const device: Device = {
        id: data.deviceId,
        name: data.deviceName,
        ip: ip,
        port: data.port,
        wsPort: data.wsPort,
        isOnline: true,
        lastSeen: data.timestamp,
        isFavorite: false
      }
      this.devices.set(data.deviceId, device)
      this.emit('device:online', device)
    }
  }

  getOnlineDevices(): Device[] {
    return Array.from(this.devices.values()).filter(d => d.isOnline)
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values())
  }

  broadcastOffline() {
    const message: HeartbeatMessage = {
      type: 'offline',
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      ip: this.localIP,
      port: this.tcpPort,
      wsPort: this.wsPort,
      timestamp: Date.now()
    }
    const buffer = Buffer.from(JSON.stringify(message))
    const broadcastAddr = getBroadcastAddress(this.localIP)
    this.socket.send(buffer, 0, buffer.length, UDP_PORT, broadcastAddr)
  }

  stop() {
    if (!this.running) return
    this.running = false
    this.broadcastOffline()
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.offlineCheckTimer) clearInterval(this.offlineCheckTimer)
    setTimeout(() => {
      this.socket.close()
    }, 100)
  }
}
