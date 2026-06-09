# Remote Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a main-sidebar Remote Transfer mode that embeds WeChat File Transfer Assistant in the right chat workspace.

**Architecture:** The feature stays inside the existing `HomePage.vue` shell by extending the current tab state with `remote-transfer`. Electron enables a controlled `<webview>` for the embedded page and exposes a preload IPC helper for opening the same URL externally.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS utility classes, Electron BrowserWindow, Electron preload IPC.

---

## File Structure

- Modify: `frontend/electron/window-manager.ts`
  - Enable Electron's `<webview>` tag in the app BrowserWindow.
- Modify: `frontend/electron/main.ts`
  - Register a safe `shell:open-external` IPC handler.
- Modify: `frontend/electron/preload.ts`
  - Expose `openExternal(url)` through `window.electronAPI`.
- Modify: `frontend/src/vite-env.d.ts`
  - Add renderer-side TypeScript definitions for `openExternal`.
- Modify: `frontend/src/pages/HomePage.vue`
  - Extend active tab state, add Remote Transfer navigation, render middle-column status, and replace the right chat workspace with an embedded remote transfer panel when selected.

### Task 1: Electron Webview And External Open Bridge

**Files:**
- Modify: `frontend/electron/window-manager.ts`
- Modify: `frontend/electron/main.ts`
- Modify: `frontend/electron/preload.ts`
- Modify: `frontend/src/vite-env.d.ts`

- [ ] **Step 1: Run the current frontend build as a baseline**

Run:

```powershell
cd frontend
npm run build
```

Expected: Either PASS, or an existing unrelated failure. Record the output before changing Electron files.

- [ ] **Step 2: Enable Electron webview support**

In `frontend/electron/window-manager.ts`, update the `webPreferences` object inside `createWindow()` to include `webviewTag: true`:

```ts
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  webviewTag: true,
},
```

- [ ] **Step 3: Add external-open IPC in the main process**

In `frontend/electron/main.ts`, change the import and add the IPC handler inside `app.whenReady().then(...)`:

```ts
import { app, ipcMain, BrowserWindow, shell } from 'electron'
```

```ts
ipcMain.handle('shell:open-external', async (_event, url: string) => {
  await shell.openExternal(url)
})
```

- [ ] **Step 4: Expose external-open IPC in preload**

In `frontend/electron/preload.ts`, add this method to the object passed to `contextBridge.exposeInMainWorld('electronAPI', ...)`:

```ts
openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
```

- [ ] **Step 5: Update renderer types**

In `frontend/src/vite-env.d.ts`, add the method to `ElectronAPI`:

```ts
openExternal: (url: string) => Promise<void>
```

- [ ] **Step 6: Verify Electron TypeScript still compiles through the build**

Run:

```powershell
cd frontend
npm run build
```

Expected: PASS, or the same unrelated baseline failure from Step 1.

### Task 2: Remote Transfer State And Helpers

**Files:**
- Modify: `frontend/src/pages/HomePage.vue`

- [ ] **Step 1: Add Remote Transfer constants and tab type**

Near `ACTIVE_TAB_STORAGE_KEY`, add the remote URL constant and tab type:

```ts
const REMOTE_TRANSFER_URL = 'https://filehelper.weixin.qq.com/'
type HomeActiveTab = 'messages' | 'contacts' | 'remote-transfer'
```

Replace the current `activeTab` declaration with:

```ts
const getStoredActiveTab = (): HomeActiveTab => {
  const stored = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)
  return stored === 'contacts' || stored === 'remote-transfer' ? stored : 'messages'
}

const activeTab = ref<HomeActiveTab>(getStoredActiveTab())
const remoteTransferWebviewRef = ref<any>(null)
```

- [ ] **Step 2: Add tab selection and remote transfer helpers**

Add these functions near other UI helper functions:

```ts
function selectPrimaryTab(tab: HomeActiveTab) {
  activeTab.value = tab
  localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab)
  if (tab === 'remote-transfer') {
    selectedRoomId.value = null
    showChatMenu.value = false
    showMemberList.value = false
    showSidebar.value = false
  }
}

async function openRemoteTransferExternal() {
  try {
    await window.electronAPI?.openExternal?.(REMOTE_TRANSFER_URL)
  } catch {
    window.open(REMOTE_TRANSFER_URL, '_blank', 'noopener,noreferrer')
    return
  }

  if (!window.electronAPI?.openExternal) {
    window.open(REMOTE_TRANSFER_URL, '_blank', 'noopener,noreferrer')
  }
}

function refreshRemoteTransfer() {
  remoteTransferWebviewRef.value?.reload?.()
}
```

- [ ] **Step 3: Persist existing message/contact tab changes through the helper**

Replace direct assignments such as:

```vue
@click="activeTab = 'messages'"
@click="activeTab = 'contacts'"
```

with:

```vue
@click="selectPrimaryTab('messages')"
@click="selectPrimaryTab('contacts')"
```

- [ ] **Step 4: Verify type checking catches no missing helper names**

Run:

```powershell
cd frontend
npm run build
```

Expected: PASS, or the same unrelated baseline failure.

### Task 3: Sidebar And Middle Column UI

**Files:**
- Modify: `frontend/src/pages/HomePage.vue`

- [ ] **Step 1: Add the Remote Transfer sidebar button**

Add this button between Contacts and Apps in the left `<nav>`:

```vue
<button
  @click="selectPrimaryTab('remote-transfer')"
  class="w-10 h-10 flex items-center justify-center transition-all duration-200 rounded-xl btn-press"
  :class="activeTab === 'remote-transfer' ? (isDarkTheme ? 'bg-white/10 text-white shadow-sm' : 'bg-[#18181B] text-white shadow-md') : (isDarkTheme ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')"
  title="远程传输"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 16l3-3-3-3"/>
    <path d="M8 8l-3 3 3 3"/>
    <path d="M19 13H5"/>
    <path d="M12 3v4"/>
    <path d="M12 17v4"/>
  </svg>
</button>
```

- [ ] **Step 2: Make the middle-column title mode-aware**

Replace:

```vue
{{ activeTab === 'messages' ? '消息' : '联系人' }}
```

with:

```vue
{{ activeTab === 'messages' ? '消息' : activeTab === 'contacts' ? '联系人' : '远程传输' }}
```

- [ ] **Step 3: Hide create and search controls for Remote Transfer**

Add `v-if="activeTab !== 'remote-transfer'"` to the create button and search wrapper in the middle-column header.

- [ ] **Step 4: Add a middle-column Remote Transfer status item**

After the header and before the AI assistant list, add:

```vue
<div v-if="activeTab === 'remote-transfer'" class="flex-1 px-3 py-3">
  <button
    type="button"
    class="w-full border px-4 py-3 text-left transition-colors"
    :class="isDarkTheme ? 'border-gray-800 bg-gray-800 text-gray-100' : 'border-gray-100 bg-gray-50 text-gray-800'"
  >
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#07C160] text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <path d="M7 10l5 5 5-5"/>
          <path d="M12 15V3"/>
        </svg>
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-medium">微信文件传输助手</p>
        <p class="mt-0.5 truncate text-xs" :class="isDarkTheme ? 'text-gray-500' : 'text-gray-400'">内嵌远程传输</p>
      </div>
    </div>
  </button>
</div>
```

- [ ] **Step 5: Confirm the normal messages and contacts lists are gated**

Ensure these existing sections still use:

```vue
<div v-if="activeTab === 'messages'" ...>
<div v-if="activeTab === 'contacts'" ...>
```

Expected: Remote Transfer mode does not show chat rooms, contacts, or AI assistant lists.

### Task 4: Right-Side Embedded Remote Transfer Panel

**Files:**
- Modify: `frontend/src/pages/HomePage.vue`

- [ ] **Step 1: Render Remote Transfer before the normal chat states**

Inside the right content area, before the existing `v-if="!selectedRoomId"` welcome state, add:

```vue
<div v-if="activeTab === 'remote-transfer'" class="flex min-h-0 flex-1 flex-col">
  <header class="border-b px-6 py-4" :class="isDarkTheme ? 'border-gray-800' : 'border-gray-50'">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-sm font-medium" :class="isDarkTheme ? 'text-gray-200' : 'text-gray-800'">远程传输</h1>
        <p class="mt-1 text-xs" :class="isDarkTheme ? 'text-gray-500' : 'text-gray-400'">微信文件传输助手</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-8 px-3 text-xs transition-colors"
          :class="isDarkTheme ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'"
          @click="refreshRemoteTransfer"
        >
          刷新
        </button>
        <button
          type="button"
          class="h-8 bg-[#18181B] px-3 text-xs text-white transition-colors hover:bg-[#27272A]"
          @click="openRemoteTransferExternal"
        >
          外部打开
        </button>
      </div>
    </div>
  </header>

  <div class="min-h-0 flex-1 p-4">
    <webview
      v-if="window.electronAPI"
      ref="remoteTransferWebviewRef"
      :src="REMOTE_TRANSFER_URL"
      class="h-full w-full border"
      :class="isDarkTheme ? 'border-gray-800 bg-[#18181B]' : 'border-gray-100 bg-white'"
      allowpopups
    />
    <div
      v-else
      class="flex h-full items-center justify-center border"
      :class="isDarkTheme ? 'border-gray-800 text-gray-400' : 'border-gray-100 text-gray-500'"
    >
      <div class="max-w-sm text-center">
        <p class="text-sm font-medium">当前环境不支持内嵌远程传输</p>
        <p class="mt-2 text-xs leading-5 opacity-70">微信文件传输助手限制普通网页 iframe 嵌入，请使用桌面端内嵌，或在浏览器中打开。</p>
        <button
          type="button"
          class="mt-4 bg-[#18181B] px-4 py-2 text-xs text-white transition-colors hover:bg-[#27272A]"
          @click="openRemoteTransferExternal"
        >
          外部打开
        </button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Change the normal welcome state to `v-else-if`**

Replace:

```vue
<div v-if="!selectedRoomId" class="flex-1 flex items-center justify-center">
```

with:

```vue
<div v-else-if="!selectedRoomId" class="flex-1 flex items-center justify-center">
```

- [ ] **Step 3: Keep the normal chat template as the final branch**

Replace:

```vue
<template v-else>
```

with the same final `v-else` branch after the remote panel and welcome state. This preserves existing chat behavior for selected rooms.

### Task 5: Verification And Commit

**Files:**
- Verify: `frontend/src/pages/HomePage.vue`
- Verify: `frontend/electron/window-manager.ts`
- Verify: `frontend/electron/main.ts`
- Verify: `frontend/electron/preload.ts`
- Verify: `frontend/src/vite-env.d.ts`

- [ ] **Step 1: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 2: Inspect the diff**

Run:

```powershell
git diff -- frontend/src/pages/HomePage.vue frontend/electron/window-manager.ts frontend/electron/main.ts frontend/electron/preload.ts frontend/src/vite-env.d.ts
```

Expected: Diff only contains Remote Transfer UI and Electron bridge changes.

- [ ] **Step 3: Commit implementation**

Run:

```powershell
git add frontend/src/pages/HomePage.vue frontend/electron/window-manager.ts frontend/electron/main.ts frontend/electron/preload.ts frontend/src/vite-env.d.ts
git commit -m "feat: add remote transfer panel"
```

Expected: A new feature commit is created.
