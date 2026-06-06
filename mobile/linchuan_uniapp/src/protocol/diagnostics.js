const PERMISSION_LABELS = {
  internet: '网络访问',
  accessNetworkState: '网络状态',
  accessWifiState: 'Wi-Fi 状态',
  changeWifiMulticastState: '组播权限'
}

export function evaluateDiagnostics(input) {
  const checks = [
    checkNativePlugin(input),
    checkLocalIP(input),
    checkDiscoveryTargets(input),
    checkPermission('internet', input, '缺少网络访问权限，应用无法连接局域网设备。'),
    checkPermission('accessNetworkState', input, '无法读取网络状态，修复页可能无法判断当前 Wi-Fi。'),
    checkPermission('accessWifiState', input, '无法读取 Wi-Fi 信息，自动发现准确性会下降。'),
    checkPermission('changeWifiMulticastState', input, 'UDP 组播可能被系统拦截；仍可使用手动 IP 或 TCP 扫描。', 'warning'),
    checkSocket('udp', input, 'UDP 12345 未监听，自动发现不可用。'),
    checkSocket('tcp', input, 'TCP 12346 未监听，文件传输和 TCP 发现不可用。'),
    checkSocket('ws', input, 'WebSocket 12347 未监听，聊天不可用。')
  ]

  const status = summarizeStatus(checks)
  return {
    status,
    summary: createSummary(status),
    generatedAt: Date.now(),
    localIPs: input.localIPs || [],
    discoveryTargets: input.discoveryTargets || [],
    checks
  }
}

function checkNativePlugin(input) {
  if (input.pluginAvailable) {
    return ok('native-plugin', '原生网络插件', '已加载 linchuan-network 插件。')
  }
  return error(
    'native-plugin',
    '原生网络插件',
    '当前环境没有加载 linchuan-network 插件。',
    '请使用 Android App 端运行，并确认 uni_modules/linchuan-network 已随包构建。'
  )
}

function checkLocalIP(input) {
  const localIPs = input.localIPs || []
  if (localIPs.some((ip) => /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(ip))) {
    return ok('local-ip', '局域网 IP', `检测到 ${localIPs.join('、')}。`)
  }
  return error(
    'local-ip',
    '局域网 IP',
    '没有检测到可用的 IPv4 局域网地址。',
    '请确认手机和电脑连接到同一个 Wi-Fi，并关闭会隔离局域网的 VPN。'
  )
}

function checkDiscoveryTargets(input) {
  const targets = input.discoveryTargets || []
  if (targets.includes('224.0.0.167')) {
    return ok('discovery-targets', '发现目标', '已包含邻传组播地址和广播目标。')
  }
  if (targets.length > 0) {
    return warning(
      'discovery-targets',
      '发现目标',
      '未包含组播地址，但可尝试广播或手动 IP 发现。',
      '如果自动发现失败，请在设备页输入电脑 IP 连接。'
    )
  }
  return error(
    'discovery-targets',
    '发现目标',
    '没有可用的发现目标。',
    '请确认 Wi-Fi 可用后重启移动端网络服务。'
  )
}

function checkPermission(permission, input, detail, failureStatus = 'error') {
  const granted = input.permissions?.[permission]
  if (granted) {
    return ok(`permission-${permission}`, PERMISSION_LABELS[permission], '权限已授予。')
  }
  const factory = failureStatus === 'warning' ? warning : error
  const id = permission === 'changeWifiMulticastState'
    ? 'multicast-permission'
    : `permission-${permission}`
  return factory(
    id,
    PERMISSION_LABELS[permission],
    detail,
    '请检查 AndroidManifest 权限和系统应用权限设置。'
  )
}

function checkSocket(socketName, input, detail) {
  if (input.sockets?.[socketName]) {
    return ok(`${socketName}-port`, `${socketName.toUpperCase()} 服务`, '端口监听正常。')
  }
  return error(
    `${socketName}-port`,
    `${socketName.toUpperCase()} 服务`,
    detail,
    '请关闭占用端口的应用，或重启邻传移动端网络服务。'
  )
}

function summarizeStatus(checks) {
  if (checks.some((check) => check.status === 'error')) return 'error'
  if (checks.some((check) => check.status === 'warning')) return 'warning'
  return 'ok'
}

function createSummary(status) {
  if (status === 'ok') return '网络自检通过，可以发现设备、聊天和传输文件。'
  if (status === 'warning') return '发现可能受限，但手动 IP 或 TCP 探测仍可能可用。'
  return '网络自检发现阻断项，请按建议修复后重试。'
}

function ok(id, title, detail) {
  return { id, title, status: 'ok', detail }
}

function warning(id, title, detail, suggestion = '') {
  return compact({ id, title, status: 'warning', detail, suggestion })
}

function error(id, title, detail, suggestion = '') {
  return compact({ id, title, status: 'error', detail, suggestion })
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value))
}
