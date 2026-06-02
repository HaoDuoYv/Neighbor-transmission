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
  background: var(--bg-card);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
  cursor: pointer;
}

.device-card:hover {
  border-color: var(--accent-color);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.device-card.online {
  border-left: 3px solid var(--success);
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
  background: var(--text-secondary);
  border: 2px solid var(--bg-card);
}

.status-dot.online {
  background: var(--success);
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.5);
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-ip {
  font-size: 12px;
  color: var(--text-secondary);
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
