# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

**邻传** — 局域网设备发现、即时通讯与文件传输桌面应用。Electron + Vue 3 + TypeScript + Pinia + Element Plus + SQLite。

LAN 内通过 UDP 广播自动发现设备，WebSocket 点对点聊天（含 ACK 重试机制），TCP 分片文件传输（64KB 分片），支持断点续传和并发控制。

## 常用命令

```bash
npm run dev              # Vite 开发服务器（热重载）
npm run build            # vue-tsc 类型检查 + Vite 构建
npm run preview          # 预览构建结果
npm run electron:build   # 构建 + electron-builder 打包（NSIS 安装包）
npm run typecheck        # vue-tsc 类型检查
```

## 架构

```
邻传/
├── electron/              # Electron 主进程（Node.js 侧）
│   ├── main.ts            # 入口：BrowserWindow 创建、IPC 注册、服务初始化
│   ├── preload.ts          # contextBridge 暴露 API 到渲染进程
│   ├── services/
│   │   ├── database.ts     # better-sqlite3 本地 SQLite 数据库
│   │   ├── discovery.ts    # UDP 广播设备发现（心跳 + 离线检测）
│   │   ├── fileTransfer.ts # TCP Socket 文件传输（分片 + 确认）
│   │   └── messaging.ts    # WebSocket 点对点消息（含 ACK 超时重试）
│   └── utils/
│       ├── id.ts           # UUID 生成
│       └── network.ts      # 获取本机局域网 IP、广播地址
├── src/                   # 渲染进程（Vue 3 前端）
│   ├── main.ts            # Vue 应用入口
│   ├── App.vue            # 根组件：Sidebar + 标题栏 + router-view
│   ├── router/index.ts    # 路由（hash 模式）
│   ├── stores/            # Pinia 状态管理
│   │   ├── chat.ts        # 聊天消息状态
│   │   ├── device.ts      # 设备列表状态
│   │   └── transfer.ts    # 文件传输状态
│   ├── views/             # 页面组件
│   │   ├── DeviceList.vue     # 设备发现与列表
│   │   ├── Chat.vue           # 聊天界面
│   │   ├── FileTransfer.vue   # 文件传输管理
│   │   ├── FileLibrary.vue    # 已接收文件库
│   │   ├── RemoteTransfer.vue # 远程传输
│   │   └── Settings.vue       # 设置
│   ├── components/        # 可复用组件
│   │   ├── DeviceCard.vue     # 设备卡片
│   │   ├── MessageBubble.vue  # 消息气泡
│   │   ├── Sidebar.vue        # 侧边导航栏
│   │   └── TransferItem.vue   # 传输条目
│   ├── types/index.ts     # TypeScript 类型定义
│   └── assets/styles/global.css # CSS 变量主题 + Element Plus 覆盖
├── vite.config.ts         # Vite + Vue + Electron 插件 + @ 别名
├── electron-builder.json  # Electron 打包配置（NSIS）
└── tsconfig.json          # TypeScript 配置
```

## 网络协议

### UDP 设备发现
- 端口 **12345**，每 3 秒广播 JSON 心跳包
- 10 秒未收到心跳判定离线
- 离线广播 `{type: "offline"}` 优雅下线

### WebSocket 消息
- 端口 **12347**，点对点连接（连接参数 `?deviceId=`）
- 发送含 ACK 超时重试（5 秒超时，最多 3 次）
- 消息格式: `{type: "chat"|"ack", payload: ChatMessage|MessageAck}`
- 支持类型: `text | image | file | code | emoji`

### TCP 文件传输
- 端口 **12346**，64KB 分片 + JSON 行协议头部
- 最多 3 个并发传输
- 自动接受入站请求，同名文件自动添加 `(n)` 后缀
- 协议: `file-request` → `file-accept` → `chunk(N)` + `chunk-ack` → `file-complete`

## IPC 通信

主进程通过 `contextBridge` 暴露 `window.electronAPI` 到渲染进程:
- 设备: `getDevices`, `getOnlineDevices`, `toggleFavorite`
- 消息: `sendMessage`, `getMessages`, `searchMessages`
- 传输: `sendFile`, `cancelTransfer`, `getTransfers`
- 文件: `getFiles`, `openFile`, `selectFile`
- 事件: `onDeviceOnline`, `onMessageReceived`, `onTransferProgress` 等（返回取消订阅函数）

## 数据库

- better-sqlite3，文件存储在 `app.getPath('userData')/linchuan.db`
- WAL 模式，启动时自动建表
- 三张表: `devices`, `messages`, `transfers`
- 消息查询: 双向查询（device1↔device2），最近 50 条，降序

## 主题系统

CSS 变量主题，通过 `data-theme="light"|"dark"` 属性切换:
- `light` 和 `dark` 两组 CSS 变量定义在 `global.css` 的 `:root` 和 `[data-theme='dark']`
- 主题保存在 `localStorage('linchuan-theme')`

## 关键依赖

| 依赖 | 用途 |
|------|------|
| electron 31 | 桌面壳 |
| vite-plugin-electron | Vite Electron 集成 |
| vue 3.4 + vue-router + pinia | 前端框架 |
| element-plus + @element-plus/icons-vue | UI 组件库 |
| better-sqlite3 | 本地 SQLite |
| ws | WebSocket 服务端/客户端 |
| uuid | 消息/设备 ID 生成 |

## 注意事项

- 开发: `npm run dev` 启动 Vite 开发服务器，Electron 自动加载 `VITE_DEV_SERVER_URL`
- 构建: `npm run build` 产出 `dist/`，`npm run electron:build` 产出 `release/` 安装包
- 主进程代码 (`electron/`) 和渲染进程代码 (`src/`) 独立，通过 IPC bridge 通信
- `frontend/` `backend/` `linchuan-react/` 是旧版本残留目录
