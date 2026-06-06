import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { generateId } from '../utils/id'
import { ChatMessage, WsMessage, MessageAck } from '../../src/types'

const WS_PORT = 12347
const ACK_TIMEOUT = 5000
const MAX_RETRIES = 3

interface PendingMessage {
  message: ChatMessage
  retries: number
  timer: NodeJS.Timeout | null
}

export class MessagingService extends EventEmitter {
  private wss: WebSocketServer | null = null
  private port: number = WS_PORT
  private connections: Map<string, WebSocket> = new Map() // deviceId -> WebSocket
  private pendingMessages: Map<string, PendingMessage> = new Map()
  private localDeviceId: string

  constructor(localDeviceId: string) {
    super()
    this.localDeviceId = localDeviceId
  }

  start() {
    try {
      this.wss = new WebSocketServer({ port: this.port })
    } catch (err) {
      console.error(`[Messaging] 无法在端口 ${this.port} 启动 WebSocket 服务器:`, err)
      return
    }

    this.wss.on('listening', () => {
      console.log(`[Messaging] WebSocket 监听端口 ${this.port}`)
    })

    this.wss.on('error', (err) => {
      console.error('[Messaging] WebSocket 服务器错误:', err)
    })

    this.wss.on('connection', (ws, req) => {
      const deviceId = new URL(req.url || '', `ws://localhost:${this.port}`).searchParams.get('deviceId')

      if (deviceId) {
        // Close old connection if exists
        const oldWs = this.connections.get(deviceId)
        if (oldWs) {
          oldWs.removeAllListeners('close') // Remove close listener to prevent deleting new connection
          oldWs.close()
        }
        this.connections.set(deviceId, ws)
        console.log(`[Messaging] 设备 ${deviceId} 已连接`)

        ws.on('message', (data) => {
          try {
            const msg: WsMessage = JSON.parse(data.toString())
            this.handleMessage(deviceId, msg)
          } catch {
            // 忽略无效消息
          }
        })

        ws.on('close', () => {
          this.connections.delete(deviceId)
          console.log(`[Messaging] 设备 ${deviceId} 已断开`)
        })

        ws.on('error', (err) => {
          console.error(`[Messaging] 连接错误 (${deviceId}):`, err)
        })
      }
    })
  }

  connectToDevice(deviceId: string, ip: string, wsPort: number) {
    if (this.connections.has(deviceId)) return

    const ws = new WebSocket(`ws://${ip}:${wsPort}?deviceId=${this.localDeviceId}`)

    ws.on('open', () => {
      this.connections.set(deviceId, ws)
      console.log(`[Messaging] 已连接到设备 ${deviceId}`)
      this.emit('connected', deviceId)
    })

    ws.on('message', (data) => {
      try {
        const msg: WsMessage = JSON.parse(data.toString())
        this.handleMessage(deviceId, msg)
      } catch {
        // 忽略无效消息
      }
    })

    ws.on('close', () => {
      this.connections.delete(deviceId)
      this.emit('disconnected', deviceId)
    })

    ws.on('error', (err) => {
      console.error(`[Messaging] 连接失败 (${deviceId}):`, err)
      this.emit('connect:failed', { deviceId, error: err.message })
    })
  }

  private handleMessage(fromDevice: string, msg: WsMessage) {
    if (msg.type === 'chat') {
      const chatMsg = msg.payload as ChatMessage
      this.emit('message:received', chatMsg)

      // 发送 ACK
      const ack: WsMessage = {
        type: 'ack',
        payload: { type: 'msg-ack', msgId: chatMsg.id } as MessageAck
      }
      this.sendToDevice(fromDevice, ack)
    } else if (msg.type === 'ack') {
      const ack = msg.payload as MessageAck
      this.handleAck(ack.msgId)
    }
  }

  private handleAck(msgId: string) {
    const pending = this.pendingMessages.get(msgId)
    if (!pending) return // Already timed out or processed
    this.pendingMessages.delete(msgId) // Delete first to prevent race condition
    if (pending.timer) clearTimeout(pending.timer)
    pending.message.status = 'sent'
    this.emit('message:sent', pending.message)
  }

  sendMessage(toDevice: string, type: ChatMessage['type'], content: string, metadata?: Record<string, unknown>): ChatMessage {
    const message: ChatMessage = {
      id: generateId(),
      fromDevice: this.localDeviceId,
      toDevice,
      type,
      content,
      metadata,
      status: 'sending',
      createdAt: Date.now()
    }

    const wsMessage: WsMessage = {
      type: 'chat',
      payload: message
    }

    if (this.sendToDevice(toDevice, wsMessage)) {
      // 设置 ACK 超时
      const pending: PendingMessage = {
        message,
        retries: 0,
        timer: null
      }
      this.setupAckTimeout(message.id, pending)
      this.pendingMessages.set(message.id, pending)
    } else {
      message.status = 'failed'
      this.emit('message:error', { msgId: message.id, error: '设备未连接' })
    }

    return message
  }

  private setupAckTimeout(msgId: string, pending: PendingMessage) {
    pending.timer = setTimeout(() => {
      if (pending.retries < MAX_RETRIES) {
        pending.retries++
        const wsMessage: WsMessage = {
          type: 'chat',
          payload: pending.message
        }
        if (this.sendToDevice(pending.message.toDevice, wsMessage)) {
          this.setupAckTimeout(msgId, pending)
        } else {
          pending.message.status = 'failed'
          this.pendingMessages.delete(msgId)
          this.emit('message:error', { msgId, error: '重试失败' })
        }
      } else {
        pending.message.status = 'failed'
        this.pendingMessages.delete(msgId)
        this.emit('message:error', { msgId, error: '发送超时' })
      }
    }, ACK_TIMEOUT)
  }

  private sendToDevice(deviceId: string, msg: WsMessage): boolean {
    const ws = this.connections.get(deviceId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
      return true
    }
    return false
  }

  isConnected(deviceId: string): boolean {
    return this.connections.has(deviceId)
  }

  stop() {
    for (const ws of this.connections.values()) {
      ws.close()
    }
    this.connections.clear()
    for (const pending of this.pendingMessages.values()) {
      if (pending.timer) clearTimeout(pending.timer)
    }
    this.pendingMessages.clear()
    this.wss?.close()
  }
}
