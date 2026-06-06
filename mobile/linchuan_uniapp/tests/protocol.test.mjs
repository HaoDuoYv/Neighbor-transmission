import test from 'node:test'
import assert from 'node:assert/strict'

import {
  LAN_PORTS,
  MULTICAST_GROUP,
  createAckMessage,
  createChatMessage,
  createHeartbeat,
  createTcpDiscoveryPing,
  createTcpDiscoveryPong,
  normalizeHeartbeat
} from '../src/protocol/linchuanProtocol.js'

test('creates desktop-compatible heartbeat packets', () => {
  const heartbeat = createHeartbeat({
    deviceId: 'phone-1',
    deviceName: 'Pixel 邻传',
    ip: '192.168.8.23'
  })

  assert.equal(MULTICAST_GROUP, '224.0.0.167')
  assert.deepEqual(LAN_PORTS, {
    udp: 12345,
    tcp: 12346,
    ws: 12347,
    chunkSize: 64 * 1024
  })
  assert.equal(heartbeat.type, 'heartbeat')
  assert.equal(heartbeat.deviceId, 'phone-1')
  assert.equal(heartbeat.deviceName, 'Pixel 邻传')
  assert.equal(heartbeat.ip, '192.168.8.23')
  assert.equal(heartbeat.port, 12346)
  assert.equal(heartbeat.wsPort, 12347)
  assert.equal(typeof heartbeat.timestamp, 'number')
})

test('normalizes desktop heartbeat using sender IP over packet IP', () => {
  const device = normalizeHeartbeat({
    type: 'heartbeat',
    deviceId: 'desktop-1',
    deviceName: '书房电脑',
    ip: '0.0.0.0',
    port: 12346,
    wsPort: 12347,
    timestamp: 1700000000000
  }, '192.168.8.44')

  assert.deepEqual(device, {
    id: 'desktop-1',
    name: '书房电脑',
    ip: '192.168.8.44',
    port: 12346,
    wsPort: 12347,
    avatar: undefined,
    isOnline: true,
    isFavorite: false,
    lastSeen: 1700000000000
  })
})

test('creates TCP discovery ping and pong packets', () => {
  const ping = createTcpDiscoveryPing({
    deviceId: 'phone-1',
    deviceName: '手机',
    ip: '192.168.8.23'
  })
  const pong = createTcpDiscoveryPong({
    deviceId: 'desktop-1',
    deviceName: '电脑',
    ip: '192.168.8.44'
  })

  assert.equal(ping.type, 'discovery-ping')
  assert.equal(ping.port, 12346)
  assert.equal(ping.wsPort, 12347)
  assert.equal(pong.type, 'discovery-pong')
  assert.equal(pong.port, 12346)
  assert.equal(pong.wsPort, 12347)
})

test('creates WebSocket chat and ACK envelopes compatible with desktop service', () => {
  const chat = createChatMessage({
    id: 'msg-1',
    fromDevice: 'phone-1',
    toDevice: 'desktop-1',
    content: '你好'
  })
  const ack = createAckMessage('msg-1')

  assert.equal(chat.type, 'chat')
  assert.equal(chat.payload.type, 'text')
  assert.equal(chat.payload.status, 'sending')
  assert.equal(chat.payload.content, '你好')
  assert.deepEqual(ack, {
    type: 'ack',
    payload: {
      type: 'msg-ack',
      msgId: 'msg-1'
    }
  })
})
