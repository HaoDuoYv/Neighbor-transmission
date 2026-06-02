<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="app-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
    </div>

    <nav class="sidebar-nav">
      <router-link to="/devices" class="nav-item" active-class="active" title="设备">
        <el-icon><Monitor /></el-icon>
      </router-link>

      <router-link to="/chat" class="nav-item" active-class="active" title="聊天">
        <el-icon><ChatDotRound /></el-icon>
      </router-link>

      <router-link to="/transfer" class="nav-item" active-class="active" title="传输">
        <el-icon><Upload /></el-icon>
      </router-link>

      <router-link to="/files" class="nav-item" active-class="active" title="文件">
        <el-icon><FolderOpened /></el-icon>
      </router-link>

      <router-link to="/remote" class="nav-item" active-class="active" title="远程">
        <el-icon><Link /></el-icon>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <router-link to="/settings" class="nav-item" active-class="active" title="设置">
        <el-icon><Setting /></el-icon>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor, ChatDotRound, Upload, FolderOpened, Link, Setting } from '@element-plus/icons-vue'
</script>

<style scoped>
.sidebar {
  width: 56px;
  height: 100vh;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  -webkit-app-region: drag;
  position: relative;
  z-index: 100;
  border-right: 1px solid var(--sidebar-border);
}

.sidebar-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: drag;
  width: 100%;
  padding-top: 4px;
}

.app-logo {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-color);
  opacity: 0.8;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
  width: 100%;
}

.sidebar-footer {
  padding: 8px 0;
  border-top: 1px solid var(--sidebar-border);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--text-tertiary);
  text-decoration: none;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
  border-radius: 10px;
}

.nav-item:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-item.active {
  color: var(--accent-color);
  background: var(--bg-active);
}

.nav-item .el-icon {
  font-size: 20px;
}
</style>
