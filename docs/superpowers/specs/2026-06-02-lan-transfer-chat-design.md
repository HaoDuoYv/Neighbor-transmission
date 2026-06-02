# 邻传 — 局域网文件传输与聊天应用设计文档

## 概述

邻传是一款面向办公室/团队内部的桌面应用，核心功能是局域网内的设备自动发现、文件传输和实时聊天。采用纯 P2P 网状架构，无需中心服务器。

## 技术栈

| 层面 | 技术方案 |
|------|----------|
| 桌面容器 | Electron |
| 前端框架 | Vue 3 |
| 开发语言 | TypeScript |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 构建工具 | Vite |
| 国际化 | vue-i18n |
| 数据存储 | electron-store + SQLite (better-sqlite3) |

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────┐
│                  Electron 主进程                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────────┐  │
│  │ 发现服务   │ │ 文件传输   │ │ 消息服务       │  │
│  │ UDP广播    │ │ TCP Server│ │ WebSocket Srv │  │
│  └───────────┘ └───────────┘ └───────────────┘  │
│         │              │              │          │
│  ┌─────────────────────────────────────────────┐ │
│  │              数据层 (electron-store)          │ │
│  │   联系人 │ 传输记录 │ 消息历史 │ 文件索引     │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
         ↕ IPC ↕
┌─────────────────────────────────────────────────┐
│               Electron 渲染进程 (Vue 3)          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │ 设备列表 │ │ 聊天界面 │ │ 文件传输 │ │ 文件库 │ │
│  │         │ │         │ │ 进度    │ │ 管理器 │ │
│  └─────────┘ └─────────┘ └─────────┘ └───────┘ │
│           Pinia 状态管理 │ Vue Router            │
└─────────────────────────────────────────────────┘
```

### 核心模块职责

| 模块 | 职责 | 运行位置 |
|------|------|----------|
| 发现服务 | UDP 广播/监听，维护在线设备列表 | 主进程 |
| 文件传输服务 | TCP Server/Client，文件分片、断点续传 | 主进程 |
| 消息服务 | WebSocket Server/Client，消息收发 | 主进程 |
| 数据层 | electron-store 配置，SQLite 存消息/文件索引 | 主进程 |
| UI 层 | Vue 3 + Element Plus，通过 IPC 与主进程通信 | 渲染进程 |

### 进程间通信

渲染进程通过 `ipcRenderer.invoke()` 调用主进程服务，主进程通过 `ipcMain.handle()` 响应并通过 `webContents.send()` 推送事件。

## 网络协议设计

### 设备发现（UDP 广播）

- 端口：12345
- 广播间隔：3 秒
- 离线判定：超过 10 秒未收到心跳

心跳包格式：
```json
{
  "type": "heartbeat",
  "deviceId": "uuid-xxx",
  "deviceName": "张三的电脑",
  "ip": "192.168.1.100",
  "port": 12346,
  "wsPort": 12347,
  "avatar": "base64...",
  "timestamp": 1717286400
}
```

设备退出时广播 `offline` 事件。

### 文件传输（TCP）

- 端口：12346
- 分片大小：64KB
- 并发上限：3 个同时传输任务

传输流程：
1. 发送方发起请求 → `{ type: "file-request", fileName, fileSize, fileId }`
2. 接收方响应 → `{ type: "file-accept" / "file-reject" }`
3. 发送方分片传输 → 每片带序号和校验
4. 接收方确认 → `{ type: "chunk-ack", chunkIndex }`
5. 传输完成 → `{ type: "file-complete", fileId }`

断点续传：接收方记录已收到分片，重连后发送 `{ type: "resume", fileId, lastChunkIndex }`。

### 聊天消息（WebSocket）

- 端口：12347
- 消息确认：发送后等待 ACK，超时 5 秒重试，最多 3 次

消息格式：
```json
{
  "type": "text | image | file | code | emoji",
  "msgId": "uuid-xxx",
  "from": "deviceId",
  "to": "deviceId",
  "content": "消息内容",
  "metadata": {},
  "timestamp": 1717286400
}
```

## 数据持久化

### 存储方案

| 数据类型 | 存储方式 | 原因 |
|----------|----------|------|
| 应用配置 | electron-store (JSON) | 轻量键值对 |
| 消息历史 | SQLite | 结构化查询，支持搜索 |
| 文件传输记录 | SQLite | 按时间/设备筛选 |
| 文件索引 | SQLite | 全文搜索 |
| 接收的文件 | 文件系统 | 指定目录保存 |

### 数据库表设计

**消息表 (messages)**
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  from_device TEXT NOT NULL,
  to_device TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  metadata TEXT,
  status TEXT DEFAULT 'sent',
  created_at INTEGER NOT NULL
);
```

**文件传输记录表 (transfers)**
```sql
CREATE TABLE transfers (
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
```

**设备表 (devices)**
```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip TEXT,
  avatar TEXT,
  last_seen INTEGER,
  is_favorite BOOLEAN DEFAULT 0
);
```

## 界面设计

### 主窗口布局

左侧导航栏 + 右侧内容区域，包含以下页面：

```
┌────────┬────────────────────────────────────────────┐
│  [≡]  邻传                           [—] [□] [×]   │
├────────┼────────────────────────────────────────────┤
│ 🖥 设备 │     根据左侧选择切换内容区域                  │
│ 💬 聊天 │                                            │
│ 📁 文件 │                                            │
│ 🌐 远程 │                                            │
│ ⚙ 设置 │                                            │
└────────┴────────────────────────────────────────────┘
```

### 核心页面

**1. 设备列表页**
- 在线设备卡片展示（头像、名称、IP）
- 绿点在线，灰点离线
- 点击设备可发起聊天或发送文件
- 支持拖拽文件到设备卡片直接发送

**2. 聊天页**
- 左侧会话列表，右侧消息区域
- 消息气泡区分自己/对方
- 支持文字、图片、文件、代码、表情
- 输入框支持拖拽文件、粘贴图片
- 代码消息带语法高亮

**3. 文件传输页**
- 正在传输的任务（进度条、速度、剩余时间）
- 传输历史记录
- 支持暂停/取消/重试

**4. 文件库页**
- 按时间线展示所有接收/发送的文件
- 顶部搜索栏
- 分类筛选（图片/文档/视频/其他）
- 右键菜单：打开、打开目录、删除

**5. 远程传输页**
- 默认在应用内嵌 WebView 加载 `https://filehelper.weixin.qq.com/`
- 右上角"在浏览器中打开"按钮，可跳转系统默认浏览器
- 用于跨网络场景（不在同一局域网时通过微信传输助手中转）

**6. 设置页**
- 设备昵称修改
- 接收文件存储路径
- 开机自启动
- 主题切换（浅色/深色）
- 语言切换

## 错误处理与边界情况

### 网络异常

| 场景 | 处理方式 |
|------|----------|
| 设备突然离线 | 消息标记发送失败，文件传输暂停，提示用户 |
| UDP 广播无响应 | 每 3 秒重试，超过 30 秒提示网络异常 |
| TCP 连接断开 | 自动重连 3 次，失败后标记传输失败，支持手动重试 |
| WebSocket 断开 | 自动重连，离线期间消息本地缓存，恢复后补发 |
| IP 变更 | 重新广播，更新设备列表 |

### 文件传输异常

| 场景 | 处理方式 |
|------|----------|
| 传输中断网 | 保留已传输分片，恢复后断点续传 |
| 磁盘空间不足 | 传输前检查，不足时拒绝并提示 |
| 文件被占用 | 提示用户关闭占用程序，支持重试 |
| 文件名冲突 | 自动重命名（文件名(1).ext）或提示用户选择 |
| 超大文件（>4GB） | 64 位偏移量，分片大小自适应 |

### 消息异常

| 场景 | 处理方式 |
|------|----------|
| 消息发送失败 | 红色感叹号，支持点击重发 |
| 消息顺序错乱 | 时间戳 + 序号排序 |
| 重复消息 | 基于 msgId 去重 |

### 安全性

- 同局域网设备默认信任，无需登录
- 文件传输不加密（局域网内性能优先）
- 可选：设置访问密码，设备需输入密码才能连接

## 项目目录结构（规划）

```
邻传/
├── electron/                  # Electron 主进程
│   ├── main.ts               # 主入口
│   ├── preload.ts            # 预加载脚本
│   ├── services/
│   │   ├── discovery.ts      # UDP 设备发现
│   │   ├── fileTransfer.ts   # TCP 文件传输
│   │   ├── messaging.ts      # WebSocket 消息
│   │   └── database.ts       # SQLite 数据库
│   └── utils/
│       ├── network.ts        # 网络工具函数
│       └── crypto.ts         # ID 生成等
├── src/                       # Vue 3 渲染进程
│   ├── App.vue
│   ├── main.ts
│   ├── router/
│   ├── stores/
│   ├── views/
│   │   ├── DeviceList.vue
│   │   ├── Chat.vue
│   │   ├── FileTransfer.vue
│   │   ├── FileLibrary.vue
│   │   ├── RemoteTransfer.vue
│   │   └── Settings.vue
│   ├── components/
│   └── assets/
├── package.json
├── vite.config.ts
├── electron-builder.json
└── tsconfig.json
```
