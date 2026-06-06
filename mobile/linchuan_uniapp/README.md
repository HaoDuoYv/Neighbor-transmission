# 邻传移动端 uni-app

这是邻传的 Android-first 手机端工程，目录独立于桌面端：

```bash
cd mobile/linchuan_uniapp
npm install
npm run test:protocol
```

## 当前能力

- 复用桌面端协议常量：UDP `12345`、TCP `12346`、WebSocket `12347`、组播 `224.0.0.167`、64KB 文件分片。
- 提供设备、聊天、传输、修复、设置五个手机端页面。
- 协议编解码和网络自检规则有 Node 自动测试。
- `uni_modules/linchuan-network` 已按 UTS 插件结构预留 Android 原生网络层入口。

## 构建方式

推荐使用 HBuilderX 打开 `mobile/linchuan_uniapp`：

1. 安装项目依赖。
2. 运行到 Android 真机或制作自定义基座。
3. 确认 Android 权限包含 `INTERNET`、`ACCESS_NETWORK_STATE`、`ACCESS_WIFI_STATE`、`CHANGE_WIFI_MULTICAST_STATE`。
4. 在手机端打开“修复”页，先跑网络自检。

命令行环境可尝试：

```bash
npm run dev:app
npm run build:app
```

## 原生网络层说明

DCloud 推荐 UTS 插件放在 `uni_modules/<插件名>/utssdk`，并在 `utssdk/app-android/index.uts` 实现 Android 能力。前端通过插件根目录导入 `linchuan-network`。

当前 `app-android/index.uts` 已完成 JS 调用契约和事件回调，下一步是在该文件中接入真实 Android 网络 API：

- UDP：监听 `12345`，加入 `224.0.0.167`，发送/接收 heartbeat/offline。
- TCP discovery：监听 `12346`，处理 `discovery-ping` 和 `discovery-pong` JSON 行。
- WebSocket：通过 OkHttp WebSocket 监听/连接 `12347`，发送 `{ type: "chat" | "ack", payload }`。
- 文件传输：通过 TCP socket 写入 JSON 行头和 64KB chunk。

## 和桌面端联调

1. 先启动桌面端邻传。
2. 手机和电脑连接同一 Wi-Fi，避免访客网络/AP 隔离。
3. 手机端设备页点击扫描；若自动发现失败，输入电脑局域网 IP 手动连接。
4. 修复页会显示插件、权限、端口和本机 IP 检查结果。
