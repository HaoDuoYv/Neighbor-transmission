export const __linchuanNetworkPlaceholder = true

export function on() {}

export function startDiscovery(_options, callback) {
  callback?.({ ok: false, reason: 'native-plugin-missing' })
}

export function stopDiscovery(_options, callback) {
  callback?.({ ok: true })
}

export function manualConnect(options, callback) {
  callback?.({ ok: false, reason: 'native-plugin-missing', targetIP: options?.targetIP })
}

export function sendMessage(_options, callback) {
  callback?.({ ok: false, reason: 'native-plugin-missing' })
}

export function sendMessageAck(_options, callback) {
  callback?.({ ok: false, reason: 'native-plugin-missing' })
}

export function sendFile(_options, callback) {
  callback?.({ ok: false, reason: 'native-plugin-missing' })
}

export function runDiagnostics(_options, callback) {
  callback?.({
    ok: true,
    localIPs: [],
    discoveryTargets: [],
    permissions: {},
    sockets: {
      udp: false,
      tcp: false,
      ws: false
    }
  })
}
