<template>
  <div class="app-container">
    <Sidebar />
    <div class="app-main">
      <div class="title-bar">
        <div class="title-bar-drag">
          <img src="@/assets/logo.jpg" class="title-logo" />
          <span class="title-text">邻传</span>
        </div>
        <div class="window-controls">
          <div class="win-btn" @click="minimize" title="最小化">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" fill="currentColor"/></svg>
          </div>
          <div class="win-btn" @click="maximize" title="最大化">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1"/></svg>
          </div>
          <div class="win-btn win-btn-close" @click="closeWindow" title="关闭">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.2"/></svg>
          </div>
        </div>
      </div>
      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '@/components/Sidebar.vue'

function minimize() {
  window.electronAPI?.minimizeWindow()
}
function maximize() {
  window.electronAPI?.maximizeWindow()
}
function closeWindow() {
  window.electronAPI?.closeWindow()
}
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f0f2f5;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  background: #1a1d29;
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.title-bar-drag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  -webkit-app-region: drag;
}

.title-logo {
  width: 20px;
  height: auto;
  border-radius: 4px;
  -webkit-app-region: no-drag;
}

.title-text {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.5px;
}

.window-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.win-btn {
  width: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.15s;
}

.win-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.win-btn-close:hover {
  background: #e81123;
  color: #fff;
}

.content-area {
  flex: 1;
  overflow: hidden;
}
</style>
