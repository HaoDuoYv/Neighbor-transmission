import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

class FakeTcpSocket extends EventEmitter {
  destroy() {
    this.emit('close')
  }
}

function loadDiagnosticsModule({ interfaces, discoveryTargets, udpBindError, openTcpPorts }) {
  const source = readFileSync(resolve('electron/services/diagnostics.ts'), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  })

  const module = { exports: {} }
  const sandbox = {
    Buffer,
    Error,
    console,
    exports: module.exports,
    module,
    setTimeout,
    clearTimeout,
    require(name) {
      if (name === 'dgram') {
        return {
          createSocket: () => ({
            bind(_port, callback) {
              if (udpBindError) {
                setTimeout(() => this.onerror?.(udpBindError), 0)
                return
              }
              callback?.()
            },
            on(event, handler) {
              if (event === 'error') this.onerror = handler
            },
            close() {}
          })
        }
      }
      if (name === 'net') {
        return {
          connect(port, _host) {
            const socket = new FakeTcpSocket()
            setTimeout(() => {
              if (openTcpPorts.includes(port)) {
                socket.emit('connect')
              } else {
                socket.emit('error', Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }))
              }
            }, 0)
            return socket
          }
        }
      }
      if (name === '../utils/network') {
        return {
          getNetworkInterfaces: () => interfaces,
          getDiscoveryTargets: () => discoveryTargets
        }
      }
      throw new Error(`Unexpected import: ${name}`)
    }
  }

  vm.runInNewContext(outputText, sandbox, { filename: 'diagnostics.js' })
  return module.exports
}

{
  const { runNetworkDiagnostics } = loadDiagnosticsModule({
    interfaces: [
      { ip: '192.168.1.24', netmask: '255.255.255.0', broadcast: '192.168.1.255' }
    ],
    discoveryTargets: ['224.0.0.167', '192.168.1.255', '255.255.255.255'],
    udpBindError: null,
    openTcpPorts: [12346, 12347]
  })

  const report = JSON.parse(JSON.stringify(await runNetworkDiagnostics()))
  assert.equal(report.status, 'ok')
  assert.deepEqual(report.localIPs, ['192.168.1.24'])
  assert.deepEqual(report.discoveryTargets, ['224.0.0.167', '192.168.1.255', '255.255.255.255'])
  assert.deepEqual(report.checks.map((check) => check.id), [
    'local-ip',
    'discovery-targets',
    'udp-discovery-port',
    'tcp-file-port',
    'ws-message-port'
  ])
}

{
  const { runNetworkDiagnostics } = loadDiagnosticsModule({
    interfaces: [],
    discoveryTargets: ['224.0.0.167', '255.255.255.255'],
    udpBindError: Object.assign(new Error('EADDRINUSE'), { code: 'EADDRINUSE' }),
    openTcpPorts: []
  })

  const report = JSON.parse(JSON.stringify(await runNetworkDiagnostics()))
  assert.equal(report.status, 'error')
  assert.equal(report.checks.find((check) => check.id === 'local-ip')?.status, 'error')
  assert.equal(report.checks.find((check) => check.id === 'udp-discovery-port')?.status, 'error')
  assert.equal(report.checks.find((check) => check.id === 'tcp-file-port')?.status, 'error')
  assert.equal(report.checks.find((check) => check.id === 'ws-message-port')?.status, 'error')
  assert.match(report.summary, /4 项异常/)
}

console.log('network diagnostics helpers ok')
