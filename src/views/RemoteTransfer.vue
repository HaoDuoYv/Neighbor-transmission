<template>
  <div class="page remote-transfer-page">
    <div class="page-header">
      <h2>远程传输</h2>
      <el-button @click="openInBrowser">
        <el-icon><Link /></el-icon>
        在浏览器中打开
      </el-button>
    </div>

    <div class="webview-container" ref="containerRef">
      <webview
        ref="webviewRef"
        src="https://filehelper.weixin.qq.com/"
        class="webview"
        :style="{ height: webviewHeight + 'px' }"
        allowpopups
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Link } from '@element-plus/icons-vue'

const containerRef = ref<HTMLElement | null>(null)
const webviewRef = ref<HTMLElement | null>(null)
const webviewHeight = ref(600)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        webviewHeight.value = entry.contentRect.height
      }
    })
    observer.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
})

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
  position: relative;
}

.webview {
  width: 100%;
  border: none;
}
</style>
