import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

function loadNetworkModule(fakeInterfaces) {
  const source = readFileSync(resolve('electron/utils/network.ts'), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  })

  const module = { exports: {} }
  const sandbox = {
    exports: module.exports,
    module,
    require(name) {
      if (name === 'os') {
        return { networkInterfaces: () => fakeInterfaces }
      }
      throw new Error(`Unexpected import: ${name}`)
    }
  }

  vm.runInNewContext(outputText, sandbox, { filename: 'network.js' })
  return module.exports
}

const network = loadNetworkModule({
  Ethernet: [
    { internal: false, family: 'IPv4', address: '192.168.1.24', netmask: '255.255.255.0' },
    { internal: false, family: 'IPv6', address: 'fe80::1', netmask: 'ffff:ffff:ffff:ffff::' }
  ],
  WiFi: [
    { internal: false, family: 'IPv4', address: '10.0.4.8', netmask: '255.255.254.0' }
  ],
  Loopback: [
    { internal: true, family: 'IPv4', address: '127.0.0.1', netmask: '255.0.0.0' }
  ]
})

assert.equal(typeof network.getDiscoveryTargets, 'function')
const normalize = (value) => JSON.parse(JSON.stringify(value))

assert.deepEqual(normalize(network.getDiscoveryTargets()), [
  '224.0.0.167',
  '192.168.1.255',
  '10.0.5.255',
  '255.255.255.255'
])

assert.deepEqual(normalize(network.getScanSubnets()), [
  { ip: '192.168.1.24', prefix: '192.168.1' },
  { ip: '10.0.4.8', prefix: '10.0.4' }
])

console.log('network discovery helpers ok')
