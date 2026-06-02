<template>
  <div class="remote-transfer-page">
    <div class="page-header">
      <h2>远程传输</h2>
      <el-button @click="openInBrowser">
        <el-icon><Link /></el-icon>
        在浏览器中打开
      </el-button>
    </div>

    <div class="webview-container">
      <webview
        src="https://filehelper.weixin.qq.com/"
        class="webview"
        :style="{ height: '100%' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Link } from '@element-plus/icons-vue'

function openInBrowser() {
  window.electronAPI.openFile('https://filehelper.weixin.qq.com/')
}
</script>

<style scoped>
.remote-transfer-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  font-size: 20px;
  color: #303133;
}

.webview-container {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.webview {
  width: 100%;
  height: 100%;
}
</style>
