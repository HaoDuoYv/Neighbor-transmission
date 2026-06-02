<template>
  <div class="message-bubble" :class="{ own: isOwn, [message.type]: true }">
    <div class="bubble-content">
      <!-- 文字消息 -->
      <template v-if="message.type === 'text'">
        <p>{{ message.content }}</p>
      </template>

      <!-- 代码消息 -->
      <template v-else-if="message.type === 'code'">
        <pre><code>{{ message.content }}</code></pre>
      </template>

      <!-- 图片消息 -->
      <template v-else-if="message.type === 'image'">
        <img :src="message.content" alt="图片" @click="previewImage" />
      </template>

      <!-- 文件消息 -->
      <template v-else-if="message.type === 'file'">
        <div class="file-message" @click="openFile">
          <el-icon :size="32"><Document /></el-icon>
          <div class="file-info">
            <span class="file-name">{{ message.metadata?.fileName }}</span>
            <span class="file-size">{{ formatSize(message.metadata?.fileSize as number) }}</span>
          </div>
        </div>
      </template>

      <!-- 表情消息 -->
      <template v-else-if="message.type === 'emoji'">
        <span class="emoji">{{ message.content }}</span>
      </template>
    </div>

    <div class="bubble-meta">
      <span class="time">{{ formatTime(message.createdAt) }}</span>
      <span v-if="isOwn" class="status">
        <el-icon v-if="message.status === 'sending'" class="loading"><Loading /></el-icon>
        <el-icon v-else-if="message.status === 'sent'" class="success"><Check /></el-icon>
        <el-icon v-else-if="message.status === 'failed'" class="error"><Close /></el-icon>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Document, Loading, Check, Close } from '@element-plus/icons-vue'
import type { ChatMessage } from '@/types'

const props = defineProps<{
  message: ChatMessage
  currentDeviceId: string
}>()

const isOwn = computed(() => props.message.fromDevice === props.currentDeviceId)

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function previewImage() {
  // 预览图片
}

function openFile() {
  if (props.message.metadata?.filePath) {
    window.electronAPI.openFile(props.message.metadata.filePath as string)
  }
}
</script>

<style scoped>
.message-bubble {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  margin-bottom: 12px;
}

.message-bubble.own {
  align-self: flex-end;
  align-items: flex-end;
}

.bubble-content {
  padding: 10px 14px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.message-bubble.own .bubble-content {
  background: linear-gradient(135deg, #4f6ef7, #6c5ce7);
  color: #fff;
}

.bubble-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.bubble-content pre {
  margin: 0;
  padding: 8px;
  background: #f8f9fc;
  border-radius: 6px;
  overflow-x: auto;
}

.bubble-content code {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 13px;
}

.bubble-content img {
  max-width: 240px;
  max-height: 240px;
  border-radius: 6px;
  cursor: pointer;
}

.file-message {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.file-info {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
}

.file-size {
  font-size: 12px;
  opacity: 0.7;
}

.emoji {
  font-size: 36px;
}

.bubble-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  color: #909399;
}

.status .loading {
  animation: spin 1s linear infinite;
}

.status .success {
  color: #67c23a;
}

.status .error {
  color: #f56c6c;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
