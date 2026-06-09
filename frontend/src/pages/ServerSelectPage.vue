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
  <div class="min-h-screen flex items-center justify-center bg-[#0a0a12] relative overflow-hidden">
    <!-- 背景光效 -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]"></div>
      <div class="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[120px]"></div>
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
    <div v-else class="relative z-10 w-full max-w-md px-4">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h1 class="text-xl font-bold text-white">WebSocket Chat</h1>
        <p class="text-gray-500 text-sm mt-1">连接服务器开始聊天</p>
      </div>

      <!-- 上次连接 -->
      <button
        v-if="lastServer && mode === 'choose'"
        @click="connectToServer(lastServer.ip, lastServer.port, lastServer.alias)"
        :disabled="isConnecting"
        class="w-full mb-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-all text-left group"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-400">
                <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium text-white">{{ lastServer.alias }}</div>
              <div class="text-xs text-gray-500">{{ lastServer.ip }}:{{ lastServer.port }}</div>
            </div>
          </div>
          <span class="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">连接</span>
        </div>
      </button>

      <!-- 选择模式 -->
      <div v-if="mode === 'choose'" class="space-y-3">
        <!-- 创建服务器 -->
        <button
          v-if="isElectron()"
          @click="mode = 'create'"
          class="w-full p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left group"
        >
          <div class="flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-indigo-500/30 group-hover:to-purple-500/30 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-400">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium text-white">创建服务器</div>
              <div class="text-xs text-gray-500 mt-0.5">以本机作为服务器，局域网内可被发现</div>
            </div>
          </div>
        </button>

        <!-- 加入服务器 -->
        <button
          @click="startJoinMode"
          class="w-full p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left group"
        >
          <div class="flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center group-hover:from-emerald-500/30 group-hover:to-teal-500/30 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-400">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium text-white">加入服务器</div>
              <div class="text-xs text-gray-500 mt-0.5">搜索局域网服务器或手动输入地址</div>
            </div>
          </div>
        </button>

        <!-- Web 模式提示 -->
        <div v-if="!isElectron()" class="text-center pt-2">
          <p class="text-xs text-gray-600">Web 模式将连接当前页面所在的服务器</p>
        </div>
      </div>

      <!-- 创建服务器 -->
      <div v-if="mode === 'create'" class="space-y-4">
        <button @click="goBack" class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回
        </button>

        <div class="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <h2 class="text-base font-semibold text-white mb-1">创建服务器</h2>
          <p class="text-xs text-gray-500 mb-5">你的电脑将作为服务器，同一局域网内的用户可以搜索并加入</p>

          <label class="block mb-1.5 text-xs text-gray-400">服务器名称</label>
          <input
            v-model="serverName"
            :placeholder="`${getHostname()}的服务器`"
            class="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            @keydown.enter="createServer"
          />
          <p class="text-xs text-gray-600 mt-1.5">其他用户将在局域网列表中看到此名称</p>

          <button
            @click="createServer"
            :disabled="isStarting"
            class="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
          >
            {{ isStarting ? '正在启动...' : '创建并启动' }}
          </button>
        </div>
      </div>

      <!-- 加入服务器 -->
      <div v-if="mode === 'join'" class="space-y-4">
        <button @click="stopJoinAndGoBack" class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回
        </button>

        <!-- 局域网服务器 -->
        <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div class="px-5 py-3.5 flex items-center justify-between border-b border-white/[0.04]">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full" :class="isScanning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'"></div>
              <span class="text-sm font-medium text-gray-300">局域网服务器</span>
            </div>
            <button @click="scanServers" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              {{ isScanning ? '扫描中...' : '刷新' }}
            </button>
          </div>

          <div v-if="servers.length > 0" class="divide-y divide-white/[0.04]">
            <button
              v-for="server in servers"
              :key="`${server.ip}:${server.port}`"
              @click="connectToServer(server.ip, server.port, server.alias)"
              :disabled="isConnecting"
              class="w-full px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-400">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
                  </svg>
                </div>
                <div>
                  <div class="text-sm font-medium text-white">{{ server.alias }}</div>
                  <div class="text-xs text-gray-500">{{ server.ip }}:{{ server.port }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">{{ server.userCount }} 人</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-600"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </button>
          </div>

          <div v-else class="px-5 py-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto text-gray-700 mb-2">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <p class="text-sm text-gray-600">未发现局域网服务器</p>
            <p class="text-xs text-gray-700 mt-1">请确认服务器已启动且在同一网络</p>
          </div>
        </div>

        <!-- 手动连接 -->
        <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
            <span class="text-sm font-medium text-gray-300">手动连接</span>
          </div>
          <div class="flex gap-2">
            <input
              v-model="manualIp"
              placeholder="IP 地址"
              class="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
            <input
              v-model="manualPort"
              placeholder="端口"
              class="w-20 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
            <button
              @click="connectManual"
              :disabled="!manualIp || isConnecting"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-400 hover:to-purple-500 disabled:opacity-40 transition-all"
            >
              连接
            </button>
          </div>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMsg" class="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
        {{ errorMsg }}
      </div>
    </div>
  </div>
</template>

<style scoped>
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
</style>
