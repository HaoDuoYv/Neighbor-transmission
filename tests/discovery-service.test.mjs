import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

class FakeUdpSocket extends EventEmitter {
  sends = []
  memberships = []
  bind(_port, callback) {
    callback()
  }
  addMembership(group, iface) {
    this.memberships.push({ group, iface })
  }
  dropMembership() {}
  setBroadcast() {}
  setMulticastTTL() {}
  setMulticastLoopback() {}
  send(_buffer, _offset, _length, port, target, callback) {
    this.sends.push({ port, target })
    callback?.()
  }
  close() {}
}

function loadDiscoveryModule(fakeSocket) {
  const source = readFileSync(resolve('electron/services/discovery.ts'), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  })

  const module = { exports: {} }
  const sandbox = {
    Buffer,
    console,
    exports: module.exports,
    module,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    require(name) {
      if (name === 'dgram') return { createSocket: () => fakeSocket }
      if (name === 'net') return { connect: () => new EventEmitter() }
      if (name === 'events') return { EventEmitter }
      if (name === '../utils/network') {
        return {
          getLocalIP: () => '192.168.1.24',
          getSubnetPrefix: () => '192.168.1',
          getNetworkInterfaces: () => [
            { ip: '192.168.1.24', netmask: '255.255.255.0', broadcast: '192.168.1.255' },
            { ip: '10.0.4.8', netmask: '255.255.254.0', broadcast: '10.0.5.255' }
          ],
          getDiscoveryTargets: () => ['224.0.0.167', '192.168.1.255', '10.0.5.255', '255.255.255.255'],
          getScanSubnets: () => [
            { ip: '192.168.1.24', prefix: '192.168.1' },
            { ip: '10.0.4.8', prefix: '10.0.4' }
          ]
        }
      }
      if (name === '../../src/types') return {}
      throw new Error(`Unexpected import: ${name}`)
    }
  }

  vm.runInNewContext(outputText, sandbox, { filename: 'discovery.js' })
  return module.exports
}

const socket = new FakeUdpSocket()
const { DiscoveryService } = loadDiscoveryModule(socket)

new DiscoveryService('local-device', 'Local PC', 12346, 12347).start()

assert.deepEqual(
  socket.sends.map((send) => send.target),
  ['224.0.0.167', '192.168.1.255', '10.0.5.255', '255.255.255.255']
)

console.log('discovery service sends to all discovery targets')
