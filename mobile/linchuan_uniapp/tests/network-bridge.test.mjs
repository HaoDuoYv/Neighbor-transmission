import test from 'node:test'
import assert from 'node:assert/strict'

import { createNetworkBridge } from '../src/services/networkBridge.node.mjs'

test('passes local device identity to discovery heartbeat once', async () => {
  const calls = []
  const bridge = createNetworkBridge({
    plugin: {
      startDiscovery(payload, callback) {
        calls.push(payload)
        callback({ ok: true })
      },
      on() {}
    },
    platform: 'android'
  })

  await bridge.startDiscovery({
    deviceId: 'phone-1',
    deviceName: '手机邻传',
    ip: '192.168.8.23'
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].heartbeat.deviceId, 'phone-1')
  assert.equal(calls[0].heartbeat.deviceName, '手机邻传')
  assert.equal(calls[0].heartbeat.ip, '192.168.8.23')
  assert.equal(calls[0].heartbeat.port, 12346)
  assert.equal(calls[0].heartbeat.wsPort, 12347)
})
