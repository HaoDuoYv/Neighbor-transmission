<template>
  <div class="device-card" :class="{ online: device.isOnline }">
    <div class="device-avatar">
      <el-avatar :size="48" :src="device.avatar">
        {{ device.name.charAt(0) }}
      </el-avatar>
      <span class="status-dot" :class="{ online: device.isOnline }"></span>
    </div>

    <div class="device-info">
      <div class="device-name">{{ device.name }}</div>
      <div class="device-ip">{{ device.ip }}</div>
    </div>

    <div class="device-actions">
      <el-button-group>
        <el-button size="small" @click.stop="$emit('chat', device)">
          <el-icon><ChatDotRound /></el-icon>
        </el-button>
        <el-button size="small" @click.stop="$emit('sendFile', device)">
          <el-icon><Upload /></el-icon>
        </el-button>
        <el-button size="small" @click.stop="$emit('toggleFavorite', device)">
          <el-icon>
            <StarFilled v-if="device.isFavorite" />
            <Star v-else />
          </el-icon>
        </el-button>
      </el-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatDotRound, Upload, Star, StarFilled } from '@element-plus/icons-vue'
import type { Device } from '@/types'

defineProps<{
  device: Device
}>()

defineEmits<{
  chat: [device: Device]
  sendFile: [device: Device]
  toggleFavorite: [device: Device]
}>()
</script>

<style scoped>
.device-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  transition: all 0.2s;
  cursor: pointer;
}

.device-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.device-card.online {
  border-color: #67c23a;
}

.device-avatar {
  position: relative;
}

.status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #909399;
  border: 2px solid #fff;
}

.status-dot.online {
  background: #67c23a;
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-ip {
  font-size: 12px;
  color: #909399;
}

.device-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.device-card:hover .device-actions {
  opacity: 1;
}
</style>
