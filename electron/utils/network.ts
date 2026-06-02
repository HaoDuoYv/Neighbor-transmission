import { networkInterfaces } from 'os'

export function getLocalIP(): string {
  const interfaces = networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name]
    if (!nets) continue
    for (const net of nets) {
      // 跳过内部地址和非 IPv4
      if (net.internal || net.family !== 'IPv4') continue
      return net.address
    }
  }
  return '127.0.0.1'
}

export function getBroadcastAddress(ip: string, subnetMask = '255.255.255.0'): string {
  const ipParts = ip.split('.').map(Number)
  const maskParts = subnetMask.split('.').map(Number)
  const broadcastParts = ipParts.map((part, i) => (part | (~maskParts[i] & 255)))
  return broadcastParts.join('.')
}

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  )
}
