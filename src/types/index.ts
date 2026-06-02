// 设备信息
export interface Device {
  id: string
  name: string
  ip: string
  port: number
  wsPort: number
  avatar?: string
  isOnline: boolean
  lastSeen: number
  isFavorite: boolean
}

// UDP 心跳包
export interface HeartbeatMessage {
  type: 'heartbeat' | 'offline'
  deviceId: string
  deviceName: string
  ip: string
  port: number
  wsPort: number
  avatar?: string
  timestamp: number
}

// 文件传输请求
export interface FileRequest {
  type: 'file-request'
  fileId: string
  fileName: string
  fileSize: number
  fromDevice: string
  toDevice: string
}

// 文件传输响应
export interface FileResponse {
  type: 'file-accept' | 'file-reject'
  fileId: string
}

// 文件分片确认
export interface ChunkAck {
  type: 'chunk-ack'
  fileId: string
  chunkIndex: number
}

// 断点续传请求
export interface ResumeRequest {
  type: 'resume'
  fileId: string
  lastChunkIndex: number
}

// 文件传输完成
export interface FileComplete {
  type: 'file-complete'
  fileId: string
}

// 传输任务状态
export type TransferStatus = 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled' | 'paused'

// 传输任务
export interface TransferTask {
  id: string
  fileName: string
  fileSize: number
  filePath?: string
  fromDevice: string
  toDevice: string
  direction: 'send' | 'receive'
  status: TransferStatus
  progress: number
  speed: number
  createdAt: number
  completedAt?: number
}

// 消息类型
export type MessageType = 'text' | 'image' | 'file' | 'code' | 'emoji'

// 消息状态
export type MessageStatus = 'sending' | 'sent' | 'failed' | 'read'

// 聊天消息
export interface ChatMessage {
  id: string
  fromDevice: string
  toDevice: string
  type: MessageType
  content: string
  metadata?: Record<string, unknown>
  status: MessageStatus
  createdAt: number
}

// 消息确认
export interface MessageAck {
  type: 'msg-ack'
  msgId: string
}

// WebSocket 消息包装
export interface WsMessage {
  type: 'chat' | 'ack'
  payload: ChatMessage | MessageAck
}

// IPC 事件类型
export interface IpcEvents {
  'device:online': Device
  'device:offline': string
  'device:update': Device
  'transfer:progress': TransferTask
  'transfer:complete': TransferTask
  'transfer:error': { fileId: string; error: string }
  'message:new': ChatMessage
  'message:ack': { msgId: string }
  'message:error': { msgId: string; error: string }
}
