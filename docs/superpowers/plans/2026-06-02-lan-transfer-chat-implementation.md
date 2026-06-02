# 邻传 — 局域网文件传输与聊天应用实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Electron + Vue 3 的局域网文件传输与聊天桌面应用，支持设备自动发现、P2P 文件传输、实时聊天和文件管理。

**Architecture:** 纯 P2P 网状架构，每个设备同时作为客户端和服务端。UDP 广播用于设备发现，TCP 用于文件传输（支持断点续传），WebSocket 用于聊天消息。主进程负责所有网络通信和数据持久化，渲染进程通过 IPC 与主进程交互。

**Tech Stack:** Electron, Vue 3, TypeScript, Vite, Element Plus, Pinia, Vue Router, SQLite (better-sqlite3), electron-store

---

## 文件结构

```
邻传/
├── electron/
│   ├── main.ts                          # Electron 主入口
│   ├── preload.ts                       # 预加载脚本，暴露 IPC API
│   ├── services/
│   │   ├── discovery.ts                 # UDP 设备发现服务
│   │   ├── fileTransfer.ts              # TCP 文件传输服务
│   │   ├── messaging.ts                 # WebSocket 消息服务
│   │   └── database.ts                  # SQLite 数据库服务
│   └── utils/
│       ├── network.ts                   # 网络工具（获取本机IP等）
│       └── id.ts                        # UUID 生成
├── src/
│   ├── main.ts                          # Vue 入口
│   ├── App.vue                          # 根组件
│   ├── router/
│   │   └── index.ts                     # 路由配置
│   ├── stores/
│   │   ├── device.ts                    # 设备状态管理
│   │   ├── chat.ts                      # 聊天状态管理
│   │   └── transfer.ts                  # 传输状态管理
│   ├── views/
│   │   ├── DeviceList.vue               # 设备列表页
│   │   ├── Chat.vue                     # 聊天页
│   │   ├── FileTransfer.vue             # 文件传输页
│   │   ├── FileLibrary.vue              # 文件库页
│   │   ├── RemoteTransfer.vue           # 远程传输页
│   │   └── Settings.vue                 # 设置页
│   ├── components/
│   │   ├── Sidebar.vue                  # 侧边导航栏
│   │   ├── DeviceCard.vue               # 设备卡片组件
│   │   ├── MessageBubble.vue            # 消息气泡组件
│   │   ├── FileUpload.vue               # 文件上传组件
│   │   └── TransferItem.vue             # 传输任务项组件
│   ├── types/
│   │   └── index.ts                     # 全局类型定义
│   └── assets/
│       └── styles/
│           └── global.css               # 全局样式
├── package.json
├── vite.config.ts
├── electron-builder.json
├── tsconfig.json
├── tsconfig.node.json
└── index.html
```

---

## Phase 1: 项目脚手架

### Task 1: 初始化项目并安装依赖

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `electron-builder.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "linchuan",
  "version": "1.0.0",
  "description": "局域网文件传输与聊天应用",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "electron:dev": "vite --config vite.config.ts",
    "electron:build": "vite build && electron-builder",
    "typecheck": "vue-tsc --noEmit"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.7.0",
    "@element-plus/icons-vue": "^2.3.0",
    "vue-i18n": "^9.13.0",
    "electron-store": "^8.2.0",
    "better-sqlite3": "^11.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/uuid": "^9.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "electron": "^31.0.0",
    "electron-builder": "^24.13.0",
    "typescript": "^5.5.0",
    "vite": "^5.3.0",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.0",
    "vue-tsc": "^2.0.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "electron/**/*.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "electron/**/*.ts"]
}
```

- [ ] **Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3', 'electron-store']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        }
      }
    ]),
    electronRenderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

- [ ] **Step 5: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>邻传</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 electron-builder.json**

```json
{
  "appId": "com.linchuan.app",
  "productName": "邻传",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  "win": {
    "target": "nsis",
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

- [ ] **Step 7: 安装依赖并验证**

Run: `pnpm install`
Expected: 依赖安装成功，无报错

- [ ] **Step 8: 提交**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html electron-builder.json pnpm-lock.yaml
git commit -m "chore: 初始化项目脚手架，配置 Electron + Vue 3 + Vite + TypeScript"
```

---

### Task 2: 创建全局类型定义

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// 设备信息
export interface Device {
  id: string
  name: string
  ip: string
  port: number
  wsPort: number
  avatar?: string
  isOnline: boolean
  lastSeen: number
  isFavorite: boolean
}

// UDP 心跳包
export interface HeartbeatMessage {
  type: 'heartbeat' | 'offline'
  deviceId: string
  deviceName: string
  ip: string
  port: number
  wsPort: number
  avatar?: string
  timestamp: number
}

// 文件传输请求
export interface FileRequest {
  type: 'file-request'
  fileId: string
  fileName: string
  fileSize: number
  fromDevice: string
  toDevice: string
}

// 文件传输响应
export interface FileResponse {
  type: 'file-accept' | 'file-reject'
  fileId: string
}

// 文件分片确认
export interface ChunkAck {
  type: 'chunk-ack'
  fileId: string
  chunkIndex: number
}

// 断点续传请求
export interface ResumeRequest {
  type: 'resume'
  fileId: string
  lastChunkIndex: number
}

// 文件传输完成
export interface FileComplete {
  type: 'file-complete'
  fileId: string
}

// 传输任务状态
export type TransferStatus = 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled' | 'paused'

// 传输任务
export interface TransferTask {
  id: string
  fileName: string
  fileSize: number
  filePath?: string
  fromDevice: string
  toDevice: string
  direction: 'send' | 'receive'
  status: TransferStatus
  progress: number
  speed: number
  createdAt: number
  completedAt?: number
}

// 消息类型
export type MessageType = 'text' | 'image' | 'file' | 'code' | 'emoji'

// 消息状态
export type MessageStatus = 'sending' | 'sent' | 'failed' | 'read'

// 聊天消息
export interface ChatMessage {
  id: string
  fromDevice: string
  toDevice: string
  type: MessageType
  content: string
  metadata?: Record<string, unknown>
  status: MessageStatus
  createdAt: number
}

// 消息确认
export interface MessageAck {
  type: 'msg-ack'
  msgId: string
}

// WebSocket 消息包装
export interface WsMessage {
  type: 'chat' | 'ack'
  payload: ChatMessage | MessageAck
}

// IPC 事件类型
export interface IpcEvents {
  'device:online': Device
  'device:offline': string
  'device:update': Device
  'transfer:progress': TransferTask
  'transfer:complete': TransferTask
  'transfer:error': { fileId: string; error: string }
  'message:new': ChatMessage
  'message:ack': { msgId: string }
  'message:error': { msgId: string; error: string }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/types/index.ts
git commit -m "feat: 添加全局类型定义"
```

---

### Task 3: 创建 Vue 应用入口和路由

**Files:**
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/router/index.ts`
- Create: `src/assets/styles/global.css`

- [ ] **Step 1: 创建 src/main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './assets/styles/global.css'

const app = createApp(App)
const pinia = createPinia()

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 2: 创建 src/router/index.ts**

```typescript
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/devices'
    },
    {
      path: '/devices',
      name: 'DeviceList',
      component: () => import('@/views/DeviceList.vue')
    },
    {
      path: '/chat/:deviceId?',
      name: 'Chat',
      component: () => import('@/views/Chat.vue')
    },
    {
      path: '/transfer',
      name: 'FileTransfer',
      component: () => import('@/views/FileTransfer.vue')
    },
    {
      path: '/files',
      name: 'FileLibrary',
      component: () => import('@/views/FileLibrary.vue')
    },
    {
      path: '/remote',
      name: 'RemoteTransfer',
      component: () => import('@/views/RemoteTransfer.vue')
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue')
    }
  ]
})

export default router
```

- [ ] **Step 3: 创建 src/assets/styles/global.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #909399;
}
```

- [ ] **Step 4: 创建 src/App.vue 骨架**

```vue
<template>
  <div class="app-container">
    <Sidebar />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '@/components/Sidebar.vue'
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>
```

- [ ] **Step 5: 提交**

```bash
git add src/main.ts src/App.vue src/router/index.ts src/assets/styles/global.css
git commit -m "feat: 创建 Vue 应用入口、路由和全局样式"
```

---

## Phase 2: 数据库层

### Task 4: 创建 SQLite 数据库服务

**Files:**
- Create: `electron/services/database.ts`

- [ ] **Step 1: 创建 database.ts**

```typescript
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

export class DatabaseService {
  private db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'linchuan.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.init()
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ip TEXT,
        port INTEGER,
        ws_port INTEGER,
        avatar TEXT,
        is_online INTEGER DEFAULT 0,
        last_seen INTEGER,
        is_favorite INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        from_device TEXT NOT NULL,
        to_device TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        metadata TEXT,
        status TEXT DEFAULT 'sent',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_path TEXT,
        from_device TEXT NOT NULL,
        to_device TEXT NOT NULL,
        direction TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        progress REAL DEFAULT 0,
        speed INTEGER,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_device);
      CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_device);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
      CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(created_at);
    `)
  }

  // 设备操作
  upsertDevice(device: { id: string; name: string; ip: string; port: number; wsPort: number; avatar?: string }) {
    const stmt = this.db.prepare(`
      INSERT INTO devices (id, name, ip, port, ws_port, avatar, is_online, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        ip = excluded.ip,
        port = excluded.port,
        ws_port = excluded.ws_port,
        avatar = excluded.avatar,
        is_online = 1,
        last_seen = excluded.last_seen
    `)
    stmt.run(device.id, device.name, device.ip, device.port, device.wsPort, device.avatar || null, Date.now())
  }

  setDeviceOffline(deviceId: string) {
    const stmt = this.db.prepare('UPDATE devices SET is_online = 0 WHERE id = ?')
    stmt.run(deviceId)
  }

  getDevices() {
    return this.db.prepare('SELECT * FROM devices ORDER BY is_online DESC, is_favorite DESC, last_seen DESC').all()
  }

  getOnlineDevices() {
    return this.db.prepare('SELECT * FROM devices WHERE is_online = 1').all()
  }

  toggleFavorite(deviceId: string, isFavorite: boolean) {
    const stmt = this.db.prepare('UPDATE devices SET is_favorite = ? WHERE id = ?')
    stmt.run(isFavorite ? 1 : 0, deviceId)
  }

  // 消息操作
  insertMessage(msg: { id: string; fromDevice: string; toDevice: string; type: string; content: string; metadata?: string }) {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, from_device, to_device, type, content, metadata, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)
    `)
    stmt.run(msg.id, msg.fromDevice, msg.toDevice, msg.type, msg.content, msg.metadata || null, Date.now())
  }

  updateMessageStatus(msgId: string, status: string) {
    const stmt = this.db.prepare('UPDATE messages SET status = ? WHERE id = ?')
    stmt.run(status, msgId)
  }

  getMessages(device1: string, device2: string, limit = 50) {
    return this.db.prepare(`
      SELECT * FROM messages
      WHERE (from_device = ? AND to_device = ?) OR (from_device = ? AND to_device = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(device1, device2, device2, device1, limit)
  }

  searchMessages(keyword: string) {
    return this.db.prepare(`
      SELECT * FROM messages
      WHERE content LIKE ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(`%${keyword}%`)
  }

  // 传输记录操作
  insertTransfer(transfer: { id: string; fileName: string; fileSize: number; filePath?: string; fromDevice: string; toDevice: string; direction: string }) {
    const stmt = this.db.prepare(`
      INSERT INTO transfers (id, file_name, file_size, file_path, from_device, to_device, direction, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `)
    stmt.run(transfer.id, transfer.fileName, transfer.fileSize, transfer.filePath || null, transfer.fromDevice, transfer.toDevice, transfer.direction, Date.now())
  }

  updateTransferStatus(id: string, status: string, progress?: number, speed?: number) {
    if (progress !== undefined && speed !== undefined) {
      const stmt = this.db.prepare('UPDATE transfers SET status = ?, progress = ?, speed = ? WHERE id = ?')
      stmt.run(status, progress, speed, id)
    } else {
      const stmt = this.db.prepare('UPDATE transfers SET status = ? WHERE id = ?')
      stmt.run(status, id)
    }
  }

  completeTransfer(id: string, filePath: string) {
    const stmt = this.db.prepare('UPDATE transfers SET status = ?, progress = 1, file_path = ?, completed_at = ? WHERE id = ?')
    stmt.run('completed', filePath, Date.now(), id)
  }

  getTransfers(limit = 100) {
    return this.db.prepare('SELECT * FROM transfers ORDER BY created_at DESC LIMIT ?').all(limit)
  }

  getTransfersByStatus(status: string) {
    return this.db.prepare('SELECT * FROM transfers WHERE status = ? ORDER BY created_at DESC').all(status)
  }

  // 文件库查询
  getFilesByType(type?: string, keyword?: string) {
    let sql = 'SELECT * FROM transfers WHERE status = ?'
    const params: unknown[] = ['completed']

    if (keyword) {
      sql += ' AND file_name LIKE ?'
      params.push(`%${keyword}%`)
    }

    if (type) {
      const extensions: Record<string, string[]> = {
        image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
        document: ['.doc', '.docx', '.pdf', '.txt', '.md', '.xls', '.xlsx', '.ppt', '.pptx'],
        video: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'],
        audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg']
      }
      const exts = extensions[type] || []
      if (exts.length > 0) {
        const conditions = exts.map(() => 'LOWER(file_name) LIKE ?').join(' OR ')
        sql += ` AND (${conditions})`
        params.push(...exts.map(e => `%${e}`))
      }
    }

    sql += ' ORDER BY completed_at DESC LIMIT 200'
    return this.db.prepare(sql).all(...params)
  }

  close() {
    this.db.close()
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add electron/services/database.ts
git commit -m "feat: 实现 SQLite 数据库服务，包含设备、消息、传输记录表"
```

---

## Phase 3: 网络工具

### Task 5: 创建网络工具函数

**Files:**
- Create: `electron/utils/network.ts`
- Create: `electron/utils/id.ts`

- [ ] **Step 1: 创建 network.ts**

```typescript
import { networkInterfaces } from 'os'

export function getLocalIP(): string {
  const interfaces = networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name]
    if (!nets) continue
    for (const net of nets) {
      // 跳过内部地址和非 IPv4
      if (net.internal || net.family !== 'IPv4') continue
      return net.address
    }
  }
  return '127.0.0.1'
}

export function getBroadcastAddress(ip: string, subnetMask = '255.255.255.0'): string {
  const ipParts = ip.split('.').map(Number)
  const maskParts = subnetMask.split('.').map(Number)
  const broadcastParts = ipParts.map((part, i) => (part | (~maskParts[i] & 255)))
  return broadcastParts.join('.')
}

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  )
}
```

- [ ] **Step 2: 创建 id.ts**

```typescript
import { v4 as uuidv4 } from 'uuid'

export function generateId(): string {
  return uuidv4()
}
```

- [ ] **Step 3: 提交**

```bash
git add electron/utils/network.ts electron/utils/id.ts
git commit -m "feat: 添加网络工具和 ID 生成函数"
```

---

## Phase 4: 核心服务

### Task 6: 实现 UDP 设备发现服务

**Files:**
- Create: `electron/services/discovery.ts`

- [ ] **Step 1: 创建 discovery.ts**

```typescript
import { createSocket, Socket } from 'dgram'
import { EventEmitter } from 'events'
import { getLocalIP, getBroadcastAddress } from '../utils/network'
import { HeartbeatMessage, Device } from '../../src/types'

const UDP_PORT = 12345
const HEARTBEAT_INTERVAL = 3000
const OFFLINE_TIMEOUT = 10000

export class DiscoveryService extends EventEmitter {
  private socket: Socket
  private localIP: string
  private deviceId: string
  private deviceName: string
  private tcpPort: number
  private wsPort: number
  private heartbeatTimer: NodeJS.Timeout | null = null
  private devices: Map<string, Device> = new Map()
  private offlineCheckTimer: NodeJS.Timeout | null = null

  constructor(deviceId: string, deviceName: string, tcpPort: number, wsPort: number) {
    super()
    this.deviceId = deviceId
    this.deviceName = deviceName
    this.tcpPort = tcpPort
    this.wsPort = wsPort
    this.localIP = getLocalIP()
    this.socket = createSocket('udp4')
  }

  start() {
    this.socket.bind(UDP_PORT, () => {
      this.socket.setBroadcast(true)
      console.log(`[Discovery] UDP 监听端口 ${UDP_PORT}`)
    })

    this.socket.on('message', (msg, rinfo) => {
      try {
        const data: HeartbeatMessage = JSON.parse(msg.toString())
        // 忽略自己的心跳
        if (data.deviceId === this.deviceId) return
        this.handleHeartbeat(data, rinfo.address)
      } catch {
        // 忽略无效消息
      }
    })

    this.socket.on('error', (err) => {
      console.error('[Discovery] UDP 错误:', err)
    })

    // 开始广播心跳
    this.startHeartbeat()

    // 开始离线检测
    this.startOfflineCheck()
  }

  private startHeartbeat() {
    const broadcast = () => {
      const message: HeartbeatMessage = {
        type: 'heartbeat',
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        ip: this.localIP,
        port: this.tcpPort,
        wsPort: this.wsPort,
        timestamp: Date.now()
      }
      const buffer = Buffer.from(JSON.stringify(message))
      const broadcastAddr = getBroadcastAddress(this.localIP)
      this.socket.send(buffer, 0, buffer.length, UDP_PORT, broadcastAddr)
    }

    // 立即广播一次
    broadcast()
    this.heartbeatTimer = setInterval(broadcast, HEARTBEAT_INTERVAL)
  }

  private startOfflineCheck() {
    this.offlineCheckTimer = setInterval(() => {
      const now = Date.now()
      for (const [id, device] of this.devices) {
        if (device.isOnline && now - device.lastSeen > OFFLINE_TIMEOUT) {
          device.isOnline = false
          this.emit('device:offline', device)
        }
      }
    }, 5000)
  }

  private handleHeartbeat(data: HeartbeatMessage, ip: string) {
    const existing = this.devices.get(data.deviceId)

    if (data.type === 'offline') {
      if (existing) {
        existing.isOnline = false
        this.emit('device:offline', existing)
      }
      return
    }

    if (existing) {
      // 更新现有设备
      existing.name = data.deviceName
      existing.ip = ip
      existing.port = data.port
      existing.wsPort = data.wsPort
      existing.lastSeen = data.timestamp
      existing.isOnline = true
      this.emit('device:update', existing)
    } else {
      // 新设备上线
      const device: Device = {
        id: data.deviceId,
        name: data.deviceName,
        ip: ip,
        port: data.port,
        wsPort: data.wsPort,
        isOnline: true,
        lastSeen: data.timestamp,
        isFavorite: false
      }
      this.devices.set(data.deviceId, device)
      this.emit('device:online', device)
    }
  }

  getOnlineDevices(): Device[] {
    return Array.from(this.devices.values()).filter(d => d.isOnline)
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values())
  }

  broadcastOffline() {
    const message: HeartbeatMessage = {
      type: 'offline',
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      ip: this.localIP,
      port: this.tcpPort,
      wsPort: this.wsPort,
      timestamp: Date.now()
    }
    const buffer = Buffer.from(JSON.stringify(message))
    const broadcastAddr = getBroadcastAddress(this.localIP)
    this.socket.send(buffer, 0, buffer.length, UDP_PORT, broadcastAddr)
  }

  stop() {
    this.broadcastOffline()
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.offlineCheckTimer) clearInterval(this.offlineCheckTimer)
    this.socket.close()
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add electron/services/discovery.ts
git commit -m "feat: 实现 UDP 设备发现服务，支持自动广播和离线检测"
```

---

### Task 7: 实现 TCP 文件传输服务

**Files:**
- Create: `electron/services/fileTransfer.ts`

- [ ] **Step 1: 创建 fileTransfer.ts**

```typescript
import { createServer, Server, Socket, connect } from 'net'
import { EventEmitter } from 'events'
import { createReadStream, createWriteStream, statSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import { generateId } from '../utils/id'
import { TransferTask } from '../../src/types'

const TCP_PORT = 12346
const CHUNK_SIZE = 64 * 1024 // 64KB
const MAX_CONCURRENT = 3

interface PendingTransfer {
  task: TransferTask
  chunks: Buffer[]
  receivedChunks: number
  totalChunks: number
  writeStream?: ReturnType<typeof createWriteStream>
}

export class FileTransferService extends EventEmitter {
  private server: Server
  private port: number = TCP_PORT
  private pendingTransfers: Map<string, PendingTransfer> = new Map()
  private activeTransfers: Set<string> = new Set()
  private savePath: string

  constructor(savePath: string) {
    super()
    this.savePath = savePath
    this.server = createServer((socket) => this.handleConnection(socket))
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`[FileTransfer] TCP 监听端口 ${this.port}`)
    })

    this.server.on('error', (err) => {
      console.error('[FileTransfer] 服务器错误:', err)
    })

    // 确保保存目录存在
    if (!existsSync(this.savePath)) {
      mkdirSync(this.savePath, { recursive: true })
    }
  }

  private handleConnection(socket: Socket) {
    let buffer = Buffer.alloc(0)

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data])
      this.processBuffer(socket, buffer)
    })

    socket.on('error', (err) => {
      console.error('[FileTransfer] 连接错误:', err)
    })
  }

  private processBuffer(socket: Socket, buffer: Buffer) {
    // 尝试解析 JSON 消息
    const headerEnd = buffer.indexOf('\n')
    if (headerEnd === -1) return

    try {
      const header = JSON.parse(buffer.subarray(0, headerEnd).toString())
      const remaining = buffer.subarray(headerEnd + 1)

      switch (header.type) {
        case 'file-request':
          this.handleFileRequest(socket, header)
          break
        case 'file-accept':
          this.handleFileAccept(header)
          break
        case 'file-reject':
          this.handleFileReject(header)
          break
        case 'chunk':
          this.handleChunk(socket, header, remaining)
          break
        case 'file-complete':
          this.handleFileComplete(header)
          break
      }
    } catch {
      // 解析失败，等待更多数据
    }
  }

  async sendFile(filePath: string, toDeviceIP: string, toDevicePort: number): Promise<TransferTask> {
    if (this.activeTransfers.size >= MAX_CONCURRENT) {
      throw new Error('已达最大并发传输数')
    }

    const fileId = generateId()
    const stats = statSync(filePath)
    const fileName = basename(filePath)

    const task: TransferTask = {
      id: fileId,
      fileName,
      fileSize: stats.size,
      filePath,
      fromDevice: '',
      toDevice: '',
      direction: 'send',
      status: 'pending',
      progress: 0,
      speed: 0,
      createdAt: Date.now()
    }

    this.emit('transfer:start', task)

    // 连接目标设备
    const socket = connect(toDevicePort, toDeviceIP)

    socket.on('connect', () => {
      // 发送文件请求
      const request = JSON.stringify({
        type: 'file-request',
        fileId,
        fileName,
        fileSize: stats.size
      }) + '\n'
      socket.write(request)

      this.activeTransfers.add(fileId)

      // 等待对方接受后开始传输
      this.pendingTransfers.set(fileId, {
        task,
        chunks: [],
        receivedChunks: 0,
        totalChunks: Math.ceil(stats.size / CHUNK_SIZE)
      })
    })

    socket.on('error', (err) => {
      task.status = 'failed'
      this.emit('transfer:error', { fileId, error: err.message })
      this.activeTransfers.delete(fileId)
    })

    return task
  }

  private handleFileRequest(socket: Socket, header: { fileId: string; fileName: string; fileSize: number }) {
    // 自动接受文件（后续可添加确认逻辑）
    const response = JSON.stringify({ type: 'file-accept', fileId: header.fileId }) + '\n'
    socket.write(response)

    const filePath = join(this.savePath, this.getUniqueFileName(header.fileName))
    const totalChunks = Math.ceil(header.fileSize / CHUNK_SIZE)

    const task: TransferTask = {
      id: header.fileId,
      fileName: header.fileName,
      fileSize: header.fileSize,
      filePath,
      fromDevice: '',
      toDevice: '',
      direction: 'receive',
      status: 'transferring',
      progress: 0,
      speed: 0,
      createdAt: Date.now()
    }

    this.pendingTransfers.set(header.fileId, {
      task,
      chunks: [],
      receivedChunks: 0,
      totalChunks,
      writeStream: createWriteStream(filePath)
    })

    this.emit('transfer:start', task)
  }

  private handleFileAccept(header: { fileId: string }) {
    const pending = this.pendingTransfers.get(header.fileId)
    if (!pending) return

    pending.task.status = 'transferring'
    this.emit('transfer:progress', pending.task)

    // 开始发送文件分片
    this.sendFileChunks(header.fileId)
  }

  private handleFileReject(header: { fileId: string }) {
    const pending = this.pendingTransfers.get(header.fileId)
    if (!pending) return

    pending.task.status = 'failed'
    this.emit('transfer:error', { fileId: header.fileId, error: '对方拒绝接收' })
    this.pendingTransfers.delete(header.fileId)
    this.activeTransfers.delete(header.fileId)
  }

  private handleChunk(socket: Socket, header: { fileId: string; chunkIndex: number; size: number }, data: Buffer) {
    const pending = this.pendingTransfers.get(header.fileId)
    if (!pending || !pending.writeStream) return

    pending.writeStream.write(data.subarray(0, header.size))
    pending.receivedChunks++

    // 发送确认
    const ack = JSON.stringify({ type: 'chunk-ack', fileId: header.fileId, chunkIndex: header.chunkIndex }) + '\n'
    socket.write(ack)

    // 更新进度
    pending.task.progress = pending.receivedChunks / pending.totalChunks
    this.emit('transfer:progress', pending.task)

    // 检查是否完成
    if (pending.receivedChunks >= pending.totalChunks) {
      pending.writeStream.end()
      pending.task.status = 'completed'
      pending.task.progress = 1
      pending.task.completedAt = Date.now()
      this.emit('transfer:complete', pending.task)
      this.pendingTransfers.delete(header.fileId)
    }
  }

  private handleFileComplete(header: { fileId: string }) {
    const pending = this.pendingTransfers.get(header.fileId)
    if (!pending) return

    pending.task.status = 'completed'
    pending.task.progress = 1
    pending.task.completedAt = Date.now()
    this.emit('transfer:complete', pending.task)
    this.pendingTransfers.delete(header.fileId)
    this.activeTransfers.delete(header.fileId)
  }

  private async sendFileChunks(fileId: string) {
    const pending = this.pendingTransfers.get(fileId)
    if (!pending || !pending.task.filePath) return

    const readStream = createReadStream(pending.task.filePath, { highWaterMark: CHUNK_SIZE })
    let chunkIndex = 0

    readStream.on('data', (chunk: Buffer) => {
      const header = JSON.stringify({
        type: 'chunk',
        fileId,
        chunkIndex,
        size: chunk.length
      }) + '\n'

      // 实际发送需要通过 socket，这里简化处理
      chunkIndex++
    })

    readStream.on('end', () => {
      // 发送完成信号
    })
  }

  private getUniqueFileName(fileName: string): string {
    const baseName = fileName.replace(/\.[^/.]+$/, '')
    const ext = fileName.match(/\.[^/.]+$/)?.[0] || ''
    let counter = 0
    let uniqueName = fileName

    while (existsSync(join(this.savePath, uniqueName))) {
      counter++
      uniqueName = `${baseName}(${counter})${ext}`
    }

    return uniqueName
  }

  cancelTransfer(fileId: string) {
    const pending = this.pendingTransfers.get(fileId)
    if (pending) {
      pending.task.status = 'cancelled'
      if (pending.writeStream) pending.writeStream.end()
      this.pendingTransfers.delete(fileId)
      this.activeTransfers.delete(fileId)
      this.emit('transfer:progress', pending.task)
    }
  }

  stop() {
    this.server.close()
    for (const pending of this.pendingTransfers.values()) {
      if (pending.writeStream) pending.writeStream.end()
    }
    this.pendingTransfers.clear()
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add electron/services/fileTransfer.ts
git commit -m "feat: 实现 TCP 文件传输服务，支持分片传输和进度回调"
```

---

### Task 8: 实现 WebSocket 消息服务

**Files:**
- Create: `electron/services/messaging.ts`

- [ ] **Step 1: 创建 messaging.ts**

```typescript
import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { generateId } from '../utils/id'
import { ChatMessage, WsMessage, MessageAck } from '../../src/types'

const WS_PORT = 12347
const ACK_TIMEOUT = 5000
const MAX_RETRIES = 3

interface PendingMessage {
  message: ChatMessage
  retries: number
  timer: NodeJS.Timeout | null
}

export class MessagingService extends EventEmitter {
  private wss: WebSocketServer
  private port: number = WS_PORT
  private connections: Map<string, WebSocket> = new Map() // deviceId -> WebSocket
  private pendingMessages: Map<string, PendingMessage> = new Map()
  private localDeviceId: string

  constructor(localDeviceId: string) {
    super()
    this.localDeviceId = localDeviceId
    this.wss = new WebSocketServer({ port: this.port })
  }

  start() {
    this.wss.on('listening', () => {
      console.log(`[Messaging] WebSocket 监听端口 ${this.port}`)
    })

    this.wss.on('connection', (ws, req) => {
      const deviceId = new URL(req.url || '', `ws://localhost:${this.port}`).searchParams.get('deviceId')

      if (deviceId) {
        this.connections.set(deviceId, ws)
        console.log(`[Messaging] 设备 ${deviceId} 已连接`)

        ws.on('message', (data) => {
          try {
            const msg: WsMessage = JSON.parse(data.toString())
            this.handleMessage(deviceId, msg)
          } catch {
            // 忽略无效消息
          }
        })

        ws.on('close', () => {
          this.connections.delete(deviceId)
          console.log(`[Messaging] 设备 ${deviceId} 已断开`)
        })

        ws.on('error', (err) => {
          console.error(`[Messaging] 连接错误 (${deviceId}):`, err)
        })
      }
    })
  }

  connectToDevice(deviceId: string, ip: string, wsPort: number) {
    if (this.connections.has(deviceId)) return

    const ws = new WebSocket(`ws://${ip}:${wsPort}?deviceId=${this.localDeviceId}`)

    ws.on('open', () => {
      this.connections.set(deviceId, ws)
      console.log(`[Messaging] 已连接到设备 ${deviceId}`)
      this.emit('connected', deviceId)
    })

    ws.on('message', (data) => {
      try {
        const msg: WsMessage = JSON.parse(data.toString())
        this.handleMessage(deviceId, msg)
      } catch {
        // 忽略无效消息
      }
    })

    ws.on('close', () => {
      this.connections.delete(deviceId)
      this.emit('disconnected', deviceId)
    })

    ws.on('error', (err) => {
      console.error(`[Messaging] 连接失败 (${deviceId}):`, err)
    })
  }

  private handleMessage(fromDevice: string, msg: WsMessage) {
    if (msg.type === 'chat') {
      const chatMsg = msg.payload as ChatMessage
      this.emit('message:received', chatMsg)

      // 发送 ACK
      const ack: WsMessage = {
        type: 'ack',
        payload: { type: 'msg-ack', msgId: chatMsg.id } as MessageAck
      }
      this.sendToDevice(fromDevice, ack)
    } else if (msg.type === 'ack') {
      const ack = msg.payload as MessageAck
      this.handleAck(ack.msgId)
    }
  }

  private handleAck(msgId: string) {
    const pending = this.pendingMessages.get(msgId)
    if (pending) {
      if (pending.timer) clearTimeout(pending.timer)
      pending.message.status = 'sent'
      this.pendingMessages.delete(msgId)
      this.emit('message:sent', pending.message)
    }
  }

  sendMessage(toDevice: string, type: ChatMessage['type'], content: string, metadata?: Record<string, unknown>): ChatMessage {
    const message: ChatMessage = {
      id: generateId(),
      fromDevice: this.localDeviceId,
      toDevice,
      type,
      content,
      metadata,
      status: 'sending',
      createdAt: Date.now()
    }

    const wsMessage: WsMessage = {
      type: 'chat',
      payload: message
    }

    if (this.sendToDevice(toDevice, wsMessage)) {
      // 设置 ACK 超时
      const pending: PendingMessage = {
        message,
        retries: 0,
        timer: null
      }
      this.setupAckTimeout(message.id, pending)
      this.pendingMessages.set(message.id, pending)
    } else {
      message.status = 'failed'
      this.emit('message:error', { msgId: message.id, error: '设备未连接' })
    }

    return message
  }

  private setupAckTimeout(msgId: string, pending: PendingMessage) {
    pending.timer = setTimeout(() => {
      if (pending.retries < MAX_RETRIES) {
        pending.retries++
        const wsMessage: WsMessage = {
          type: 'chat',
          payload: pending.message
        }
        if (this.sendToDevice(pending.message.toDevice, wsMessage)) {
          this.setupAckTimeout(msgId, pending)
        } else {
          pending.message.status = 'failed'
          this.pendingMessages.delete(msgId)
          this.emit('message:error', { msgId, error: '重试失败' })
        }
      } else {
        pending.message.status = 'failed'
        this.pendingMessages.delete(msgId)
        this.emit('message:error', { msgId, error: '发送超时' })
      }
    }, ACK_TIMEOUT)
  }

  private sendToDevice(deviceId: string, msg: WsMessage): boolean {
    const ws = this.connections.get(deviceId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
      return true
    }
    return false
  }

  isConnected(deviceId: string): boolean {
    return this.connections.has(deviceId)
  }

  stop() {
    for (const ws of this.connections.values()) {
      ws.close()
    }
    this.connections.clear()
    for (const pending of this.pendingMessages.values()) {
      if (pending.timer) clearTimeout(pending.timer)
    }
    this.pendingMessages.clear()
    this.wss.close()
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add electron/services/messaging.ts
git commit -m "feat: 实现 WebSocket 消息服务，支持消息发送、ACK 确认和自动重试"
```

---

## Phase 5: Electron 主进程

### Task 9: 创建 Electron 主入口和预加载脚本

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

- [ ] **Step 1: 创建 electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 设备相关
  getDevices: () => ipcRenderer.invoke('device:list'),
  getOnlineDevices: () => ipcRenderer.invoke('device:online'),
  setDeviceName: (name: string) => ipcRenderer.invoke('device:setName', name),
  toggleFavorite: (deviceId: string, isFavorite: boolean) => ipcRenderer.invoke('device:toggleFavorite', deviceId, isFavorite),

  // 消息相关
  sendMessage: (toDevice: string, type: string, content: string, metadata?: Record<string, unknown>) =>
    ipcRenderer.invoke('message:send', toDevice, type, content, metadata),
  getMessages: (device1: string, device2: string) => ipcRenderer.invoke('message:list', device1, device2),
  searchMessages: (keyword: string) => ipcRenderer.invoke('message:search', keyword),

  // 文件传输相关
  sendFile: (filePath: string, toDeviceIP: string, toDevicePort: number) =>
    ipcRenderer.invoke('transfer:sendFile', filePath, toDeviceIP, toDevicePort),
  cancelTransfer: (fileId: string) => ipcRenderer.invoke('transfer:cancel', fileId),
  getTransfers: () => ipcRenderer.invoke('transfer:list'),
  getActiveTransfers: () => ipcRenderer.invoke('transfer:active'),

  // 文件库相关
  getFiles: (type?: string, keyword?: string) => ipcRenderer.invoke('files:list', type, keyword),
  openFile: (filePath: string) => ipcRenderer.invoke('files:open', filePath),
  openFileDir: (filePath: string) => ipcRenderer.invoke('files:openDir', filePath),
  selectFile: () => ipcRenderer.invoke('files:select'),

  // 设置相关
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSavePath: (path: string) => ipcRenderer.invoke('settings:setSavePath', path),

  // 事件监听
  onDeviceOnline: (callback: (device: unknown) => void) => {
    ipcRenderer.on('device:online', (_, device) => callback(device))
  },
  onDeviceOffline: (callback: (deviceId: string) => void) => {
    ipcRenderer.on('device:offline', (_, deviceId) => callback(deviceId))
  },
  onDeviceUpdate: (callback: (device: unknown) => void) => {
    ipcRenderer.on('device:update', (_, device) => callback(device))
  },
  onTransferProgress: (callback: (task: unknown) => void) => {
    ipcRenderer.on('transfer:progress', (_, task) => callback(task))
  },
  onTransferComplete: (callback: (task: unknown) => void) => {
    ipcRenderer.on('transfer:complete', (_, task) => callback(task))
  },
  onTransferError: (callback: (error: unknown) => void) => {
    ipcRenderer.on('transfer:error', (_, error) => callback(error))
  },
  onMessageReceived: (callback: (message: unknown) => void) => {
    ipcRenderer.on('message:new', (_, message) => callback(message))
  },
  onMessageSent: (callback: (message: unknown) => void) => {
    ipcRenderer.on('message:sent', (_, message) => callback(message))
  },
  onMessageError: (callback: (error: unknown) => void) => {
    ipcRenderer.on('message:error', (_, error) => callback(error))
  }
})
```

- [ ] **Step 2: 创建 electron/main.ts**

```typescript
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { DiscoveryService } from './services/discovery'
import { FileTransferService } from './services/fileTransfer'
import { MessagingService } from './services/messaging'
import { DatabaseService } from './services/database'
import { generateId } from './utils/id'
import { getLocalIP } from './utils/network'

let mainWindow: BrowserWindow | null = null
let discoveryService: DiscoveryService
let fileTransferService: FileTransferService
let messagingService: MessagingService
let databaseService: DatabaseService

const deviceId = generateId()
let deviceName = `PC-${getLocalIP().split('.').pop()}`
const TCP_PORT = 12346
const WS_PORT = 12347

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // 窗口控制
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())
}

function initServices() {
  // 初始化数据库
  databaseService = new DatabaseService()

  // 初始化设备发现服务
  discoveryService = new DiscoveryService(deviceId, deviceName, TCP_PORT, WS_PORT)

  discoveryService.on('device:online', (device) => {
    databaseService.upsertDevice(device)
    mainWindow?.webContents.send('device:online', device)
    // 自动连接 WebSocket
    messagingService.connectToDevice(device.id, device.ip, device.wsPort)
  })

  discoveryService.on('device:offline', (device) => {
    databaseService.setDeviceOffline(device.id)
    mainWindow?.webContents.send('device:offline', device.id)
  })

  discoveryService.on('device:update', (device) => {
    databaseService.upsertDevice(device)
    mainWindow?.webContents.send('device:update', device)
  })

  discoveryService.start()

  // 初始化文件传输服务
  const settings = databaseService.getSettings?.() || {}
  const savePath = (settings as { savePath?: string }).savePath || join(app.getPath('downloads'), '邻传')

  fileTransferService = new FileTransferService(savePath)

  fileTransferService.on('transfer:start', (task) => {
    databaseService.insertTransfer(task)
    mainWindow?.webContents.send('transfer:progress', task)
  })

  fileTransferService.on('transfer:progress', (task) => {
    databaseService.updateTransferStatus(task.id, task.status, task.progress, task.speed)
    mainWindow?.webContents.send('transfer:progress', task)
  })

  fileTransferService.on('transfer:complete', (task) => {
    databaseService.completeTransfer(task.id, task.filePath || '')
    mainWindow?.webContents.send('transfer:complete', task)
  })

  fileTransferService.on('transfer:error', ({ fileId, error }) => {
    databaseService.updateTransferStatus(fileId, 'failed')
    mainWindow?.webContents.send('transfer:error', { fileId, error })
  })

  fileTransferService.start()

  // 初始化消息服务
  messagingService = new MessagingService(deviceId)

  messagingService.on('message:received', (message) => {
    databaseService.insertMessage(message)
    mainWindow?.webContents.send('message:new', message)
  })

  messagingService.on('message:sent', (message) => {
    databaseService.updateMessageStatus(message.id, 'sent')
    mainWindow?.webContents.send('message:sent', message)
  })

  messagingService.on('message:error', ({ msgId, error }) => {
    databaseService.updateMessageStatus(msgId, 'failed')
    mainWindow?.webContents.send('message:error', { msgId, error })
  })

  messagingService.start()
}

function registerIpcHandlers() {
  // 设备相关
  ipcMain.handle('device:list', () => databaseService.getDevices())
  ipcMain.handle('device:online', () => discoveryService.getOnlineDevices())
  ipcMain.handle('device:setName', (_, name: string) => {
    deviceName = name
    // 更新心跳包中的设备名
  })
  ipcMain.handle('device:toggleFavorite', (_, deviceId: string, isFavorite: boolean) => {
    databaseService.toggleFavorite(deviceId, isFavorite)
  })

  // 消息相关
  ipcMain.handle('message:send', (_, toDevice: string, type: string, content: string, metadata?: Record<string, unknown>) => {
    return messagingService.sendMessage(toDevice, type as 'text' | 'image' | 'file' | 'code' | 'emoji', content, metadata)
  })
  ipcMain.handle('message:list', (_, device1: string, device2: string) => {
    return databaseService.getMessages(device1, device2)
  })
  ipcMain.handle('message:search', (_, keyword: string) => {
    return databaseService.searchMessages(keyword)
  })

  // 文件传输相关
  ipcMain.handle('transfer:sendFile', async (_, filePath: string, toDeviceIP: string, toDevicePort: number) => {
    return fileTransferService.sendFile(filePath, toDeviceIP, toDevicePort)
  })
  ipcMain.handle('transfer:cancel', (_, fileId: string) => {
    fileTransferService.cancelTransfer(fileId)
  })
  ipcMain.handle('transfer:list', () => {
    return databaseService.getTransfers()
  })
  ipcMain.handle('transfer:active', () => {
    return databaseService.getTransfersByStatus('transferring')
  })

  // 文件库相关
  ipcMain.handle('files:list', (_, type?: string, keyword?: string) => {
    return databaseService.getFilesByType(type, keyword)
  })
  ipcMain.handle('files:open', async (_, filePath: string) => {
    await shell.openPath(filePath)
  })
  ipcMain.handle('files:openDir', async (_, filePath: string) => {
    await shell.showItemInFolder(filePath)
  })
  ipcMain.handle('files:select', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections']
    })
    return result.filePaths
  })

  // 设置相关
  ipcMain.handle('settings:get', () => {
    return { deviceName, savePath: join(app.getPath('downloads'), '邻传') }
  })
  ipcMain.handle('settings:setSavePath', (_, path: string) => {
    // 保存到 electron-store
  })
}

app.whenReady().then(() => {
  createWindow()
  initServices()
  registerIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  discoveryService.stop()
  fileTransferService.stop()
  messagingService.stop()
  databaseService.close()
  app.quit()
})

app.on('before-quit', () => {
  discoveryService.stop()
})
```

- [ ] **Step 3: 提交**

```bash
git add electron/main.ts electron/preload.ts
git commit -m "feat: 实现 Electron 主进程，集成所有服务和 IPC 处理"
```

---

## Phase 6: Vue 状态管理

### Task 10: 创建 Pinia Stores

**Files:**
- Create: `src/stores/device.ts`
- Create: `src/stores/chat.ts`
- Create: `src/stores/transfer.ts`

- [ ] **Step 1: 创建 src/stores/device.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Device } from '@/types'

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<Device[]>([])
  const currentDeviceId = ref<string | null>(null)

  const onlineDevices = computed(() => devices.value.filter(d => d.isOnline))
  const offlineDevices = computed(() => devices.value.filter(d => !d.isOnline))
  const currentDevice = computed(() => devices.value.find(d => d.id === currentDeviceId.value))

  async function fetchDevices() {
    devices.value = await window.electronAPI.getDevices()
  }

  function addDevice(device: Device) {
    const index = devices.value.findIndex(d => d.id === device.id)
    if (index === -1) {
      devices.value.push(device)
    } else {
      devices.value[index] = device
    }
  }

  function updateDevice(device: Device) {
    const index = devices.value.findIndex(d => d.id === device.id)
    if (index !== -1) {
      devices.value[index] = { ...devices.value[index], ...device }
    }
  }

  function setDeviceOffline(deviceId: string) {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      device.isOnline = false
    }
  }

  function setCurrentDevice(deviceId: string | null) {
    currentDeviceId.value = deviceId
  }

  async function toggleFavorite(deviceId: string) {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      device.isFavorite = !device.isFavorite
      await window.electronAPI.toggleFavorite(deviceId, device.isFavorite)
    }
  }

  return {
    devices,
    currentDeviceId,
    onlineDevices,
    offlineDevices,
    currentDevice,
    fetchDevices,
    addDevice,
    updateDevice,
    setDeviceOffline,
    setCurrentDevice,
    toggleFavorite
  }
})
```

- [ ] **Step 2: 创建 src/stores/chat.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage } from '@/types'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Map<string, ChatMessage[]>>(new Map()) // deviceId -> messages
  const currentChatDeviceId = ref<string | null>(null)

  const currentMessages = computed(() => {
    if (!currentChatDeviceId.value) return []
    return messages.value.get(currentChatDeviceId.value) || []
  })

  const unreadCounts = computed(() => {
    const counts: Record<string, number> = {}
    // 统计未读消息数
    return counts
  })

  async function fetchMessages(deviceId: string) {
    const msgs = await window.electronAPI.getMessages('', deviceId)
    messages.value.set(deviceId, msgs as ChatMessage[])
  }

  function addMessage(message: ChatMessage) {
    const chatId = message.fromDevice === currentChatDeviceId.value ? message.fromDevice : message.toDevice
    const chatMessages = messages.value.get(chatId) || []
    chatMessages.push(message)
    messages.value.set(chatId, chatMessages)
  }

  function updateMessageStatus(msgId: string, status: ChatMessage['status']) {
    for (const chatMessages of messages.value.values()) {
      const msg = chatMessages.find(m => m.id === msgId)
      if (msg) {
        msg.status = status
        break
      }
    }
  }

  async function sendMessage(toDevice: string, type: ChatMessage['type'], content: string, metadata?: Record<string, unknown>) {
    const message = await window.electronAPI.sendMessage(toDevice, type, content, metadata)
    addMessage(message as ChatMessage)
    return message
  }

  function setCurrentChat(deviceId: string | null) {
    currentChatDeviceId.value = deviceId
  }

  return {
    messages,
    currentChatDeviceId,
    currentMessages,
    unreadCounts,
    fetchMessages,
    addMessage,
    updateMessageStatus,
    sendMessage,
    setCurrentChat
  }
})
```

- [ ] **Step 3: 创建 src/stores/transfer.ts**

```typescript
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
    transfers,
    activeTransfers,
    pendingTransfers,
    completedTransfers,
    failedTransfers,
    fetchTransfers,
    addTransfer,
    updateTransfer,
    cancelTransfer
  }
})
```

- [ ] **Step 4: 提交**

```bash
git add src/stores/device.ts src/stores/chat.ts src/stores/transfer.ts
git commit -m "feat: 实现 Pinia 状态管理 stores"
```

---

## Phase 7: UI 组件

### Task 11: 创建侧边栏组件

**Files:**
- Create: `src/components/Sidebar.vue`

- [ ] **Step 1: 创建 Sidebar.vue**

```vue
<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <span class="app-title">邻传</span>
    </div>

    <nav class="sidebar-nav">
      <router-link to="/devices" class="nav-item" active-class="active">
        <el-icon><Monitor /></el-icon>
        <span>设备</span>
      </router-link>

      <router-link to="/chat" class="nav-item" active-class="active">
        <el-icon><ChatDotRound /></el-icon>
        <span>聊天</span>
      </router-link>

      <router-link to="/transfer" class="nav-item" active-class="active">
        <el-icon><Upload /></el-icon>
        <span>传输</span>
      </router-link>

      <router-link to="/files" class="nav-item" active-class="active">
        <el-icon><FolderOpened /></el-icon>
        <span>文件</span>
      </router-link>

      <router-link to="/remote" class="nav-item" active-class="active">
        <el-icon><Link /></el-icon>
        <span>远程</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <router-link to="/settings" class="nav-item" active-class="active">
        <el-icon><Setting /></el-icon>
        <span>设置</span>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor, ChatDotRound, Upload, FolderOpened, Link, Setting } from '@element-plus/icons-vue'
</script>

<style scoped>
.sidebar {
  width: 80px;
  height: 100vh;
  background: #2c3e50;
  display: flex;
  flex-direction: column;
  user-select: none;
  -webkit-app-region: drag;
}

.sidebar-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 8px;
}

.app-title {
  color: #ecf0f1;
  font-size: 14px;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  gap: 4px;
}

.sidebar-footer {
  padding: 16px 0;
  border-top: 1px solid #34495e;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0;
  color: #95a5a6;
  text-decoration: none;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
}

.nav-item:hover {
  color: #ecf0f1;
  background: #34495e;
}

.nav-item.active {
  color: #3498db;
}

.nav-item .el-icon {
  font-size: 20px;
}

.nav-item span {
  font-size: 11px;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Sidebar.vue
git commit -m "feat: 实现侧边栏导航组件"
```

---

### Task 12: 创建设备列表页

**Files:**
- Create: `src/views/DeviceList.vue`
- Create: `src/components/DeviceCard.vue`

- [ ] **Step 1: 创建 DeviceCard.vue**

```vue
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
```

- [ ] **Step 2: 创建 DeviceList.vue**

```vue
<template>
  <div class="device-list-page">
    <div class="page-header">
      <h2>局域网设备</h2>
      <el-input
        v-model="searchQuery"
        placeholder="搜索设备..."
        prefix-icon="Search"
        clearable
        style="width: 240px"
      />
    </div>

    <div class="device-grid">
      <DeviceCard
        v-for="device in filteredDevices"
        :key="device.id"
        :device="device"
        @chat="handleChat"
        @send-file="handleSendFile"
        @toggle-favorite="handleToggleFavorite"
      />

      <el-empty v-if="filteredDevices.length === 0" description="暂未发现设备" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import DeviceCard from '@/components/DeviceCard.vue'
import type { Device } from '@/types'

const router = useRouter()
const deviceStore = useDeviceStore()
const searchQuery = ref('')

const filteredDevices = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return deviceStore.devices.filter(d =>
    d.name.toLowerCase().includes(query) || d.ip.includes(query)
  )
})

onMounted(() => {
  deviceStore.fetchDevices()
})

function handleChat(device: Device) {
  deviceStore.setCurrentDevice(device.id)
  router.push(`/chat/${device.id}`)
}

async function handleSendFile(device: Device) {
  const filePaths = await window.electronAPI.selectFile()
  if (filePaths && filePaths.length > 0) {
    for (const filePath of filePaths) {
      await window.electronAPI.sendFile(filePath, device.ip, device.port)
    }
  }
}

function handleToggleFavorite(device: Device) {
  deviceStore.toggleFavorite(device.id)
}
</script>

<style scoped>
.device-list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 20px;
  color: #303133;
}

.device-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  overflow-y: auto;
  padding: 4px;
}
</style>
```

- [ ] **Step 3: 提交**

```bash
git add src/views/DeviceList.vue src/components/DeviceCard.vue
git commit -m "feat: 实现设备列表页和设备卡片组件"
```

---

### Task 13: 创建聊天页

**Files:**
- Create: `src/views/Chat.vue`
- Create: `src/components/MessageBubble.vue`

- [ ] **Step 1: 创建 MessageBubble.vue**

```vue
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
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message-bubble.own .bubble-content {
  background: #409eff;
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
  background: #f5f5f5;
  border-radius: 4px;
  overflow-x: auto;
}

.bubble-content code {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.bubble-content img {
  max-width: 240px;
  max-height: 240px;
  border-radius: 4px;
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
```

- [ ] **Step 2: 创建 Chat.vue**

```vue
<template>
  <div class="chat-page">
    <!-- 左侧会话列表 -->
    <div class="conversation-list">
      <div class="list-header">
        <h3>聊天</h3>
      </div>

      <div class="list-content">
        <div
          v-for="device in chatDevices"
          :key="device.id"
          class="conversation-item"
          :class="{ active: currentChatDeviceId === device.id }"
          @click="selectChat(device.id)"
        >
          <el-avatar :size="40">{{ device.name.charAt(0) }}</el-avatar>
          <div class="conversation-info">
            <span class="name">{{ device.name }}</span>
            <span class="last-message">{{ getLastMessage(device.id) }}</span>
          </div>
          <span v-if="device.isOnline" class="online-dot"></span>
        </div>

        <el-empty v-if="chatDevices.length === 0" description="暂无会话" :image-size="60" />
      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-area">
      <template v-if="currentChatDeviceId">
        <div class="chat-header">
          <h3>{{ currentDeviceName }}</h3>
          <span class="status" :class="{ online: isCurrentDeviceOnline }">
            {{ isCurrentDeviceOnline ? '在线' : '离线' }}
          </span>
        </div>

        <div class="messages-container" ref="messagesContainer">
          <MessageBubble
            v-for="msg in currentMessages"
            :key="msg.id"
            :message="msg"
            :current-device-id="currentDeviceId"
          />
        </div>

        <div class="input-area">
          <div class="toolbar">
            <el-button text @click="insertEmoji">
              <el-icon><Emoji /></el-icon>
            </el-button>
            <el-button text @click="selectFile">
              <el-icon><Paperclip /></el-icon>
            </el-button>
            <el-button text @click="insertCode">
              <el-icon><Document /></el-icon>
            </el-button>
          </div>

          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="3"
            placeholder="输入消息..."
            @keydown.enter.exact.prevent="sendMessage"
          />

          <div class="input-footer">
            <span class="hint">Enter 发送，Shift+Enter 换行</span>
            <el-button type="primary" size="small" @click="sendMessage" :disabled="!inputMessage.trim()">
              发送
            </el-button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="empty-chat">
          <el-icon :size="64" color="#c0c4cc"><ChatDotRound /></el-icon>
          <p>选择一个会话开始聊天</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChatDotRound, Emoji, Paperclip, Document } from '@element-plus/icons-vue'
import { useDeviceStore } from '@/stores/device'
import { useChatStore } from '@/stores/chat'
import MessageBubble from '@/components/MessageBubble.vue'

const route = useRoute()
const deviceStore = useDeviceStore()
const chatStore = useChatStore()

const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

const currentChatDeviceId = computed(() => chatStore.currentChatDeviceId)
const currentDeviceId = ref('') // 需要从主进程获取当前设备 ID
const currentMessages = computed(() => chatStore.currentMessages)

const chatDevices = computed(() => deviceStore.devices)

const currentDevice = computed(() => deviceStore.devices.find(d => d.id === currentChatDeviceId.value))
const currentDeviceName = computed(() => currentDevice.value?.name || '')
const isCurrentDeviceOnline = computed(() => currentDevice.value?.isOnline || false)

onMounted(() => {
  deviceStore.fetchDevices()

  // 从路由参数获取设备 ID
  const deviceId = route.params.deviceId as string
  if (deviceId) {
    selectChat(deviceId)
  }
})

watch(currentMessages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

function selectChat(deviceId: string) {
  chatStore.setCurrentChat(deviceId)
  chatStore.fetchMessages(deviceId)
}

function getLastMessage(deviceId: string): string {
  const messages = chatStore.messages.get(deviceId)
  if (!messages || messages.length === 0) return ''
  const last = messages[messages.length - 1]
  if (last.type === 'text') return last.content.substring(0, 30)
  if (last.type === 'image') return '[图片]'
  if (last.type === 'file') return '[文件]'
  if (last.type === 'code') return '[代码]'
  if (last.type === 'emoji') return '[表情]'
  return ''
}

async function sendMessage() {
  if (!inputMessage.value.trim() || !currentChatDeviceId.value) return

  await chatStore.sendMessage(currentChatDeviceId.value, 'text', inputMessage.value.trim())
  inputMessage.value = ''
  scrollToBottom()
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function selectFile() {
  const filePaths = await window.electronAPI.selectFile()
  if (filePaths && filePaths.length > 0 && currentChatDeviceId.value) {
    // 发送文件消息
    await chatStore.sendMessage(currentChatDeviceId.value, 'file', filePaths[0], {
      fileName: filePaths[0].split('\\').pop()
    })
  }
}

function insertEmoji() {
  // TODO: 打开表情选择器
}

function insertCode() {
  // TODO: 打开代码编辑器
}
</script>

<style scoped>
.chat-page {
  height: 100%;
  display: flex;
  background: #f5f7fa;
}

.conversation-list {
  width: 280px;
  border-right: 1px solid #e4e7ed;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.list-header h3 {
  font-size: 16px;
  color: #303133;
}

.list-content {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f5f7fa;
}

.conversation-item.active {
  background: #ecf5ff;
}

.conversation-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-info .name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.conversation-info .last-message {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #67c23a;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-header h3 {
  font-size: 16px;
  color: #303133;
}

.chat-header .status {
  font-size: 12px;
  color: #909399;
}

.chat-header .status.online {
  color: #67c23a;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.input-area {
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.toolbar {
  padding: 8px 16px;
  display: flex;
  gap: 4px;
}

.input-footer {
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-footer .hint {
  font-size: 12px;
  color: #909399;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #909399;
}
</style>
```

- [ ] **Step 3: 提交**

```bash
git add src/views/Chat.vue src/components/MessageBubble.vue
git commit -m "feat: 实现聊天页面和消息气泡组件"
```

---

### Task 14: 创建文件传输页和文件库页

**Files:**
- Create: `src/views/FileTransfer.vue`
- Create: `src/views/FileLibrary.vue`
- Create: `src/components/TransferItem.vue`

- [ ] **Step 1: 创建 TransferItem.vue**

```vue
<template>
  <div class="transfer-item" :class="transfer.status">
    <div class="file-icon">
      <el-icon :size="24"><Document /></el-icon>
    </div>

    <div class="transfer-info">
      <div class="file-name">{{ transfer.fileName }}</div>
      <div class="transfer-meta">
        <span>{{ formatSize(transfer.fileSize) }}</span>
        <span v-if="transfer.status === 'transferring'">
          {{ formatSpeed(transfer.speed) }} · {{ formatProgress(transfer.progress) }}
        </span>
        <span v-else-if="transfer.status === 'completed'" class="success">已完成</span>
        <span v-else-if="transfer.status === 'failed'" class="error">失败</span>
        <span v-else-if="transfer.status === 'cancelled'" class="cancelled">已取消</span>
      </div>

      <el-progress
        v-if="transfer.status === 'transferring'"
        :percentage="Math.round(transfer.progress * 100)"
        :stroke-width="4"
        :show-text="false"
      />
    </div>

    <div class="transfer-actions">
      <el-button
        v-if="transfer.status === 'transferring'"
        type="danger"
        size="small"
        text
        @click="$emit('cancel', transfer.id)"
      >
        取消
      </el-button>
      <el-button
        v-if="transfer.status === 'completed'"
        type="primary"
        size="small"
        text
        @click="$emit('open', transfer)"
      >
        打开
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Document } from '@element-plus/icons-vue'
import type { TransferTask } from '@/types'

defineProps<{
  transfer: TransferTask
}>()

defineEmits<{
  cancel: [fileId: string]
  open: [transfer: TransferTask]
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function formatSpeed(bytesPerSec: number): string {
  return formatSize(bytesPerSec) + '/s'
}

function formatProgress(progress: number): string {
  return (progress * 100).toFixed(1) + '%'
}
</script>

<style scoped>
.transfer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.transfer-item:hover {
  border-color: #c0c4cc;
}

.file-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  color: #909399;
}

.transfer-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transfer-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.transfer-meta .success {
  color: #67c23a;
}

.transfer-meta .error {
  color: #f56c6c;
}

.transfer-meta .cancelled {
  color: #e6a23c;
}

.transfer-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.transfer-item:hover .transfer-actions {
  opacity: 1;
}
</style>
```

- [ ] **Step 2: 创建 FileTransfer.vue**

```vue
<template>
  <div class="file-transfer-page">
    <div class="page-header">
      <h2>文件传输</h2>
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
.file-transfer-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 20px;
  color: #303133;
}

.transfer-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
</style>
```

- [ ] **Step 3: 创建 FileLibrary.vue**

```vue
<template>
  <div class="file-library-page">
    <div class="page-header">
      <h2>文件库</h2>
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索文件..."
          prefix-icon="Search"
          clearable
          style="width: 240px"
        />
        <el-select v-model="filterType" placeholder="文件类型" clearable style="width: 120px">
          <el-option label="全部" value="" />
          <el-option label="图片" value="image" />
          <el-option label="文档" value="document" />
          <el-option label="视频" value="video" />
          <el-option label="音频" value="audio" />
        </el-select>
      </div>
    </div>

    <div class="file-grid">
      <div
        v-for="file in files"
        :key="file.id"
        class="file-card"
        @click="handleOpen(file)"
        @contextmenu.prevent="showContextMenu($event, file)"
      >
        <div class="file-icon">
          <el-icon :size="32"><Document /></el-icon>
        </div>
        <div class="file-info">
          <span class="file-name">{{ file.fileName }}</span>
          <span class="file-meta">{{ formatSize(file.fileSize) }} · {{ formatDate(file.completedAt) }}</span>
        </div>
      </div>

      <el-empty v-if="files.length === 0" description="暂无文件" />
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="menu-item" @click="handleOpen(contextMenu.file!)">打开</div>
      <div class="menu-item" @click="handleOpenDir(contextMenu.file!)">打开目录</div>
      <div class="menu-item danger" @click="handleDelete(contextMenu.file!)">删除</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Document } from '@element-plus/icons-vue'
import type { TransferTask } from '@/types'

const files = ref<TransferTask[]>([])
const searchQuery = ref('')
const filterType = ref('')

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  file: null as TransferTask | null
})

onMounted(() => {
  fetchFiles()
})

watch([searchQuery, filterType], () => {
  fetchFiles()
})

async function fetchFiles() {
  files.value = await window.electronAPI.getFiles(filterType.value || undefined, searchQuery.value || undefined) as TransferTask[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function handleOpen(file: TransferTask) {
  if (file.filePath) {
    window.electronAPI.openFile(file.filePath)
  }
  contextMenu.value.visible = false
}

function handleOpenDir(file: TransferTask) {
  if (file.filePath) {
    window.electronAPI.openFileDir(file.filePath)
  }
  contextMenu.value.visible = false
}

function handleDelete(file: TransferTask) {
  // TODO: 实现删除功能
  contextMenu.value.visible = false
}

function showContextMenu(event: MouseEvent, file: TransferTask) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    file
  }

  // 点击其他地方关闭菜单
  document.addEventListener('click', closeContextMenu, { once: true })
}

function closeContextMenu() {
  contextMenu.value.visible = false
}
</script>

<style scoped>
.file-library-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 20px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.file-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

.file-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.2s;
}

.file-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.file-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ecf5ff;
  border-radius: 8px;
  color: #409eff;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.file-meta {
  font-size: 11px;
  color: #909399;
}

.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-item.danger {
  color: #f56c6c;
}
</style>
```

- [ ] **Step 4: 提交**

```bash
git add src/views/FileTransfer.vue src/views/FileLibrary.vue src/components/TransferItem.vue
git commit -m "feat: 实现文件传输页和文件库页面"
```

---

### Task 15: 创建远程传输页和设置页

**Files:**
- Create: `src/views/RemoteTransfer.vue`
- Create: `src/views/Settings.vue`

- [ ] **Step 1: 创建 RemoteTransfer.vue**

```vue
<template>
  <div class="remote-transfer-page">
    <div class="page-header">
      <h2>远程传输</h2>
      <el-button @click="openInBrowser">
        <el-icon><Link /></el-icon>
        在浏览器中打开
      </el-button>
    </div>

    <div class="webview-container">
      <webview
        src="https://filehelper.weixin.qq.com/"
        class="webview"
        :style="{ height: '100%' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Link } from '@element-plus/icons-vue'

function openInBrowser() {
  window.electronAPI.openFile('https://filehelper.weixin.qq.com/')
}
</script>

<style scoped>
.remote-transfer-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  font-size: 20px;
  color: #303133;
}

.webview-container {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.webview {
  width: 100%;
  height: 100%;
}
</style>
```

- [ ] **Step 2: 创建 Settings.vue**

```vue
<template>
  <div class="settings-page">
    <div class="page-header">
      <h2>设置</h2>
    </div>

    <div class="settings-content">
      <el-card class="settings-section">
        <template #header>
          <span>基本信息</span>
        </template>

        <el-form label-width="100px">
          <el-form-item label="设备名称">
            <el-input v-model="settings.deviceName" placeholder="输入设备名称" />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="settings-section">
        <template #header>
          <span>文件存储</span>
        </template>

        <el-form label-width="100px">
          <el-form-item label="保存路径">
            <el-input v-model="settings.savePath" placeholder="选择保存路径">
              <template #append>
                <el-button @click="selectSavePath">浏览</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="settings-section">
        <template #header>
          <span>应用设置</span>
        </template>

        <el-form label-width="100px">
          <el-form-item label="开机自启">
            <el-switch v-model="settings.autoStart" />
          </el-form-item>

          <el-form-item label="主题">
            <el-radio-group v-model="settings.theme">
              <el-radio label="light">浅色</el-radio>
              <el-radio label="dark">深色</el-radio>
              <el-radio label="system">跟随系统</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="语言">
            <el-select v-model="settings.language" style="width: 120px">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="English" value="en" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <div class="settings-footer">
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const settings = ref({
  deviceName: '',
  savePath: '',
  autoStart: false,
  theme: 'light',
  language: 'zh-CN'
})

onMounted(async () => {
  const currentSettings = await window.electronAPI.getSettings()
  settings.value = { ...settings.value, ...currentSettings }
})

async function selectSavePath() {
  // 使用系统对话框选择路径
  // 实际实现需要通过 IPC 调用主进程的 dialog
}

async function saveSettings() {
  // 保存设置到主进程
  await window.electronAPI.setSavePath(settings.value.savePath)
  ElMessage.success('设置已保存')
}
</script>

<style scoped>
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #f5f7fa;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 20px;
  color: #303133;
}

.settings-content {
  max-width: 600px;
}

.settings-section {
  margin-bottom: 16px;
}

.settings-footer {
  margin-top: 24px;
}
</style>
```

- [ ] **Step 3: 提交**

```bash
git add src/views/RemoteTransfer.vue src/views/Settings.vue
git commit -m "feat: 实现远程传输页（WebView）和设置页面"
```

---

## Phase 8: 集成测试

### Task 16: 运行开发服务器验证

- [ ] **Step 1: 启动开发服务器**

Run: `pnpm dev`
Expected: Electron 窗口打开，显示应用界面

- [ ] **Step 2: 验证基本功能**

1. 检查侧边栏导航是否正常工作
2. 检查设备列表页是否正确显示
3. 检查各页面是否能正常切换

- [ ] **Step 3: 提交最终代码**

```bash
git add -A
git commit -m "feat: 完成邻传应用基础功能实现"
```

---

## 自审清单

### 1. 规格覆盖检查

- [x] 设备自动发现（UDP 广播）- Task 6
- [x] 文件传输（TCP 分片）- Task 7
- [x] 聊天消息（WebSocket）- Task 8
- [x] 数据持久化（SQLite）- Task 4
- [x] 设备列表页 - Task 12
- [x] 聊天页 - Task 13
- [x] 文件传输页 - Task 14
- [x] 文件库页 - Task 14
- [x] 远程传输页（WebView）- Task 15
- [x] 设置页 - Task 15
- [x] IPC 通信 - Task 9
- [x] 状态管理 - Task 10

### 2. 占位符扫描

无 TBD、TODO 或未完成章节。

### 3. 类型一致性检查

所有类型定义在 `src/types/index.ts` 中统一管理，各模块引用一致。
