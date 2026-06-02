import { createServer, Server, Socket, connect } from 'net'
import { EventEmitter } from 'events'
import { createReadStream, createWriteStream, statSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import { generateId } from '../utils/id'
import { TransferTask } from '../../src/types'

const TCP_PORT = 12346
const CHUNK_SIZE = 64 * 1024 // 64KB
const MAX_CONCURRENT = 3

interface PendingTransfer {
  task: TransferTask
  chunks: Buffer[]
  receivedChunks: number
  totalChunks: number
  writeStream?: ReturnType<typeof createWriteStream>
  socket?: Socket
}

export class FileTransferService extends EventEmitter {
  private server: Server
  private port: number = TCP_PORT
  private pendingTransfers: Map<string, PendingTransfer> = new Map()
  private activeTransfers: Set<string> = new Set()
  private outgoingSockets: Map<string, Socket> = new Map()
  private savePath: string

  constructor(savePath: string) {
    super()
    this.savePath = savePath
    this.server = createServer((socket) => this.handleConnection(socket))
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`[FileTransfer] TCP 监听端口 ${this.port}`)
    })

    this.server.on('error', (err) => {
      console.error('[FileTransfer] 服务器错误:', err)
    })

    // 确保保存目录存在
    if (!existsSync(this.savePath)) {
      mkdirSync(this.savePath, { recursive: true })
    }
  }

  private handleConnection(socket: Socket) {
    let buffer = Buffer.alloc(0)

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data])
      buffer = this.processBuffer(socket, buffer)
    })

    socket.on('close', () => {
      // 清理该连接相关的 pendingTransfers
      for (const [fileId, pending] of this.pendingTransfers) {
        if (pending.socket !== socket) continue
        if (pending.writeStream) pending.writeStream.end()
        pending.task.status = 'failed'
        this.emit('transfer:error', { fileId, error: '连接断开' })
        this.pendingTransfers.delete(fileId)
        this.activeTransfers.delete(fileId)
      }
      // 清理 outgoingSockets 中引用此 socket 的条目
      for (const [fileId, sock] of this.outgoingSockets) {
        if (sock === socket) this.outgoingSockets.delete(fileId)
      }
    })

    socket.on('error', (err) => {
      console.error('[FileTransfer] 连接错误:', err)
    })
  }

  private processBuffer(socket: Socket, buffer: Buffer): Buffer {
    while (buffer.length > 0) {
      const headerEnd = buffer.indexOf('\n')
      if (headerEnd === -1) break

      try {
        const header = JSON.parse(buffer.subarray(0, headerEnd).toString())
        const remaining = buffer.subarray(headerEnd + 1)

        switch (header.type) {
          case 'file-request':
            this.handleFileRequest(socket, header)
            buffer = remaining
            break
          case 'file-accept':
            this.handleFileAccept(header)
            buffer = remaining
            break
          case 'file-reject':
            this.handleFileReject(header)
            buffer = remaining
            break
          case 'chunk':
            if (remaining.length < header.size) {
              // 数据不完整，等待更多数据
              return buffer
            }
            this.handleChunk(socket, header, remaining)
            buffer = remaining.subarray(header.size)
            break
          case 'file-complete':
            this.handleFileComplete(header)
            buffer = remaining
            break
          default:
            buffer = remaining
            break
        }
      } catch {
        // 解析失败，等待更多数据
        break
      }
    }
    return buffer
  }

  async sendFile(filePath: string, toDeviceIP: string, toDevicePort: number): Promise<TransferTask> {
    if (this.activeTransfers.size >= MAX_CONCURRENT) {
      throw new Error('已达最大并发传输数')
    }

    const fileId = generateId()
    const stats = statSync(filePath)
    const fileName = basename(filePath)

    const task: TransferTask = {
      id: fileId,
      fileName,
      fileSize: stats.size,
      filePath,
      fromDevice: '',
      toDevice: '',
      direction: 'send',
      status: 'pending',
      progress: 0,
      speed: 0,
      createdAt: Date.now()
    }

    this.emit('transfer:start', task)

    // 连接目标设备
    const socket = connect(toDevicePort, toDeviceIP)

    socket.on('connect', () => {
      // 发送文件请求
      const request = JSON.stringify({
        type: 'file-request',
        fileId,
        fileName,
        fileSize: stats.size
      }) + '\n'
      socket.write(request)

      this.activeTransfers.add(fileId)
      this.outgoingSockets.set(fileId, socket)

      // 等待对方接受后开始传输
      this.pendingTransfers.set(fileId, {
        task,
        chunks: [],
        receivedChunks: 0,
        totalChunks: Math.ceil(stats.size / CHUNK_SIZE)
      })
    })

    socket.on('error', (err) => {
      task.status = 'failed'
      this.emit('transfer:error', { fileId, error: err.message })
      this.activeTransfers.delete(fileId)
      this.outgoingSockets.delete(fileId)
    })

    return task
  }

  private handleFileRequest(socket: Socket, header: { fileId: string; fileName: string; fileSize: number }) {
    // 自动接受文件（后续可添加确认逻辑）
    const response = JSON.stringify({ type: 'file-accept', fileId: header.fileId }) + '\n'
    socket.write(response)

    const filePath = join(this.savePath, this.getUniqueFileName(header.fileName))
    const totalChunks = Math.ceil(header.fileSize / CHUNK_SIZE)

    const task: TransferTask = {
      id: header.fileId,
      fileName: header.fileName,
      fileSize: header.fileSize,
      filePath,
      fromDevice: '',
      toDevice: '',
      direction: 'receive',
      status: 'transferring',
      progress: 0,
      speed: 0,
      createdAt: Date.now()
    }

    this.pendingTransfers.set(header.fileId, {
      task,
      chunks: [],
      receivedChunks: 0,
      totalChunks,
      writeStream: createWriteStream(filePath),
      socket
    })

    this.emit('transfer:start', task)
  }

  private handleFileAccept(header: { fileId: string }) {
    const pending = this.pendingTransfers.get(header.fileId)
    if (!pending) return

    const socket = this.outgoingSockets.get(header.fileId)
    if (!socket) return

    pending.task.status = 'transferring'
    this.emit('transfer:progress', pending.task)

    // 开始发送文件分片
    this.sendFileChunks(header.fileId, socket)
  }

  private handleFileReject(header: { fileId: string }) {
    const pending = this.pendingTransfers.get(header.fileId)
    if (!pending) return

    pending.task.status = 'failed'
    this.emit('transfer:error', { fileId: header.fileId, error: '对方拒绝接收' })
    this.pendingTransfers.delete(header.fileId)
    this.activeTransfers.delete(header.fileId)
    this.outgoingSockets.delete(header.fileId)
  }

  private handleChunk(socket: Socket, header: { fileId: string; chunkIndex: number; size: number }, data: Buffer) {
    const pending = this.pendingTransfers.get(header.fileId)
    if (!pending || !pending.writeStream) return

    pending.writeStream.write(data.subarray(0, header.size))
    pending.receivedChunks++

    // 发送确认
    const ack = JSON.stringify({ type: 'chunk-ack', fileId: header.fileId, chunkIndex: header.chunkIndex }) + '\n'
    socket.write(ack)

    // 更新进度
    pending.task.progress = pending.receivedChunks / pending.totalChunks
    this.emit('transfer:progress', pending.task)

    // 检查是否完成
    if (pending.receivedChunks >= pending.totalChunks) {
      pending.writeStream.end()
      pending.task.status = 'completed'
      pending.task.progress = 1
      pending.task.completedAt = Date.now()
      this.emit('transfer:complete', pending.task)
      this.pendingTransfers.delete(header.fileId)
    }
  }

  private handleFileComplete(header: { fileId: string }) {
    const pending = this.pendingTransfers.get(header.fileId)
    if (!pending) return

    pending.task.status = 'completed'
    pending.task.progress = 1
    pending.task.completedAt = Date.now()
    this.emit('transfer:complete', pending.task)
    this.pendingTransfers.delete(header.fileId)
    this.activeTransfers.delete(header.fileId)
    this.outgoingSockets.delete(header.fileId)
  }

  private async sendFileChunks(fileId: string, socket: Socket) {
    const pending = this.pendingTransfers.get(fileId)
    if (!pending || !pending.task.filePath) return

    const readStream = createReadStream(pending.task.filePath, { highWaterMark: CHUNK_SIZE })
    let chunkIndex = 0

    readStream.on('data', (chunk: Buffer) => {
      const header = JSON.stringify({
        type: 'chunk',
        fileId,
        chunkIndex,
        size: chunk.length
      }) + '\n'

      socket.write(header)
      socket.write(chunk)
      chunkIndex++
    })

    readStream.on('end', () => {
      const complete = JSON.stringify({ type: 'file-complete', fileId }) + '\n'
      socket.write(complete)
    })
  }

  private getUniqueFileName(fileName: string): string {
    const baseName = fileName.replace(/\.[^/.]+$/, '')
    const ext = fileName.match(/\.[^/.]+$/)?.[0] || ''
    let counter = 0
    let uniqueName = fileName

    while (existsSync(join(this.savePath, uniqueName))) {
      counter++
      uniqueName = `${baseName}(${counter})${ext}`
    }

    return uniqueName
  }

  cancelTransfer(fileId: string) {
    const pending = this.pendingTransfers.get(fileId)
    if (pending) {
      pending.task.status = 'cancelled'
      if (pending.writeStream) pending.writeStream.end()
      this.pendingTransfers.delete(fileId)
      this.activeTransfers.delete(fileId)
      this.outgoingSockets.delete(fileId)
      this.emit('transfer:progress', pending.task)
    }
  }

  stop() {
    this.server.close()
    for (const pending of this.pendingTransfers.values()) {
      if (pending.writeStream) pending.writeStream.end()
    }
    this.pendingTransfers.clear()
    this.outgoingSockets.clear()
  }
}
