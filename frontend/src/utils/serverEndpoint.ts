export function parseOptionalPort(value: string): number | undefined {
  const normalized = value.trim()
  if (!normalized) return undefined

  return parsePort(normalized)
}

export function parseRequiredPort(value: string, fallback: number): number {
  const normalized = value.trim()
  if (!normalized) return fallback

  return parsePort(normalized)
}

export function buildServerUrl(ip: string, port?: number): string {
  return `http://${formatServerAddress(ip, port)}`
}

export function formatServerAddress(ip: string, port?: number): string {
  return port === undefined ? ip : `${ip}:${port}`
}

function parsePort(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error('端口号必须是 1-65535 之间的数字')
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('端口号必须是 1-65535 之间的数字')
  }

  return port
}
