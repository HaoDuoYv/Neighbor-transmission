import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateDiagnostics } from '../src/protocol/diagnostics.js'

test('reports a ready Android network stack as ok', () => {
  const report = evaluateDiagnostics({
    platform: 'android',
    pluginAvailable: true,
    localIPs: ['192.168.8.23'],
    discoveryTargets: ['224.0.0.167', '192.168.8.255'],
    permissions: {
      internet: true,
      accessNetworkState: true,
      accessWifiState: true,
      changeWifiMulticastState: true
    },
    sockets: {
      udp: true,
      tcp: true,
      ws: true
    }
  })

  assert.equal(report.status, 'ok')
  assert.equal(report.checks.every((check) => check.status === 'ok'), true)
  assert.match(report.summary, /网络自检通过/)
})

test('warns when multicast permission is missing but manual IP can still work', () => {
  const report = evaluateDiagnostics({
    platform: 'android',
    pluginAvailable: true,
    localIPs: ['192.168.8.23'],
    discoveryTargets: ['192.168.8.255'],
    permissions: {
      internet: true,
      accessNetworkState: true,
      accessWifiState: true,
      changeWifiMulticastState: false
    },
    sockets: {
      udp: true,
      tcp: true,
      ws: true
    }
  })

  assert.equal(report.status, 'warning')
  assert.equal(report.checks.find((check) => check.id === 'multicast-permission').status, 'warning')
  assert.match(report.summary, /发现可能受限/)
})

test('reports missing native plugin and closed sockets as errors', () => {
  const report = evaluateDiagnostics({
    platform: 'h5',
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

  assert.equal(report.status, 'error')
  assert.equal(report.checks.find((check) => check.id === 'native-plugin').status, 'error')
  assert.equal(report.checks.find((check) => check.id === 'local-ip').status, 'error')
  assert.equal(report.checks.find((check) => check.id === 'udp-port').status, 'error')
})
