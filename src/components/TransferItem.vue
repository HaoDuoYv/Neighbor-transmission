<template>
  <div class="transfer-item" :class="transfer.status">
    <div class="file-icon">
      <el-icon :size="24"><Document /></el-icon>
    </div>

    <div class="transfer-info">
      <div class="file-name">{{ transfer.fileName }}</div>
      <div class="transfer-meta">
        <span>{{ formatSize(transfer.fileSize) }}</span>
        <span v-if="transfer.status === 'transferring'">
          {{ formatSpeed(transfer.speed) }} · {{ formatProgress(transfer.progress) }}
        </span>
        <span v-else-if="transfer.status === 'completed'" class="success">已完成</span>
        <span v-else-if="transfer.status === 'failed'" class="error">失败</span>
        <span v-else-if="transfer.status === 'cancelled'" class="cancelled">已取消</span>
      </div>

      <el-progress
        v-if="transfer.status === 'transferring'"
        :percentage="Math.round(transfer.progress * 100)"
        :stroke-width="4"
        :show-text="false"
      />
    </div>

    <div class="transfer-actions">
      <el-button
        v-if="transfer.status === 'transferring'"
        type="danger"
        size="small"
        text
        @click="$emit('cancel', transfer.id)"
      >
        取消
      </el-button>
      <el-button
        v-if="transfer.status === 'completed'"
        type="primary"
        size="small"
        text
        @click="$emit('open', transfer)"
      >
        打开
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Document } from '@element-plus/icons-vue'
import type { TransferTask } from '@/types'

defineProps<{
  transfer: TransferTask
}>()

defineEmits<{
  cancel: [fileId: string]
  open: [transfer: TransferTask]
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function formatSpeed(bytesPerSec: number): string {
  return formatSize(bytesPerSec) + '/s'
}

function formatProgress(progress: number): string {
  return (progress * 100).toFixed(1) + '%'
}
</script>

<style scoped>
.transfer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eef0f4;
  transition: all 0.2s;
}

.transfer-item:hover {
  border-color: #d0d5dd;
}

.transfer-item.completed {
  border-left: 3px solid #10b981;
}

.transfer-item.failed {
  border-left: 3px solid #ef4444;
}

.transfer-item.transferring {
  border-left: 3px solid #4f6ef7;
}

.file-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 10px;
  color: #98a2b3;
}

.transfer-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1d29;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transfer-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #98a2b3;
  margin-top: 4px;
}

.transfer-meta .success {
  color: #10b981;
}

.transfer-meta .error {
  color: #ef4444;
}

.transfer-meta .cancelled {
  color: #f59e0b;
}

.transfer-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.transfer-item:hover .transfer-actions {
  opacity: 1;
}
</style>
