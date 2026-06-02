<template>
  <div class="file-library-page">
    <div class="page-header">
      <h2>文件库</h2>
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索文件..."
          prefix-icon="Search"
          clearable
          style="width: 240px"
        />
        <el-select v-model="filterType" placeholder="文件类型" clearable style="width: 120px">
          <el-option label="全部" value="" />
          <el-option label="图片" value="image" />
          <el-option label="文档" value="document" />
          <el-option label="视频" value="video" />
          <el-option label="音频" value="audio" />
        </el-select>
      </div>
    </div>

    <div class="file-grid">
      <div
        v-for="file in files"
        :key="file.id"
        class="file-card"
        @click="handleOpen(file)"
        @contextmenu.prevent="showContextMenu($event, file)"
      >
        <div class="file-icon">
          <el-icon :size="32"><Document /></el-icon>
        </div>
        <div class="file-info">
          <span class="file-name">{{ file.fileName }}</span>
          <span class="file-meta">{{ formatSize(file.fileSize) }} · {{ formatDate(file.completedAt) }}</span>
        </div>
      </div>

      <el-empty v-if="files.length === 0" description="暂无文件" />
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="menu-item" @click="handleOpen(contextMenu.file!)">打开</div>
      <div class="menu-item" @click="handleOpenDir(contextMenu.file!)">打开目录</div>
      <div class="menu-item danger" @click="handleDelete(contextMenu.file!)">删除</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Document } from '@element-plus/icons-vue'
import type { TransferTask } from '@/types'

const files = ref<TransferTask[]>([])
const searchQuery = ref('')
const filterType = ref('')

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  file: null as TransferTask | null
})

onMounted(() => {
  fetchFiles()
})

watch([searchQuery, filterType], () => {
  fetchFiles()
})

async function fetchFiles() {
  files.value = await window.electronAPI.getFiles(filterType.value || undefined, searchQuery.value || undefined) as TransferTask[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function handleOpen(file: TransferTask) {
  if (file.filePath) {
    window.electronAPI.openFile(file.filePath)
  }
  contextMenu.value.visible = false
}

function handleOpenDir(file: TransferTask) {
  if (file.filePath) {
    window.electronAPI.openFileDir(file.filePath)
  }
  contextMenu.value.visible = false
}

function handleDelete(_file: TransferTask) {
  // TODO: 实现删除功能
  contextMenu.value.visible = false
}

function showContextMenu(event: MouseEvent, file: TransferTask) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    file
  }

  // 点击其他地方关闭菜单
  document.addEventListener('click', closeContextMenu, { once: true })
}

function closeContextMenu() {
  contextMenu.value.visible = false
}
</script>

<style scoped>
.file-library-page {
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
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 20px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.file-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

.file-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.2s;
}

.file-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.file-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ecf5ff;
  border-radius: 8px;
  color: #409eff;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.file-meta {
  font-size: 11px;
  color: #909399;
}

.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-item.danger {
  color: #f56c6c;
}
</style>
