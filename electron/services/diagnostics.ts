import { createSocket } from 'dgram'
import { connect } from 'net'
import { getDiscoveryTargets, getNetworkInterfaces } from '../utils/network'

const UDP_DISCOVERY_PORT = 12345
const TCP_FILE_PORT = 12346
const WS_MESSAGE_PORT = 12347
const TCP_CHECK_TIMEOUT = 800

export type DiagnosticStatus = 'ok' | 'warning' | 'error'

export interface DiagnosticCheck {
  id: string
  title: string
  status: DiagnosticStatus
  detail: string
  suggestion?: string
}

export interface NetworkDiagnosticReport {
  status: DiagnosticStatus
  summary: string
  generatedAt: number
  localIPs: string[]
  discoveryTargets: string[]
  checks: DiagnosticCheck[]
}

export async function runNetworkDiagnostics(): Promise<NetworkDiagnosticReport> {
  const interfaces = getNetworkInterfaces()
  const localIPs = interfaces.map((iface) => iface.ip)
  const discoveryTargets = getDiscoveryTargets()

  const checks: DiagnosticCheck[] = [
    checkLocalIPs(localIPs),
    checkDiscoveryTargets(discoveryTargets),
    await checkUdpPort(UDP_DISCOVERY_PORT),
    await checkTcpService(TCP_FILE_PORT, 'tcp-file-port', '文件传输端口'),
    await checkTcpService(WS_MESSAGE_PORT, 'ws-message-port', '聊天连接端口')
  ]

  const errorCount = checks.filter((check) => check.status === 'error').length
  const warningCount = checks.filter((check) => check.status === 'warning').length
  const status: DiagnosticStatus = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'ok'

  return {
    status,
    summary: buildSummary(errorCount, warningCount),
    generatedAt: Date.now(),
    localIPs,
    discoveryTargets,
    checks
  }
}

function checkLocalIPs(localIPs: string[]): DiagnosticCheck {
  if (localIPs.length === 0) {
    return {
      id: 'local-ip',
      title: '局域网 IP',
      status: 'error',
      detail: '未检测到可用的 IPv4 局域网地址。',
      suggestion: '请连接到 Wi-Fi 或有线局域网，并确认系统网络适配器已启用。'
    }
  }

  const privateIPs = localIPs.filter(isPrivateIP)
  if (privateIPs.length === 0) {
    return {
      id: 'local-ip',
      title: '局域网 IP',
      status: 'warning',
      detail: `检测到 IP：${localIPs.join('、')}，但它们不像常见局域网地址。`,
      suggestion: '如果无法发现设备，请确认两台设备位于同一局域网，且没有开启热点/AP 隔离。'
    }
  }

  return {
    id: 'local-ip',
    title: '局域网 IP',
    status: 'ok',
    detail: `检测到 ${localIPs.length} 个本机地址：${localIPs.join('、')}`
  }
}

function checkDiscoveryTargets(targets: string[]): DiagnosticCheck {
  const broadcastTargets = targets.filter((target) => target.endsWith('.255') || target === '255.255.255.255')
  if (targets.length === 0 || broadcastTargets.length === 0) {
    return {
      id: 'discovery-targets',
      title: '发现广播地址',
      status: 'error',
      detail: '未计算出可用的广播地址。',
      suggestion: '请检查网卡掩码配置，或重启应用后重新自检。'
    }
  }

  return {
    id: 'discovery-targets',
    title: '发现广播地址',
    status: 'ok',
    detail: `将向 ${targets.join('、')} 发送发现包。`
  }
}

function checkUdpPort(port: number): Promise<DiagnosticCheck> {
  return new Promise((resolve) => {
    const socket = createSocket({ type: 'udp4', reuseAddr: true })
    let settled = false

    const finish = (check: DiagnosticCheck) => {
      if (settled) return
      settled = true
      try {
        socket.close()
      } catch {
        // ignore
      }
      resolve(check)
    }

    socket.on('error', (err: NodeJS.ErrnoException) => {
      finish({
        id: 'udp-discovery-port',
        title: 'UDP 发现端口',
        status: 'error',
        detail: `UDP ${port} 无法绑定：${err.code || err.message}`,
        suggestion: `请检查是否有其他程序占用了 UDP ${port}，并在 Windows 防火墙中允许本应用的 UDP 入站连接。`
      })
    })

    socket.bind(port, () => {
      finish({
        id: 'udp-discovery-port',
        title: 'UDP 发现端口',
        status: 'ok',
        detail: `UDP ${port} 可以绑定，发现广播端口可用。`
      })
    })
  })
}

function checkTcpService(port: number, id: string, title: string): Promise<DiagnosticCheck> {
  return new Promise((resolve) => {
    const socket = connect(port, '127.0.0.1')
    let settled = false
    const timer = setTimeout(() => {
      finish({
        id,
        title,
        status: 'error',
        detail: `127.0.0.1:${port} 连接超时，服务可能没有启动。`,
        suggestion: '请重启应用；如果仍然失败，检查安全软件是否拦截本应用监听端口。'
      })
    }, TCP_CHECK_TIMEOUT)

    const finish = (check: DiagnosticCheck) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      resolve(check)
    }

    socket.on('connect', () => {
      finish({
        id,
        title,
        status: 'ok',
        detail: `127.0.0.1:${port} 正在监听。`
      })
    })

    socket.on('error', (err: NodeJS.ErrnoException) => {
      finish({
        id,
        title,
        status: 'error',
        detail: `127.0.0.1:${port} 无法连接：${err.code || err.message}`,
        suggestion: `请确认应用服务已启动，并允许 TCP ${port} 的入站连接。`
      })
    })
  })
}

function buildSummary(errorCount: number, warningCount: number): string {
  if (errorCount > 0) return `${errorCount} 项异常，${warningCount} 项警告`
  if (warningCount > 0) return `${warningCount} 项需要注意`
  return '网络自检未发现异常'
}

function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  )
}
