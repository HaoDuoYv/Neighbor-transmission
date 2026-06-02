<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <img src="@/assets/logo.jpg" alt="邻传" class="logo" />
    </div>

    <nav class="sidebar-nav">
      <router-link to="/devices" class="nav-item" active-class="active" title="设备">
        <el-icon><Monitor /></el-icon>
        <span>设备</span>
      </router-link>

      <router-link to="/chat" class="nav-item" active-class="active" title="聊天">
        <el-icon><ChatDotRound /></el-icon>
        <span>聊天</span>
      </router-link>

      <router-link to="/transfer" class="nav-item" active-class="active" title="传输">
        <el-icon><Upload /></el-icon>
        <span>传输</span>
      </router-link>

      <router-link to="/files" class="nav-item" active-class="active" title="文件">
        <el-icon><FolderOpened /></el-icon>
        <span>文件</span>
      </router-link>

      <router-link to="/remote" class="nav-item" active-class="active" title="远程">
        <el-icon><Link /></el-icon>
        <span>远程</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <router-link to="/settings" class="nav-item" active-class="active" title="设置">
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
  width: 76px;
  height: 100vh;
  background: linear-gradient(180deg, #1a1d29 0%, #232738 100%);
  display: flex;
  flex-direction: column;
  user-select: none;
  -webkit-app-region: drag;
  position: relative;
  z-index: 100;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  -webkit-app-region: drag;
}

.logo {
  width: 48px;
  height: auto;
  border-radius: 10px;
  object-fit: contain;
  -webkit-app-region: no-drag;
  transition: transform 0.2s;
}

.logo:hover {
  transform: scale(1.05);
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  gap: 2px;
}

.sidebar-footer {
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 0;
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  color: #fff;
  background: rgba(79, 110, 247, 0.15);
  border-left-color: #4f6ef7;
}

.nav-item .el-icon {
  font-size: 20px;
}

.nav-item span {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
</style>
