<template>
  <div class="page settings-page">
    <div class="page-header">
      <h2>设置</h2>
    </div>

    <div class="settings-content">
      <el-card class="settings-section">
        <template #header>
          <span>基本信息</span>
        </template>

        <el-form label-width="100px">
          <el-form-item label="设备名称">
            <el-input v-model="settings.deviceName" placeholder="输入设备名称" />
          </el-form-item>
          <el-form-item label="IP 地址">
            <el-input :model-value="localIP" disabled>
              <template #append>
                <el-button @click="copyIP">复制</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="settings-section">
        <template #header>
          <span>文件存储</span>
        </template>

        <el-form label-width="100px">
          <el-form-item label="保存路径">
            <el-input v-model="settings.savePath" placeholder="选择保存路径">
              <template #append>
                <el-button @click="selectSavePath">浏览</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="settings-section">
        <template #header>
          <span>应用设置</span>
        </template>

        <el-form label-width="100px">
          <el-form-item label="开机自启">
            <el-switch v-model="settings.autoStart" />
          </el-form-item>

          <el-form-item label="主题">
            <el-radio-group v-model="settings.theme">
              <el-radio label="light">浅色</el-radio>
              <el-radio label="dark">深色</el-radio>
              <el-radio label="system">跟随系统</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="语言">
            <el-select v-model="settings.language" style="width: 120px">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="English" value="en" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <div class="settings-footer">
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const settings = ref({
  deviceName: '',
  savePath: '',
  autoStart: false,
  theme: 'light',
  language: 'zh-CN'
})

const localIP = ref('')

onMounted(async () => {
  const savedTheme = localStorage.getItem('linchuan-theme') || 'light'
  settings.value.theme = savedTheme

  try {
    const currentSettings = await window.electronAPI.getSettings()
    settings.value = { ...settings.value, ...currentSettings }
  } catch {
    console.warn('[Settings] 获取设置失败')
  }

  try {
    const info = await window.electronAPI.getDeviceInfo()
    localIP.value = info.localIP
  } catch {
    localIP.value = '无法获取'
  }
})

watch(() => settings.value.theme, (theme) => {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('linchuan-theme', theme)
})

function copyIP() {
  navigator.clipboard.writeText(localIP.value)
  ElMessage.success('IP 已复制')
}

async function selectSavePath() {
  // 使用系统对话框选择路径
}

async function saveSettings() {
  await window.electronAPI.setSavePath(settings.value.savePath)
  ElMessage.success('设置已保存')
}
</script>

<style scoped>
.settings-content {
  max-width: 560px;
}

.settings-content :deep(.el-card) {
  margin-bottom: 12px;
}

.settings-footer {
  margin-top: 16px;
}
</style>
