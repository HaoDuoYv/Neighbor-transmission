<template>
  <div class="page file-transfer-page">
    <div class="page-header">
      <h2>传输</h2>
      <el-radio-group v-model="filterStatus" size="small">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="transferring">进行中</el-radio-button>
        <el-radio-button label="completed">已完成</el-radio-button>
        <el-radio-button label="failed">失败</el-radio-button>
      </el-radio-group>
    </div>

    <div class="transfer-list">
      <TransferItem
        v-for="transfer in filteredTransfers"
        :key="transfer.id"
        :transfer="transfer"
        @cancel="handleCancel"
        @open="handleOpen"
      />

      <el-empty v-if="filteredTransfers.length === 0" description="暂无传输记录" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTransferStore } from '@/stores/transfer'
import TransferItem from '@/components/TransferItem.vue'
import type { TransferTask } from '@/types'

const transferStore = useTransferStore()
const filterStatus = ref('all')

const filteredTransfers = computed(() => {
  if (filterStatus.value === 'all') return transferStore.transfers
  return transferStore.transfers.filter(t => t.status === filterStatus.value)
})

onMounted(() => {
  transferStore.fetchTransfers()
})

function handleCancel(fileId: string) {
  transferStore.cancelTransfer(fileId)
}

function handleOpen(transfer: TransferTask) {
  if (transfer.filePath) {
    window.electronAPI.openFile(transfer.filePath)
  }
}
</script>

<style scoped>
.transfer-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding: 2px;
}
</style>
