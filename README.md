# 邻传 - WebSocket 即时聊天平台

一个全栈即时通讯与协作平台，支持 Web 端和 Electron 桌面端。包含私聊群聊、AI 助手、协作编辑、五子棋对弈、文件传输、应用中心等功能。

GitHub 仓库：https://github.com/HaoDuoYv/Neighbor-transmission

## 功能特性

### 聊天
- 私聊与群聊，支持文本、文件、图片消息
- 内置 300+ 表情符号，支持 @提及 和用户备注
- 消息序号机制，支持增量同步和断线重连
- 文件上传最大 500MB，雪花 ID 全局唯一

### AI 助手
- 创建专属 AI 智能体，自定义角色、提示词、模型参数
- 流式对话，支持多轮上下文和工具调用（网页搜索、URL 抓取）
- 对话历史管理，助手分享码功能

### 协作编辑
- 基于 Yjs CRDT 的多人实时代码编辑
- CodeMirror 6 驱动，支持语法高亮
- 内置 HTML/CSS/JS 实时预览

### 五子棋
- WebSocket 实时对战，倒计时机制
- 自动胜负判定，实时聊天互动

### 应用中心
- 集成外部应用，统一入口访问
- 支持内部路由和外部链接跳转

### 桌面应用（Electron）
- 内置 JRE，自动启动 Spring Boot 后端
- 局域网服务器发现（UDP 多播）
- 支持创建自定义名称的服务器，或搜索加入已有服务器

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Spring Boot 3.2、Spring WebSocket、Spring Data JPA、SQLite、JDK 17+ |
| 前端 | Vue 3、TypeScript、Vite、Tailwind CSS、Pinia、Vue Router |
| 协作 | Yjs CRDT、CodeMirror 6 |
| 桌面 | Electron、electron-builder、NSIS |

## 项目结构

```
├── backend/                          # Spring Boot 后端
│   ├── pom.xml
│   └── src/main/java/com/chat/
│       ├── component/                # 组播发现、AI 调用
│       ├── config/                   # CORS、WebSocket、文件上传、缓存等配置
│       ├── controller/               # REST 接口（认证、聊天、AI、文件、头像）
│       ├── discovery/                # 局域网服务发现（UDP 多播）
│       ├── entity/                   # JPA 实体
│       ├── exception/                # 全局异常处理
│       ├── handler/                  # WebSocket 处理器（聊天、编辑器、五子棋）
│       ├── interceptor/              # JWT 认证、WebSocket 认证拦截器
│       ├── repository/               # 数据访问层
│       ├── service/                  # 业务逻辑（AI、文件、五子棋、@提及等）
│       ├── utils/                    # JWT、文件上传、雪花 ID 工具
│       └── vo/                       # 视图对象
│
├── frontend/                         # Vue 3 + Electron 前端
│   ├── electron/                     # Electron 主进程
│   │   ├── main.ts                   # 主入口、IPC 处理
│   │   ├── preload.ts                # 预加载脚本
│   │   ├── process-manager.ts        # 后端 JAR 进程管理
│   │   ├── window-manager.ts         # 窗口与托盘管理
│   │   └── discovery.ts              # 局域网服务器发现
│   ├── src/
│   │   ├── api/                      # API 接口与服务器配置
│   │   ├── components/               # 通用组件（消息、编辑器、五子棋等）
│   │   ├── composables/              # WebSocket 组合式函数
│   │   ├── config/                   # 应用、表情、LLM 供应商配置
│   │   ├── pages/                    # 页面（聊天、AI、编辑器、五子棋、落地页）
│   │   ├── stores/                   # Pinia 状态管理
│   │   └── utils/                    # AI 附件工具
│   ├── electron-builder.yml          # 打包配置
│   ├── package.json
│   └── vite.config.ts
│
└── data/                             # 数据目录（SQLite 等）
```

## 快速开始

### 环境要求

- JDK 17+
- Node.js 18+
- Maven 3.8+

### Web 模式

```bash
# 后端
cd backend
mvn spring-boot:run

# 前端（另开终端）
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:3000`，后端运行在 `http://localhost:8081`。

### 桌面应用开发

```bash
cd frontend
npm install
npm run electron:dev
```

### 构建安装程序

```bash
cd frontend
npm run build
npx electron-builder --win
```

输出：`electron-output/WebSocket Chat Setup 0.0.0.exe`

## 后端配置

`backend/src/main/resources/application.properties`：

```properties
server.port=8081
local.local-url=uploads
local.web-url=/files
spring.servlet.multipart.max-file-size=500MB
spring.datasource.url=jdbc:sqlite:./data/chat.db
spring.jpa.hibernate.ddl-auto=update
snowflake.machine-id=0
```

## API 接口

| 路径 | 方法 | 描述 |
|------|------|------|
| `/auth/register` | POST | 用户注册 |
| `/auth/login` | POST | 用户登录 |
| `/api/rooms` | GET/POST | 获取/创建房间 |
| `/api/rooms/private` | POST | 创建私聊房间 |
| `/api/rooms/:id/join` | POST | 加入房间 |
| `/api/rooms/:id/messages` | GET | 获取消息历史 |
| `/api/file/upload` | POST | 上传文件 |
| `/api/ai/assistants` | GET/POST | 获取/创建 AI 助手 |
| `/api/ai/conversations` | GET/POST | AI 对话管理 |
| `/ws/chat` | WS | WebSocket 聊天 |
| `/ws/editor` | WS | WebSocket 协作编辑 |
| `/ws/gomoku` | WS | WebSocket 五子棋 |

## 许可证

本项目仅供学习和参考使用。
