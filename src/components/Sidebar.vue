<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <span class="app-title">邻传</span>
    </div>

    <nav class="sidebar-nav">
      <router-link to="/devices" class="nav-item" active-class="active">
        <el-icon><Monitor /></el-icon>
        <span>设备</span>
      </router-link>

      <router-link to="/chat" class="nav-item" active-class="active">
        <el-icon><ChatDotRound /></el-icon>
        <span>聊天</span>
      </router-link>

      <router-link to="/transfer" class="nav-item" active-class="active">
        <el-icon><Upload /></el-icon>
        <span>传输</span>
      </router-link>

      <router-link to="/files" class="nav-item" active-class="active">
        <el-icon><FolderOpened /></el-icon>
        <span>文件</span>
      </router-link>

      <router-link to="/remote" class="nav-item" active-class="active">
        <el-icon><Link /></el-icon>
        <span>远程</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <router-link to="/settings" class="nav-item" active-class="active">
        <el-icon><Setting /></el-icon>
        <span>设置</span>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor, ChatDotRound, Upload, FolderOpened, Link, Setting } from '@element-plus/icons-vue'
</script>

<style scoped>
.sidebar {
  width: 80px;
  height: 100vh;
  background: #2c3e50;
  display: flex;
  flex-direction: column;
  user-select: none;
  -webkit-app-region: drag;
}

.sidebar-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 8px;
}

.app-title {
  color: #ecf0f1;
  font-size: 14px;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  gap: 4px;
}

.sidebar-footer {
  padding: 16px 0;
  border-top: 1px solid #34495e;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0;
  color: #95a5a6;
  text-decoration: none;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
}

.nav-item:hover {
  color: #ecf0f1;
  background: #34495e;
}

.nav-item.active {
  color: #3498db;
}

.nav-item .el-icon {
  font-size: 20px;
}

.nav-item span {
  font-size: 11px;
}
</style>
