import { createSocket, Socket } from 'dgram'
import { connect as tcpConnect } from 'net'
import { EventEmitter } from 'events'
import { getDiscoveryTargets, getLocalIP, getNetworkInterfaces, getScanSubnets } from '../utils/network'
import { HeartbeatMessage, Device, DiscoveryPing, DiscoveryPong } from '../../src/types'

const UDP_PORT = 12345
const MULTICAST_GROUP = '224.0.0.167'
const HEARTBEAT_INTERVAL = 3000
const OFFLINE_TIMEOUT = 10000
const SCAN_CONCURRENCY = 20
const SCAN_CONNECT_TIMEOUT = 2000
const ACTIVE_ANNOUNCE_DELAYS = [100, 500, 2000]

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
  private subnetScanned = false

  constructor(deviceId: string, deviceName: string, tcpPort: number, wsPort: number) {
    super()
    this.deviceId = deviceId
    this.deviceName = deviceName
    this.tcpPort = tcpPort
    this.wsPort = wsPort
    this.localIP = getLocalIP()
    this.socket = createSocket({ type: 'udp4', reuseAddr: true })
  }

  start() {
    if (this.running) return
    this.running = true

    this.socket.on('error', (err) => {
      console.error('[Discovery] UDP error:', err)
      this.startSubnetScanOnce()
    })

    this.socket.on('message', (msg, rinfo) => {
      try {
        const data: HeartbeatMessage = JSON.parse(msg.toString())
        if (data.deviceId === this.deviceId) return
        this.handleHeartbeat(data, rinfo.address)
      } catch {
        // Ignore packets from other apps on the same UDP port.
      }
    })

    try {
      this.socket.bind(UDP_PORT, () => {
        console.log(`[Discovery] UDP listening on ${UDP_PORT}, local IP: ${this.localIP}`)
        this.configureUdpSocket()
        this.startHeartbeat()
        this.startOfflineCheck()

        for (const delay of ACTIVE_ANNOUNCE_DELAYS) {
          setTimeout(() => {
            if (this.running) this.broadcastHeartbeat()
          }, delay)
        }

        setTimeout(() => {
          if (this.running && this.getOnlineDevices().length === 0) {
            this.startSubnetScanOnce()
          }
        }, 1000)
      })
    } catch (err) {
      console.error('[Discovery] UDP bind failed:', err)
      this.startOfflineCheck()
      setTimeout(() => this.startSubnetScanOnce(), 500)
    }
  }

  private configureUdpSocket() {
    try {
      this.socket.setBroadcast(true)
      this.socket.setMulticastTTL(1)
      this.socket.setMulticastLoopback(false)
    } catch (err) {
      console.error('[Discovery] Failed to configure UDP socket:', err)
    }

    let joined = false
    for (const iface of getNetworkInterfaces()) {
      try {
        this.socket.addMembership(MULTICAST_GROUP, iface.ip)
        joined = true
        console.log(`[Discovery] Joined multicast ${MULTICAST_GROUP} on ${iface.ip}`)
      } catch (err) {
        console.error(`[Discovery] Failed to join multicast on ${iface.ip}:`, err)
      }
    }

    if (!joined) {
      try {
        this.socket.addMembership(MULTICAST_GROUP)
        console.log(`[Discovery] Joined multicast ${MULTICAST_GROUP}`)
      } catch (err) {
        console.error('[Discovery] Failed to join multicast; broadcast only:', err)
      }
    }
  }

  private startHeartbeat() {
    this.broadcastHeartbeat()
    this.heartbeatTimer = setInterval(() => this.broadcastHeartbeat(), HEARTBEAT_INTERVAL)
  }

  private createHeartbeat(type: HeartbeatMessage['type'] = 'heartbeat'): HeartbeatMessage {
    return {
      type,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      ip: this.localIP,
      port: this.tcpPort,
      wsPort: this.wsPort,
      timestamp: Date.now()
    }
  }

  private broadcastHeartbeat() {
    this.sendDiscoveryPacket(Buffer.from(JSON.stringify(this.createHeartbeat())))
  }

  private sendDiscoveryPacket(buffer: Buffer) {
    for (const target of getDiscoveryTargets(MULTICAST_GROUP)) {
      this.socket.send(buffer, 0, buffer.length, UDP_PORT, target, (err) => {
        if (err) console.error(`[Discovery] Failed to send UDP packet to ${target}:`, err.message)
      })
    }
  }

  private startOfflineCheck() {
    if (this.offlineCheckTimer) return
    this.offlineCheckTimer = setInterval(() => {
      const now = Date.now()
      for (const [, device] of this.devices) {
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

    const deviceIP = ip || data.ip
    if (existing) {
      existing.name = data.deviceName
      existing.ip = deviceIP
      existing.port = data.port
      existing.wsPort = data.wsPort
      existing.lastSeen = Date.now()
      existing.isOnline = true
      this.emit('device:update', existing)
    } else {
      const device: Device = {
        id: data.deviceId,
        name: data.deviceName,
        ip: deviceIP,
        port: data.port,
        wsPort: data.wsPort,
        isOnline: true,
        lastSeen: Date.now(),
        isFavorite: false
      }
      this.devices.set(data.deviceId, device)
      this.emit('device:online', device)
    }

    this.unicastPing(deviceIP)
  }

  private unicastPing(targetIP: string) {
    const buffer = Buffer.from(JSON.stringify(this.createHeartbeat()))
    this.socket.send(buffer, 0, buffer.length, UDP_PORT, targetIP, (err) => {
      if (err) console.error('[Discovery] Unicast reply failed:', err)
    })
  }

  getOnlineDevices(): Device[] {
    return Array.from(this.devices.values()).filter(d => d.isOnline)
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values())
  }

  addDevice(device: Device) {
    const existing = this.devices.get(device.id)
    if (existing) {
      existing.name = device.name
      existing.ip = device.ip
      existing.port = device.port
      existing.wsPort = device.wsPort
      existing.lastSeen = device.lastSeen
      existing.isOnline = true
      this.emit('device:update', existing)
    } else {
      this.devices.set(device.id, device)
      this.emit('device:online', device)
    }
  }

  pingDevice(targetIP: string, tcpPort: number, wsPort: number) {
    return new Promise<void>((resolve, reject) => {
      try {
        const buffer = Buffer.from(JSON.stringify(this.createHeartbeat()))
        this.socket.send(buffer, 0, buffer.length, UDP_PORT, targetIP, () => {})
      } catch {
        // TCP discovery below is the reliable path for manual probing.
      }

      this.tcpDiscovery(targetIP, tcpPort, wsPort).then(resolve).catch(reject)
    })
  }

  private tcpDiscovery(targetIP: string, tcpPort: number, wsPort: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = tcpConnect(tcpPort, targetIP)
      let settled = false
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true
          socket.destroy()
          reject(new Error('TCP discovery timed out'))
        }
      }, 3000)

      let buffer = Buffer.alloc(0)

      socket.on('connect', () => {
        const ping: DiscoveryPing = {
          type: 'discovery-ping',
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          ip: this.localIP,
          port: tcpPort,
          wsPort
        }
        socket.write(JSON.stringify(ping) + '\n')
      })

      socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data])
        const pongEnd = buffer.indexOf('\n')
        if (pongEnd === -1) return

        try {
          const pong: DiscoveryPong = JSON.parse(buffer.subarray(0, pongEnd).toString())
          if (pong.type === 'discovery-pong') {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            socket.end()
            this.addDeviceFromPong(pong, targetIP)
            resolve()
          }
        } catch {
          if (!settled) {
            settled = true
            clearTimeout(timeout)
            socket.destroy()
            reject(new Error('Invalid TCP discovery response'))
          }
        }
      })

      socket.on('error', (err) => {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          reject(err)
        }
      })

      socket.on('close', () => {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          reject(new Error('TCP connection closed during discovery'))
        }
      })
    })
  }

  private async scanSubnet() {
    const subnets = getScanSubnets()
    if (subnets.length === 0) return

    const tasks: Promise<void>[] = []
    for (const subnet of subnets) {
      if (subnet.prefix === '127.0.0') continue
      console.log(`[Discovery] Scanning subnet ${subnet.prefix}.0/24`)

      for (let i = 1; i <= 254; i++) {
        const ip = `${subnet.prefix}.${i}`
        if (ip === subnet.ip) continue

        tasks.push(this.tcpDiscoveryWithTimeout(ip, this.tcpPort, this.wsPort, SCAN_CONNECT_TIMEOUT))
        if (tasks.length >= SCAN_CONCURRENCY) {
          await Promise.allSettled(tasks.splice(0))
        }
      }
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks)
    }

    console.log(`[Discovery] Subnet scan complete, online devices: ${this.getOnlineDevices().length}`)
  }

  private startSubnetScanOnce() {
    if (this.subnetScanned) return
    this.subnetScanned = true
    this.scanSubnet()
  }

  private tcpDiscoveryWithTimeout(ip: string, tcpPort: number, wsPort: number, timeout: number): Promise<void> {
    return new Promise((resolve) => {
      const socket = tcpConnect(tcpPort, ip)
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve()
      }
      const timer = setTimeout(() => {
        socket.destroy()
        finish()
      }, timeout)

      let buffer = Buffer.alloc(0)

      socket.on('connect', () => {
        const ping: DiscoveryPing = {
          type: 'discovery-ping',
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          ip: this.localIP,
          port: tcpPort,
          wsPort
        }
        socket.write(JSON.stringify(ping) + '\n')
      })

      socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data])
        const pongEnd = buffer.indexOf('\n')
        if (pongEnd === -1) return

        try {
          const pong: DiscoveryPong = JSON.parse(buffer.subarray(0, pongEnd).toString())
          if (pong.type === 'discovery-pong') {
            this.addDeviceFromPong(pong, ip)
          }
        } catch {
          // Ignore invalid replies during broad subnet scans.
        } finally {
          socket.end()
          finish()
        }
      })

      socket.on('error', finish)
      socket.on('close', finish)
    })
  }

  private addDeviceFromPong(pong: DiscoveryPong, fallbackIP: string) {
    this.addDevice({
      id: pong.deviceId,
      name: pong.deviceName,
      ip: pong.ip || fallbackIP,
      port: pong.port,
      wsPort: pong.wsPort,
      isOnline: true,
      lastSeen: Date.now(),
      isFavorite: false
    })
  }

  broadcastOffline() {
    this.sendDiscoveryPacket(Buffer.from(JSON.stringify(this.createHeartbeat('offline'))))
  }

  stop() {
    if (!this.running) return
    this.running = false
    this.broadcastOffline()
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.offlineCheckTimer) clearInterval(this.offlineCheckTimer)

    for (const iface of getNetworkInterfaces()) {
      try {
        this.socket.dropMembership(MULTICAST_GROUP, iface.ip)
      } catch {
        // ignore
      }
    }

    setTimeout(() => {
      this.socket.close()
    }, 100)
  }
}
