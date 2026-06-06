<template>
  <div class="page device-list-page">
    <div class="page-header">
      <h2>设备</h2>
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索设备..."
          :prefix-icon="Search"
          clearable
          style="width: 220px"
        />
        <el-button plain @click="openRepairDialog">
          <el-icon><Tools /></el-icon>
          修复
        </el-button>
        <el-button type="primary" plain @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          手动添加
        </el-button>
      </div>
    </div>

    <div class="device-grid">
      <DeviceCard
        v-for="device in filteredDevices"
        :key="device.id"
        :device="device"
        @chat="handleChat"
        @send-file="handleSendFile"
        @toggle-favorite="handleToggleFavorite"
      />

      <el-empty v-if="filteredDevices.length === 0" description="暂未发现设备" />
    </div>

    <!-- 手动添加设备对话框 -->
    <el-dialog v-model="showAddDialog" title="手动添加设备" width="400px">
      <el-form label-width="80px" @submit.prevent="addDevice">
        <el-form-item label="IP 地址">
          <el-input v-model="manualIP" placeholder="例如 192.168.1.100" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addDevice" :loading="adding">
            发送探测
          </el-button>
        </el-form-item>
      </el-form>
      <div v-if="addResult" class="add-result" :class="addResult.type">
        {{ addResult.message }}
      </div>
    </el-dialog>

    <el-dialog v-model="showRepairDialog" title="网络修复自检" width="640px">
      <div class="repair-panel">
        <div v-if="diagnosticReport" class="diagnostic-summary" :class="diagnosticReport.status">
          <el-icon v-if="diagnosticReport.status === 'ok'"><CircleCheckFilled /></el-icon>
          <el-icon v-else-if="diagnosticReport.status === 'warning'"><WarningFilled /></el-icon>
          <el-icon v-else><CircleCloseFilled /></el-icon>
          <div>
            <div class="summary-title">{{ diagnosticReport.summary }}</div>
            <div class="summary-meta">
              {{ new Date(diagnosticReport.generatedAt).toLocaleString() }}
            </div>
          </div>
        </div>

        <el-alert
          v-else-if="diagnosticError"
          type="error"
          :closable="false"
          :title="diagnosticError"
          show-icon
        />

        <div v-else class="diagnostic-empty">
          点击自检后会检查局域网 IP、发现广播地址和 12345/12346/12347 端口状态。
        </div>

        <div v-if="diagnosticReport" class="network-facts">
          <div class="fact-row">
            <span class="fact-label">本机 IP</span>
            <div class="fact-tags">
              <el-tag v-for="ip in diagnosticReport.localIPs" :key="ip" size="small">
                {{ ip }}
              </el-tag>
              <span v-if="diagnosticReport.localIPs.length === 0" class="empty-text">未检测到</span>
            </div>
          </div>
          <div class="fact-row">
            <span class="fact-label">发现地址</span>
            <div class="fact-tags">
              <el-tag
                v-for="target in diagnosticReport.discoveryTargets"
                :key="target"
                size="small"
                type="info"
              >
                {{ target }}
              </el-tag>
            </div>
          </div>
        </div>

        <div v-if="diagnosticReport" class="check-list">
          <div
            v-for="check in diagnosticReport.checks"
            :key="check.id"
            class="check-item"
            :class="check.status"
          >
            <el-icon class="check-icon">
              <CircleCheckFilled v-if="check.status === 'ok'" />
              <WarningFilled v-else-if="check.status === 'warning'" />
              <CircleCloseFilled v-else />
            </el-icon>
            <div class="check-body">
              <div class="check-title-row">
                <span class="check-title">{{ check.title }}</span>
                <el-tag :type="getStatusTagType(check.status)" size="small">
                  {{ getStatusText(check.status) }}
                </el-tag>
              </div>
              <p>{{ check.detail }}</p>
              <p v-if="check.suggestion" class="check-suggestion">
                {{ check.suggestion }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showRepairDialog = false">关闭</el-button>
        <el-button type="primary" :loading="diagnosing" @click="runDiagnostics">
          <el-icon><Refresh /></el-icon>
          重新自检
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  CircleCheckFilled,
  CircleCloseFilled,
  Plus,
  Refresh,
  Search,
  Tools,
  WarningFilled
} from '@element-plus/icons-vue'
import { useDeviceStore } from '@/stores/device'
import DeviceCard from '@/components/DeviceCard.vue'
import type { Device, DiagnosticStatus, NetworkDiagnosticReport } from '@/types'

const router = useRouter()
const deviceStore = useDeviceStore()
const searchQuery = ref('')
const showAddDialog = ref(false)
const manualIP = ref('')
const adding = ref(false)
const addResult = ref<{ type: string; message: string } | null>(null)
const showRepairDialog = ref(false)
const diagnosing = ref(false)
const diagnosticReport = ref<NetworkDiagnosticReport | null>(null)
const diagnosticError = ref('')

const filteredDevices = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return deviceStore.devices.filter(d =>
    d.name.toLowerCase().includes(query) || d.ip.includes(query)
  )
})

onMounted(() => {
  deviceStore.fetchDevices()
})

function handleChat(device: Device) {
  deviceStore.setCurrentDevice(device.id)
  router.push(`/chat/${device.id}`)
}

async function handleSendFile(device: Device) {
  const filePaths = await window.electronAPI.selectFile()
  if (filePaths && filePaths.length > 0) {
    for (const filePath of filePaths) {
      await window.electronAPI.sendFile(filePath, device.ip, device.port)
    }
  }
}

function handleToggleFavorite(device: Device) {
  deviceStore.toggleFavorite(device.id)
}

function openRepairDialog() {
  showRepairDialog.value = true
  if (!diagnosticReport.value) {
    runDiagnostics()
  }
}

async function runDiagnostics() {
  diagnosing.value = true
  diagnosticError.value = ''
  try {
    diagnosticReport.value = await window.electronAPI.runNetworkDiagnostics()
  } catch (err) {
    diagnosticError.value = `自检失败: ${(err as Error).message || '无法读取网络状态'}`
  } finally {
    diagnosing.value = false
  }
}

function getStatusText(status: DiagnosticStatus) {
  const map: Record<DiagnosticStatus, string> = {
    ok: '通过',
    warning: '警告',
    error: '异常'
  }
  return map[status]
}

function getStatusTagType(status: DiagnosticStatus) {
  const map: Record<DiagnosticStatus, 'success' | 'warning' | 'danger'> = {
    ok: 'success',
    warning: 'warning',
    error: 'danger'
  }
  return map[status]
}

async function addDevice() {
  if (!manualIP.value.trim()) return
  adding.value = true
  addResult.value = null
  try {
    const result = await window.electronAPI.pingDevice(manualIP.value.trim())
    if (result.success) {
      addResult.value = { type: 'success', message: '探测包已发送，等待设备响应...' }
      setTimeout(() => {
        deviceStore.fetchDevices()
        showAddDialog.value = false
        manualIP.value = ''
      }, 2000)
    } else {
      addResult.value = { type: 'error', message: (result as any).error || '发送探测包失败' }
    }
  } catch (err) {
    addResult.value = { type: 'error', message: `发送失败: ${(err as Error).message || '请检查 IP 是否正确'}` }
  } finally {
    adding.value = false
  }
}
</script>

<style scoped>
.device-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
  overflow-y: auto;
  padding: 2px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.add-result {
  margin: 0 20px 20px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.add-result.success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.add-result.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
}

.repair-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.diagnostic-summary {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
}

.diagnostic-summary .el-icon {
  flex: 0 0 auto;
  font-size: 22px;
}

.diagnostic-summary.ok {
  border-color: rgba(16, 185, 129, 0.28);
  background: rgba(16, 185, 129, 0.08);
}

.diagnostic-summary.ok .el-icon {
  color: var(--success);
}

.diagnostic-summary.warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.09);
}

.diagnostic-summary.warning .el-icon {
  color: var(--warning);
}

.diagnostic-summary.error {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.08);
}

.diagnostic-summary.error .el-icon {
  color: var(--error);
}

.summary-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.summary-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

.diagnostic-empty {
  padding: 14px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  font-size: 13px;
}

.network-facts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
}

.fact-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}

.fact-label {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 24px;
}

.fact-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.empty-text {
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 24px;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 340px;
  overflow-y: auto;
  padding-right: 2px;
}

.check-item {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
}

.check-item.ok {
  border-color: rgba(16, 185, 129, 0.22);
}

.check-item.warning {
  border-color: rgba(245, 158, 11, 0.26);
}

.check-item.error {
  border-color: rgba(239, 68, 68, 0.26);
}

.check-icon {
  margin-top: 2px;
  font-size: 18px;
}

.check-item.ok .check-icon {
  color: var(--success);
}

.check-item.warning .check-icon {
  color: var(--warning);
}

.check-item.error .check-icon {
  color: var(--error);
}

.check-body {
  min-width: 0;
}

.check-title-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.check-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.check-body p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

.check-suggestion {
  margin-top: 6px !important;
  color: var(--text-primary) !important;
}
</style>
