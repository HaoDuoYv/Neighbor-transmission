import { networkInterfaces } from 'os'

export interface NetworkInterfaceInfo {
  ip: string
  netmask: string
  broadcast: string
}

const DEFAULT_MULTICAST_GROUP = '224.0.0.167'

export function getNetworkInterfaces(): NetworkInterfaceInfo[] {
  try {
    const interfaces = networkInterfaces()
    const result: NetworkInterfaceInfo[] = []

    for (const name of Object.keys(interfaces)) {
      const nets = interfaces[name]
      if (!nets) continue

      for (const net of nets) {
        if (net.internal || net.family !== 'IPv4') continue
        result.push({
          ip: net.address,
          netmask: net.netmask,
          broadcast: getBroadcastAddress(net.address, net.netmask)
        })
      }
    }

    return result
  } catch {
    return []
  }
}

export function getLocalIP(): string {
  const interfaces = getNetworkInterfaces()
  return interfaces[0]?.ip ?? '127.0.0.1'
}

export function getLocalNetmask(): string {
  const interfaces = getNetworkInterfaces()
  return interfaces[0]?.netmask ?? '255.255.255.0'
}

export function getBroadcastAddress(ip: string, subnetMask = '255.255.255.0'): string {
  const ipParts = ip.split('.').map(Number)
  const maskParts = subnetMask.split('.').map(Number)
  const broadcastParts = ipParts.map((part, i) => part | (~maskParts[i] & 255))
  return broadcastParts.join('.')
}

export function getAllBroadcastAddresses(): string[] {
  const addrs = new Set<string>()

  for (const iface of getNetworkInterfaces()) {
    addrs.add(iface.broadcast)
  }

  addrs.add('255.255.255.255')
  return Array.from(addrs)
}

export function getDiscoveryTargets(multicastGroup = DEFAULT_MULTICAST_GROUP): string[] {
  return Array.from(new Set([multicastGroup, ...getAllBroadcastAddresses()]))
}

export function getScanSubnets(): Array<{ ip: string; prefix: string }> {
  return getNetworkInterfaces().map((iface) => ({
    ip: iface.ip,
    prefix: iface.ip.split('.').slice(0, 3).join('.')
  }))
}

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  )
}

/** Returns the /24 subnet prefix of the preferred local IP, e.g. "192.168.1". */
export function getSubnetPrefix(): string {
  const ip = getLocalIP()
  return ip.split('.').slice(0, 3).join('.')
}
