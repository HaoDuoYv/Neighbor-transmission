import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TransferTask } from '@/types'

export const useTransferStore = defineStore('transfer', () => {
  const transfers = ref<TransferTask[]>([])

  const activeTransfers = computed(() => transfers.value.filter(t => t.status === 'transferring'))
  const pendingTransfers = computed(() => transfers.value.filter(t => t.status === 'pending'))
  const completedTransfers = computed(() => transfers.value.filter(t => t.status === 'completed'))
  const failedTransfers = computed(() => transfers.value.filter(t => t.status === 'failed'))

  async function fetchTransfers() {
    transfers.value = await window.electronAPI.getTransfers() as TransferTask[]
  }

  function addTransfer(task: TransferTask) {
    const index = transfers.value.findIndex(t => t.id === task.id)
    if (index === -1) {
      transfers.value.unshift(task)
    } else {
      transfers.value[index] = task
    }
  }

  function updateTransfer(task: TransferTask) {
    const index = transfers.value.findIndex(t => t.id === task.id)
    if (index !== -1) {
      transfers.value[index] = task
    }
  }

  async function cancelTransfer(fileId: string) {
    await window.electronAPI.cancelTransfer(fileId)
    const transfer = transfers.value.find(t => t.id === fileId)
    if (transfer) {
      transfer.status = 'cancelled'
    }
  }

  return {
    transfers, activeTransfers, pendingTransfers, completedTransfers, failedTransfers,
    fetchTransfers, addTransfer, updateTransfer, cancelTransfer
  }
})
