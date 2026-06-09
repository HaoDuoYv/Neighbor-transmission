<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { setServerBaseUrl, isElectron } from '@/api/server-config'
import { getDiscoveredServers, startLocalServer, type DiscoveredServer } from '@/api/discovery'

const router = useRouter()

// 状态
const mode = ref<'choose' | 'create' | 'join'>('choose')
const servers = ref<DiscoveredServer[]>([])
const manualIp = ref('')
const manualPort = ref('8081')
const serverName = ref('')
const isScanning = ref(false)
const isConnecting = ref(false)
const isStarting = ref(false)
const errorMsg = ref('')
const lastServer = ref<{ ip: string; port: number; alias: string } | null>(null)
const startupSteps = ['检查上次连接', '启动本机服务', '准备进入登录']
const startupStepIndex = ref(0)
const startupStatusText = computed(() => startupSteps[startupStepIndex.value])

let scanTimer: ReturnType<typeof setInterval> | null = null
let startupStatusTimer: ReturnType<typeof setInterval> | null = null

function startStartupStatusTimer() {
  startupStepIndex.value = 0
  if (startupStatusTimer) clearInterval(startupStatusTimer)
  startupStatusTimer = setInterval(() => {
    startupStepIndex.value = (startupStepIndex.value + 1) % startupSteps.length
  }, 1500)
}

function stopStartupStatusTimer() {
  if (startupStatusTimer) {
    clearInterval(startupStatusTimer)
    startupStatusTimer = null
  }
}

onMounted(async () => {
  if (isElectron()) {
    await autoStartAndRedirect()
    return
  }

  // Web 模式：使用当前页面所在服务器
  const protocol = window.location.protocol
  const host = window.location.host
  setServerBaseUrl(`${protocol}//${host}`)

  const saved = localStorage.getItem('lastServer')
  if (saved) {
    try {
      lastServer.value = JSON.parse(saved)
    } catch {}
  }
})

onUnmounted(() => {
  if (scanTimer) clearInterval(scanTimer)
  stopStartupStatusTimer()
})

async function autoStartAndRedirect() {
  isStarting.value = true
  startStartupStatusTimer()
  errorMsg.value = ''

  try {
    // 先尝试连接上次的服务器
    const saved = localStorage.getItem('lastServer')
    if (saved) {
      try {
        const last = JSON.parse(saved)
        const url = `http://${last.ip}:${last.port}`
        const res = await fetch(`${url}/api/discovery/health`, { signal: AbortSignal.timeout(2000) })
        if (res.ok) {
          setServerBaseUrl(url)
          stopStartupStatusTimer()
          router.replace('/login')
          return
        }
      } catch {}
    }

    // 尝试 localhost:8081
    try {
      const res = await fetch('http://localhost:8081/api/discovery/health', { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        setServerBaseUrl('http://localhost:8081')
        localStorage.setItem('lastServer', JSON.stringify({ ip: 'localhost', port: 8081, alias: '本机服务器' }))
        stopStartupStatusTimer()
        router.replace('/login')
        return
      }
    } catch {}

    // 自动连接失败，显示选择界面
    isStarting.value = false
    stopStartupStatusTimer()
    const savedLast = localStorage.getItem('lastServer')
    if (savedLast) {
      try { lastServer.value = JSON.parse(savedLast) } catch {}
    }
    await scanServers()
    scanTimer = setInterval(scanServers, 5000)
  } catch {
    isStarting.value = false
    stopStartupStatusTimer()
    await scanServers()
    scanTimer = setInterval(scanServers, 5000)
  }
}

async function scanServers() {
  isScanning.value = true
  try {
    servers.value = await getDiscoveredServers()
  } catch {}
  isScanning.value = false
}

async function connectToServer(ip: string, port: number, alias?: string) {
  isConnecting.value = true
  errorMsg.value = ''
  const url = `http://${ip}:${port}`

  try {
    const res = await fetch(`${url}/api/discovery/health`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) throw new Error('Server not healthy')

    setServerBaseUrl(url)
    localStorage.setItem('lastServer', JSON.stringify({ ip, port, alias: alias || `${ip}:${port}` }))
    router.push('/login')
  } catch {
    errorMsg.value = `无法连接到 ${ip}:${port}`
  }
  isConnecting.value = false
}

async function connectManual() {
  const port = parseInt(manualPort.value) || 8081
  await connectToServer(manualIp.value, port)
}

async function createServer() {
  const name = serverName.value.trim() || `${getHostname()}的服务器`
  isStarting.value = true
  startStartupStatusTimer()
  errorMsg.value = ''

  try {
    const result = await startLocalServer(name)
    if (result.success) {
      const port = result.port || 8081
      setServerBaseUrl(`http://localhost:${port}`)
      localStorage.setItem('lastServer', JSON.stringify({ ip: 'localhost', port, alias: name }))
      router.push('/login')
    } else {
      errorMsg.value = result.error || '启动服务器失败'
    }
  } catch (e: any) {
    errorMsg.value = e.message || '启动服务器失败'
  }
  stopStartupStatusTimer()
  isStarting.value = false
}

function getHostname(): string {
  try { return window.location.hostname || '本地' } catch { return '本地' }
}

function goBack() {
  mode.value = 'choose'
  errorMsg.value = ''
}

function startJoinMode() {
  mode.value = 'join'
  scanServers()
  scanTimer = setInterval(scanServers, 5000)
}

function stopJoinAndGoBack() {
  if (scanTimer) {
    clearInterval(scanTimer)
    scanTimer = null
  }
  goBack()
}
</script>

<template>
  <div class="server-select-screen min-h-screen flex items-center justify-center bg-[#070912] relative overflow-hidden px-4 py-8">
    <!-- 背景光效 -->
    <div class="connection-bg absolute inset-0 pointer-events-none">
      <div class="connection-grid"></div>
      <div class="connection-scan"></div>
      <div class="absolute top-[12%] left-[18%] w-[420px] h-[420px] bg-cyan-500/10 rounded-full blur-[130px]"></div>
      <div class="absolute bottom-[8%] right-[14%] w-[520px] h-[520px] bg-indigo-500/12 rounded-full blur-[150px]"></div>
      <div class="absolute top-[45%] left-[52%] w-[340px] h-[340px] bg-emerald-500/8 rounded-full blur-[120px]"></div>
    </div>

    <!-- 启动中 -->
    <div v-if="isStarting && !isConnecting" class="startup-shell relative z-10 w-full max-w-sm px-6 text-center">
      <div class="startup-mark mx-auto">
        <div class="startup-orbit startup-orbit-one">
          <span></span>
        </div>
        <div class="startup-orbit startup-orbit-two">
          <span></span>
        </div>
        <div class="startup-orbit startup-orbit-three">
          <span></span>
        </div>
        <div class="startup-core">
          <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <path d="M8 10h8"/>
            <path d="M8 14h5"/>
          </svg>
        </div>
      </div>

      <div class="mt-8">
        <p class="text-[11px] font-medium uppercase tracking-[0.35em] text-white/35">Local service</p>
        <h1 class="mt-3 text-2xl font-semibold tracking-wide text-white">WebSocket Chat</h1>
        <p class="mt-3 min-h-[1.25rem] text-sm text-white/70">{{ startupStatusText }}</p>
        <p class="mt-1 text-xs text-white/35">正在准备聊天环境，请稍候</p>
      </div>

      <div class="startup-progress mt-8">
        <span></span>
      </div>
    </div>

    <!-- 主界面 -->
    <div v-else class="connection-panel relative z-10 w-full max-w-[520px]">
      <!-- Logo -->
      <div class="panel-header flex items-start gap-4">
        <div class="connection-logo flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl font-semibold text-white">WebSocket Chat</h1>
            <span class="status-badge">服务连接</span>
          </div>
          <p class="mt-2 text-sm leading-6 text-slate-400">选择服务器，进入聊天工作区</p>
        </div>
      </div>

      <!-- 上次连接 -->
      <button
        v-if="lastServer && mode === 'choose'"
        @click="connectToServer(lastServer.ip, lastServer.port, lastServer.alias)"
        :disabled="isConnecting"
        class="server-action-card primary-action-card group"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-3">
            <div class="action-icon action-icon-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-400">
                <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
              </svg>
            </div>
            <div class="min-w-0">
              <div class="text-[11px] font-medium uppercase tracking-[0.22em] text-indigo-200/60">继续连接</div>
              <div class="mt-1 truncate text-sm font-semibold text-white">{{ lastServer.alias }}</div>
              <div class="mt-0.5 text-xs text-slate-400">{{ lastServer.ip }}:{{ lastServer.port }}</div>
            </div>
          </div>
          <span class="action-arrow">连接</span>
        </div>
      </button>

      <!-- 选择模式 -->
      <div v-if="mode === 'choose'" class="space-y-3">
        <!-- 创建服务器 -->
        <button
          v-if="isElectron()"
          @click="mode = 'create'"
          class="server-action-card group"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex min-w-0 items-center gap-4">
            <div class="action-icon action-icon-indigo">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-400">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-medium text-white">创建服务器</div>
              <div class="mt-1 text-xs leading-5 text-slate-400">以本机作为服务器，局域网内可被发现</div>
            </div>
            </div>
            <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </button>

        <!-- 加入服务器 -->
        <button
          @click="startJoinMode"
          class="server-action-card group"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex min-w-0 items-center gap-4">
            <div class="action-icon action-icon-green">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-400">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-medium text-white">加入服务器</div>
              <div class="mt-1 text-xs leading-5 text-slate-400">搜索局域网服务器或手动输入地址</div>
            </div>
            </div>
            <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </button>

        <!-- Web 模式提示 -->
        <div v-if="!isElectron()" class="web-mode-note">
          <p>Web 模式将连接当前页面所在的服务器</p>
        </div>
      </div>

      <!-- 创建服务器 -->
      <div v-if="mode === 'create'" class="space-y-4">
        <button @click="goBack" class="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回
        </button>

        <div class="sub-panel">
          <h2 class="text-base font-semibold text-white">创建服务器</h2>
          <p class="mb-5 mt-2 text-xs leading-5 text-slate-400">你的电脑将作为服务器，同一局域网内的用户可以搜索并加入</p>

          <label class="field-label">服务器名称</label>
          <input
            v-model="serverName"
            :placeholder="`${getHostname()}的服务器`"
            class="connection-input"
            @keydown.enter="createServer"
          />
          <p class="mt-2 text-xs text-slate-500">其他用户将在局域网列表中看到此名称</p>

          <button
            @click="createServer"
            :disabled="isStarting"
            class="primary-button mt-5"
          >
            {{ isStarting ? '正在启动...' : '创建并启动' }}
          </button>
        </div>
      </div>

      <!-- 加入服务器 -->
      <div v-if="mode === 'join'" class="space-y-4">
        <button @click="stopJoinAndGoBack" class="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回
        </button>

        <!-- 局域网服务器 -->
        <div class="sub-panel overflow-hidden p-0">
          <div class="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full" :class="isScanning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'"></div>
              <span class="text-sm font-medium text-slate-200">局域网服务器</span>
            </div>
            <button @click="scanServers" class="refresh-button">
              {{ isScanning ? '扫描中...' : '刷新' }}
            </button>
          </div>

          <div v-if="servers.length > 0" class="divide-y divide-white/[0.05]">
            <button
              v-for="server in servers"
              :key="`${server.ip}:${server.port}`"
              @click="connectToServer(server.ip, server.port, server.alias)"
              :disabled="isConnecting"
              class="server-row"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div class="action-icon-small">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-400">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium text-white">{{ server.alias }}</div>
                  <div class="text-xs text-slate-500">{{ server.ip }}:{{ server.port }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500">{{ server.userCount }} 人</span>
                <svg class="text-slate-600" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </button>
          </div>

          <div v-else class="empty-state px-5 py-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto mb-3 text-slate-600">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <p class="text-sm text-slate-400">未发现局域网服务器</p>
            <p class="mt-1 text-xs text-slate-600">请确认服务器已启动且在同一网络</p>
          </div>
        </div>

        <!-- 手动连接 -->
        <div class="sub-panel">
          <div class="mb-4 flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
            <span class="text-sm font-medium text-slate-200">手动连接</span>
          </div>
          <div class="grid gap-2 sm:grid-cols-[1fr_88px_auto]">
            <input
              v-model="manualIp"
              placeholder="IP 地址"
              class="connection-input"
            />
            <input
              v-model="manualPort"
              placeholder="端口"
              class="connection-input sm:px-3"
            />
            <button
              @click="connectManual"
              :disabled="!manualIp || isConnecting"
              class="primary-button sm:w-auto"
            >
              连接
            </button>
          </div>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMsg" class="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
        {{ errorMsg }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.server-select-screen {
  font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
}

.connection-bg {
  background:
    radial-gradient(circle at 50% 0%, rgba(148, 163, 184, 0.12), transparent 32%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.25), rgba(2, 6, 23, 0.78));
}

.connection-grid {
  position: absolute;
  inset: 0;
  opacity: 0.34;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(circle at center, black, transparent 72%);
}

.connection-scan {
  position: absolute;
  left: -10%;
  right: -10%;
  top: 18%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(125, 211, 252, 0.68), transparent);
  box-shadow: 0 0 28px rgba(125, 211, 252, 0.34);
  animation: connection-scan 4.8s ease-in-out infinite;
}

.connection-panel {
  padding: 26px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.82), rgba(7, 12, 24, 0.9)),
    rgba(15, 23, 42, 0.78);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.44),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(22px);
  animation: panel-enter 480ms ease-out both;
}

.panel-header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.connection-logo {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background:
    linear-gradient(145deg, rgba(99, 102, 241, 0.9), rgba(14, 165, 233, 0.72)),
    #4f46e5;
  box-shadow: 0 18px 46px rgba(56, 189, 248, 0.22);
}

.status-badge {
  padding: 4px 8px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  border-radius: 999px;
  color: rgba(186, 230, 253, 0.82);
  background: rgba(14, 165, 233, 0.08);
  font-size: 11px;
  line-height: 1;
}

.server-action-card {
  position: relative;
  width: 100%;
  min-height: 76px;
  overflow: hidden;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.045);
  text-align: left;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.server-action-card::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0;
  background: linear-gradient(105deg, transparent 20%, rgba(255, 255, 255, 0.08), transparent 78%);
  transform: translateX(-36%);
  transition: opacity 180ms ease, transform 360ms ease;
}

.server-action-card:hover {
  transform: translateY(-1px);
  border-color: rgba(125, 211, 252, 0.28);
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.3);
}

.server-action-card:hover::before {
  opacity: 1;
  transform: translateX(32%);
}

.server-action-card:disabled {
  cursor: wait;
  opacity: 0.72;
}

.primary-action-card {
  margin-bottom: 14px;
  border-color: rgba(129, 140, 248, 0.34);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(14, 165, 233, 0.08)),
    rgba(255, 255, 255, 0.055);
}

.action-icon,
.action-icon-small {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 180ms ease, background 180ms ease;
}

.action-icon {
  width: 46px;
  height: 46px;
  border-radius: 15px;
}

.action-icon-small {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.1);
}

.action-icon-primary,
.action-icon-indigo {
  background: linear-gradient(145deg, rgba(99, 102, 241, 0.22), rgba(59, 130, 246, 0.08));
}

.action-icon-green {
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.08));
}

.server-action-card:hover .action-icon {
  transform: scale(1.04);
}

.action-arrow {
  flex-shrink: 0;
  padding: 7px 11px;
  border-radius: 999px;
  color: #c7d2fe;
  background: rgba(129, 140, 248, 0.12);
  font-size: 12px;
  transition: transform 180ms ease, background 180ms ease;
}

.primary-action-card:hover .action-arrow {
  transform: translateX(2px);
  background: rgba(129, 140, 248, 0.2);
}

.card-chevron {
  flex-shrink: 0;
  color: rgba(148, 163, 184, 0.5);
  transition: transform 180ms ease, color 180ms ease;
}

.server-action-card:hover .card-chevron {
  color: rgba(226, 232, 240, 0.84);
  transform: translateX(3px);
}

.web-mode-note {
  padding-top: 10px;
  color: rgba(100, 116, 139, 0.9);
  font-size: 12px;
  text-align: center;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(148, 163, 184, 0.84);
  font-size: 14px;
  transition: color 160ms ease, transform 160ms ease;
}

.back-button:hover {
  color: #e2e8f0;
  transform: translateX(-2px);
}

.sub-panel {
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.045);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.field-label {
  display: block;
  margin-bottom: 8px;
  color: rgba(203, 213, 225, 0.82);
  font-size: 12px;
}

.connection-input {
  width: 100%;
  min-height: 44px;
  padding: 11px 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 13px;
  color: white;
  background: rgba(2, 6, 23, 0.34);
  font-size: 14px;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.connection-input::placeholder {
  color: rgba(100, 116, 139, 0.95);
}

.connection-input:focus {
  border-color: rgba(125, 211, 252, 0.46);
  background: rgba(2, 6, 23, 0.48);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.primary-button {
  width: 100%;
  min-height: 44px;
  padding: 11px 18px;
  border-radius: 13px;
  color: white;
  background: linear-gradient(135deg, #4f46e5, #0891b2);
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 16px 34px rgba(8, 145, 178, 0.18);
  transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
}

.primary-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
  transform: none;
}

.refresh-button {
  padding: 5px 9px;
  border-radius: 999px;
  color: rgba(148, 163, 184, 0.86);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  transition: color 160ms ease, background 160ms ease;
}

.refresh-button:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.08);
}

.server-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 20px;
  text-align: left;
  transition: background 160ms ease;
}

.server-row:hover {
  background: rgba(255, 255, 255, 0.055);
}

.empty-state {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.05), rgba(15, 23, 42, 0.16));
}

.startup-shell {
  animation: startup-enter 520ms ease-out both;
}

.startup-mark {
  position: relative;
  width: 132px;
  height: 132px;
}

.startup-core {
  position: absolute;
  inset: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.startup-orbit {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  animation: startup-orbit 3.6s linear infinite;
}

.startup-orbit span {
  position: absolute;
  left: 50%;
  top: -4px;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 999px;
  background: #f8fafc;
  box-shadow: 0 0 22px rgba(248, 250, 252, 0.72);
}

.startup-orbit-two {
  inset: 12px;
  animation-duration: 4.8s;
  animation-direction: reverse;
}

.startup-orbit-two span {
  background: #22c55e;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.72);
}

.startup-orbit-three {
  inset: 24px;
  animation-duration: 2.9s;
}

.startup-orbit-three span {
  background: #60a5fa;
  box-shadow: 0 0 20px rgba(96, 165, 250, 0.72);
}

.startup-progress {
  height: 2px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.startup-progress span {
  display: block;
  width: 42%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.86), transparent);
  animation: startup-progress 1.6s ease-in-out infinite;
}

@keyframes startup-enter {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes startup-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes startup-progress {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(250%);
  }
}

@keyframes panel-enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes connection-scan {
  0%,
  100% {
    opacity: 0;
    transform: translateY(-60px);
  }
  20%,
  72% {
    opacity: 1;
  }
  50% {
    transform: translateY(360px);
  }
}

@media (max-width: 520px) {
  .connection-panel {
    padding: 20px;
    border-radius: 20px;
  }

  .panel-header {
    margin-bottom: 20px;
  }

  .server-action-card {
    padding: 14px;
  }
}
</style>
