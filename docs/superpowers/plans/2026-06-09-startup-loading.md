# Startup Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pre-login Electron startup spinner with a polished animated loading screen.

**Architecture:** Keep all server startup, discovery, fallback, and redirect logic unchanged. Add a lightweight status text cycle in `ServerSelectPage.vue` and replace only the `isStarting && !isConnecting` template branch with CSS-only animated markup.

**Tech Stack:** Vue 3 Composition API, TypeScript, Tailwind utility classes, scoped CSS keyframes.

---

## File Structure

- Modify: `frontend/src/pages/ServerSelectPage.vue`
  - Add rotating startup status messages.
  - Replace the startup loading DOM branch.
  - Add scoped CSS keyframes for launch-panel entrance, orbit nodes, pulse nodes, and progress line.

### Task 1: Add Startup Status Message Cycle

**Files:**
- Modify: `frontend/src/pages/ServerSelectPage.vue`

- [ ] **Step 1: Add imports**

Change:

```ts
import { ref, onMounted, onUnmounted } from 'vue'
```

to:

```ts
import { computed, ref, onMounted, onUnmounted } from 'vue'
```

- [ ] **Step 2: Add status state**

After `const lastServer = ref...`, add:

```ts
const startupSteps = ['检查上次连接', '启动本机服务', '准备进入登录']
const startupStepIndex = ref(0)
const startupStatusText = computed(() => startupSteps[startupStepIndex.value])
```

- [ ] **Step 3: Add timer state**

After the existing `scanTimer` declaration, add:

```ts
let startupStatusTimer: ReturnType<typeof setInterval> | null = null
```

- [ ] **Step 4: Add timer helpers**

Before `onMounted`, add:

```ts
function startStartupStatusTimer() {
  startupStepIndex.value = 0
  if (startupStatusTimer) clearInterval(startupStatusTimer)
  startupStatusTimer = setInterval(() => {
    startupStepIndex.value = (startupStepIndex.value + 1) % startupSteps.length
  }, 1500)
}

function stopStartupStatusTimer() {
  if (startupStatusTimer) {
    clearInterval(startupStatusTimer)
    startupStatusTimer = null
  }
}
```

- [ ] **Step 5: Start and stop the timer with startup**

At the beginning of `autoStartAndRedirect()`, after `isStarting.value = true`, add:

```ts
startStartupStatusTimer()
```

Before every redirect in `autoStartAndRedirect()` and before every path that sets `isStarting.value = false`, call:

```ts
stopStartupStatusTimer()
```

In `onUnmounted`, add:

```ts
stopStartupStatusTimer()
```

### Task 2: Replace Startup Loading Markup

**Files:**
- Modify: `frontend/src/pages/ServerSelectPage.vue`

- [ ] **Step 1: Replace the `isStarting && !isConnecting` block**

Replace the current startup block:

```vue
<div v-if="isStarting && !isConnecting" class="relative z-10 text-center">
  ...
</div>
```

with:

```vue
<div v-if="isStarting && !isConnecting" class="startup-shell relative z-10 w-full max-w-sm px-6 text-center">
  <div class="startup-mark mx-auto">
    <div class="startup-orbit startup-orbit-one">
      <span></span>
    </div>
    <div class="startup-orbit startup-orbit-two">
      <span></span>
    </div>
    <div class="startup-orbit startup-orbit-three">
      <span></span>
    </div>
    <div class="startup-core">
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10h8"/>
        <path d="M8 14h5"/>
      </svg>
    </div>
  </div>

  <div class="mt-8">
    <p class="text-[11px] font-medium uppercase tracking-[0.35em] text-white/35">Local service</p>
    <h1 class="mt-3 text-2xl font-semibold tracking-wide text-white">WebSocket Chat</h1>
    <p class="mt-3 min-h-[1.25rem] text-sm text-white/70">{{ startupStatusText }}</p>
    <p class="mt-1 text-xs text-white/35">正在准备聊天环境，请稍候</p>
  </div>

  <div class="startup-progress mt-8">
    <span></span>
  </div>
</div>
```

### Task 3: Add Scoped Startup Animation CSS

**Files:**
- Modify: `frontend/src/pages/ServerSelectPage.vue`

- [ ] **Step 1: Add a scoped style block at the end of the file**

Append:

```vue
<style scoped>
.startup-shell {
  animation: startup-enter 520ms ease-out both;
}

.startup-mark {
  position: relative;
  width: 132px;
  height: 132px;
}

.startup-core {
  position: absolute;
  inset: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.startup-orbit {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  animation: startup-orbit 3.6s linear infinite;
}

.startup-orbit span {
  position: absolute;
  left: 50%;
  top: -4px;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 999px;
  background: #f8fafc;
  box-shadow: 0 0 22px rgba(248, 250, 252, 0.72);
}

.startup-orbit-two {
  inset: 12px;
  animation-duration: 4.8s;
  animation-direction: reverse;
}

.startup-orbit-two span {
  background: #22c55e;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.72);
}

.startup-orbit-three {
  inset: 24px;
  animation-duration: 2.9s;
}

.startup-orbit-three span {
  background: #60a5fa;
  box-shadow: 0 0 20px rgba(96, 165, 250, 0.72);
}

.startup-progress {
  height: 2px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.startup-progress span {
  display: block;
  width: 42%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.86), transparent);
  animation: startup-progress 1.6s ease-in-out infinite;
}

@keyframes startup-enter {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes startup-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes startup-progress {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(250%);
  }
}
</style>
```

### Task 4: Verify And Commit

**Files:**
- Verify: `frontend/src/pages/ServerSelectPage.vue`

- [ ] **Step 1: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: exit code 0.

- [ ] **Step 2: Run Electron main-process build**

Run:

```powershell
cd frontend
node electron/build.mjs
```

Expected: `Electron build complete.`

- [ ] **Step 3: Commit**

Run:

```powershell
git add frontend/src/pages/ServerSelectPage.vue
git commit -m "feat: polish startup loading screen"
```

Expected: a feature commit containing only the startup loading UI change.
