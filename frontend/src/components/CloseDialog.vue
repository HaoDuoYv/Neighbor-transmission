<template>
  <div v-if="visible" class="close-dialog-overlay" @click.self="handleMinimize">
    <div class="close-dialog">
      <div class="close-dialog-header">
        <h3>关闭确认</h3>
      </div>
      <div class="close-dialog-body">
        <p>您希望如何关闭应用？</p>
        <label class="remember-checkbox">
          <input type="checkbox" v-model="remember" />
          <span>记住我的选择</span>
        </label>
      </div>
      <div class="close-dialog-actions">
        <button class="btn-minimize" @click="handleMinimize">最小化到托盘</button>
        <button class="btn-quit" @click="handleQuit">退出应用</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const visible = ref(false)
const remember = ref(false)

function handleMinimize() {
  window.electronAPI?.sendCloseDialogResult({ action: 'minimize', remember: remember.value })
  visible.value = false
}

function handleQuit() {
  window.electronAPI?.sendCloseDialogResult({ action: 'quit', remember: remember.value })
  visible.value = false
}

onMounted(() => {
  window.electronAPI?.onShowCloseDialog(() => {
    visible.value = true
  })
})
</script>

<style scoped>
.close-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.15s ease;
}

.close-dialog {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  width: 360px;
  overflow: hidden;
  animation: slideUp 0.2s ease;
}

.close-dialog-header {
  padding: 20px 24px 0;
}

.close-dialog-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #18181b;
}

.close-dialog-body {
  padding: 12px 24px 16px;
}

.close-dialog-body p {
  margin: 0 0 12px;
  font-size: 14px;
  color: #71717a;
}

.remember-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #52525b;
  cursor: pointer;
  user-select: none;
}

.remember-checkbox input {
  width: 15px;
  height: 15px;
  accent-color: #18181b;
}

.close-dialog-actions {
  display: flex;
  gap: 10px;
  padding: 16px 24px 20px;
  background: #fafafa;
}

.close-dialog-actions button {
  flex: 1;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-minimize {
  background: #f4f4f5;
  color: #3f3f46;
}

.btn-minimize:hover {
  background: #e4e4e7;
}

.btn-quit {
  background: #18181b;
  color: #fff;
}

.btn-quit:hover {
  background: #27272a;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
