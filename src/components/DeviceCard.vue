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
  padding: 14px 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eef0f4;
  transition: all 0.2s;
  cursor: pointer;
}

.device-card:hover {
  border-color: #4f6ef7;
  box-shadow: 0 4px 12px rgba(79, 110, 247, 0.1);
  transform: translateY(-1px);
}

.device-card.online {
  border-left: 3px solid #10b981;
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
  background: #9ca3af;
  border: 2px solid #fff;
}

.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.5);
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1d29;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-ip {
  font-size: 12px;
  color: #98a2b3;
  margin-top: 2px;
}

.device-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.device-card:hover .device-actions {
  opacity: 1;
}
</style>
