<script setup lang="ts">
import { ref, computed } from 'vue'
import { resolveUrl, getApiUrl } from '@/api/server-config'

const username = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const emit = defineEmits<{
  login: [user: { userId: string; username: string; token: string }]
}>()

const canSubmit = computed(() => username.value.trim().length > 0)

const handleSubmit = async () => {
  if (!username.value.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const res = await fetch(getApiUrl('/auth/desktop-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value.trim() })
    })

    const data = await res.json()

    if (!res.ok) {
      errorMsg.value = data.message || '登录失败'
      return
    }

    const user = {
      userId: String(data.userId),
      username: data.username,
      avatarUrl: resolveUrl(data.avatarUrl) || '',
      token: data.token
    }

    localStorage.setItem('user', JSON.stringify(user))
    emit('login', user)
  } catch (error) {
    errorMsg.value = '网络错误，请稍后重试'
    console.error('Login error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-20 left-20 w-32 h-32 border border-black/5"></div>
      <div class="absolute bottom-32 right-32 w-48 h-48 border border-black/5"></div>
      <div class="absolute top-1/3 right-20 w-24 h-24 bg-black/[0.02]"></div>
    </div>

    <div class="relative w-full max-w-sm slide-up">
      <div class="text-center mb-10">
        <div class="w-14 h-14 bg-[#18181B] flex items-center justify-center mx-auto mb-5 shadow-lg rounded-2xl hover-lift">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h1 class="text-xl font-medium text-[#18181B] tracking-tight">WebSocket Chat</h1>
        <p class="text-sm text-[#737373] mt-1">输入用户名即可进入</p>
      </div>

      <div class="bg-white p-8 shadow-lg border border-[#E5E5E5] rounded-2xl">
        <div class="mb-6">
          <h2 class="text-base font-medium text-[#18181B]">进入聊天</h2>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div>
            <label class="block text-xs font-medium text-[#525252] mb-2 uppercase tracking-wider">
              用户名
            </label>
            <input
              v-model="username"
              type="text"
              placeholder="请输入您的用户名"
              class="w-full px-0 py-3 bg-transparent border-0 border-b border-[#E5E5E5] text-sm text-[#18181B] placeholder-[#A3A3A3] focus:outline-none focus:border-[#18181B] transition-all duration-200 input-glow"
              :disabled="isLoading"
              maxlength="32"
              autofocus
            />
          </div>

          <div v-if="errorMsg" class="flex items-center gap-2 text-red-600 text-xs py-2 fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {{ errorMsg }}
          </div>

          <button
            type="submit"
            class="w-full py-3.5 bg-[#18181B] hover:bg-[#27272A] text-white text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl btn-press"
            :disabled="isLoading || !canSubmit"
          >
            <span v-if="isLoading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              请稍候...
            </span>
            <span v-else>进入</span>
          </button>
        </form>
      </div>

      <p class="text-center text-xs text-[#A3A3A3] mt-8">
        WebSocket Chat App
      </p>
    </div>
  </div>
</template>
