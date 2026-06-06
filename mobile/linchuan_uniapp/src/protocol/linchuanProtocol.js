export const MULTICAST_GROUP = '224.0.0.167'

export const LAN_PORTS = Object.freeze({
  udp: 12345,
  tcp: 12346,
  ws: 12347,
  chunkSize: 64 * 1024
})

export function createHeartbeat({
  type = 'heartbeat',
  deviceId,
  deviceName,
  ip,
  port = LAN_PORTS.tcp,
  wsPort = LAN_PORTS.ws,
  avatar,
  timestamp = Date.now()
}) {
  return compactObject({
    type,
    deviceId,
    deviceName,
    ip,
    port,
    wsPort,
    avatar,
    timestamp
  })
}

export function normalizeHeartbeat(packet, senderIP = '') {
  const ip = senderIP || packet.ip
  return {
    id: packet.deviceId,
    name: packet.deviceName,
    ip,
    port: packet.port,
    wsPort: packet.wsPort,
    avatar: packet.avatar,
    isOnline: packet.type !== 'offline',
    isFavorite: false,
    lastSeen: packet.timestamp || Date.now()
  }
}

export function createTcpDiscoveryPing({
  deviceId,
  deviceName,
  ip,
  port = LAN_PORTS.tcp,
  wsPort = LAN_PORTS.ws
}) {
  return {
    type: 'discovery-ping',
    deviceId,
    deviceName,
    ip,
    port,
    wsPort
  }
}

export function createTcpDiscoveryPong({
  deviceId,
  deviceName,
  ip,
  port = LAN_PORTS.tcp,
  wsPort = LAN_PORTS.ws
}) {
  return {
    type: 'discovery-pong',
    deviceId,
    deviceName,
    ip,
    port,
    wsPort
  }
}

export function createChatMessage({
  id,
  fromDevice,
  toDevice,
  type = 'text',
  content,
  metadata,
  status = 'sending',
  createdAt = Date.now()
}) {
  return {
    type: 'chat',
    payload: compactObject({
      id,
      fromDevice,
      toDevice,
      type,
      content,
      metadata,
      status,
      createdAt
    })
  }
}

export function createAckMessage(msgId) {
  return {
    type: 'ack',
    payload: {
      type: 'msg-ack',
      msgId
    }
  }
}

export function createFileRequest({ fileId, fileName, fileSize }) {
  return {
    type: 'file-request',
    fileId,
    fileName,
    fileSize
  }
}

export function createFileAccept(fileId) {
  return {
    type: 'file-accept',
    fileId
  }
}

export function createFileReject(fileId, reason = '') {
  return compactObject({
    type: 'file-reject',
    fileId,
    reason
  })
}

export function createChunkHeader(fileId, chunkIndex, size) {
  return {
    type: 'chunk',
    fileId,
    chunkIndex,
    size
  }
}

export function createChunkAck(fileId, chunkIndex) {
  return {
    type: 'chunk-ack',
    fileId,
    chunkIndex
  }
}

export function createFileComplete(fileId) {
  return {
    type: 'file-complete',
    fileId
  }
}

export function appendJsonLine(message) {
  return `${JSON.stringify(message)}\n`
}

export function extractJsonLines(input) {
  const messages = []
  const errors = []
  const lines = input.split('\n')
  const rest = lines.pop() ?? ''

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      messages.push(JSON.parse(line))
    } catch (error) {
      errors.push({
        line,
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return { messages, errors, rest }
}

export function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  )
}
