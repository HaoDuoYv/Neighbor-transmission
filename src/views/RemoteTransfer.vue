<template>
  <div class="page remote-transfer-page">
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
.webview-container {
  flex: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  box-shadow: var(--shadow-xs);
}

.webview {
  width: 100%;
  height: 100%;
}
</style>
