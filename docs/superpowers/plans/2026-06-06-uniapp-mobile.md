# UniApp Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Android-first uni-app mobile client for 邻传 that can discover desktop peers, chat, transfer files, and run network self-checks using the existing LAN protocol.

**Architecture:** The mobile app lives under `mobile/linchuan_uniapp` as an independent uni-app Vue 3 project. Protocol encoding, parsing, and diagnostic rules are plain JavaScript modules with Node tests; App-side UDP/TCP socket access goes through a small `linchuan-network` UTS native plugin interface with a JS fallback for dev/H5.

**Tech Stack:** uni-app Vue 3, Pinia, Vite, Node built-in test runner for protocol tests, Android UTS plugin scaffold for UDP/TCP/WebSocket bridge.

---

### Task 1: Protocol Core

**Files:**
- Create: `mobile/linchuan_uniapp/tests/protocol.test.mjs`
- Create: `mobile/linchuan_uniapp/tests/file-framing.test.mjs`
- Create: `mobile/linchuan_uniapp/src/protocol/linchuanProtocol.js`

- [ ] **Step 1: Write failing tests** for heartbeat, TCP discovery, chat ACK, and file framing helpers.
- [ ] **Step 2: Run tests** with `node --test mobile/linchuan_uniapp/tests/*.mjs`; expected failure is missing protocol modules.
- [ ] **Step 3: Implement protocol helpers** matching desktop ports `12345`, `12346`, `12347`, multicast `224.0.0.167`, JSON-line file transfer, and WebSocket message wrapper.
- [ ] **Step 4: Run tests again**; expected pass.

### Task 2: Diagnostics Core

**Files:**
- Create: `mobile/linchuan_uniapp/tests/diagnostics.test.mjs`
- Create: `mobile/linchuan_uniapp/src/protocol/diagnostics.js`

- [ ] **Step 1: Write failing tests** for Android permission, local IP, plugin availability, and socket server status reporting.
- [ ] **Step 2: Implement `evaluateDiagnostics`** returning `ok`, `warning`, or `error` checks with actionable Chinese suggestions.
- [ ] **Step 3: Run tests**; expected pass.

### Task 3: UniApp Shell And State

**Files:**
- Create: `mobile/linchuan_uniapp/package.json`
- Create: `mobile/linchuan_uniapp/index.html`
- Create: `mobile/linchuan_uniapp/vite.config.ts`
- Create: `mobile/linchuan_uniapp/src/main.js`
- Create: `mobile/linchuan_uniapp/src/App.vue`
- Create: `mobile/linchuan_uniapp/src/pages.json`
- Create: `mobile/linchuan_uniapp/src/manifest.json`
- Create: `mobile/linchuan_uniapp/src/stores/linchuanStore.js`
- Create: `mobile/linchuan_uniapp/src/services/networkBridge.js`

- [ ] **Step 1: Add standard uni-app config** for Android App output and pages.
- [ ] **Step 2: Add Pinia store** for devices, selected chat peer, messages, transfers, diagnostics, local device settings, and bridge events.
- [ ] **Step 3: Add network bridge** that calls `uni.requireNativePlugin('linchuan-network')` on App and returns graceful warnings elsewhere.

### Task 4: Mobile Screens

**Files:**
- Create: `mobile/linchuan_uniapp/src/pages/devices/devices.vue`
- Create: `mobile/linchuan_uniapp/src/pages/chat/chat.vue`
- Create: `mobile/linchuan_uniapp/src/pages/transfers/transfers.vue`
- Create: `mobile/linchuan_uniapp/src/pages/repair/repair.vue`
- Create: `mobile/linchuan_uniapp/src/pages/settings/settings.vue`
- Create: `mobile/linchuan_uniapp/src/styles/mobile.css`

- [ ] **Step 1: Implement a compact phone-first device list** with scan, manual IP connect, and selected device actions.
- [ ] **Step 2: Implement chat** with text messages and ACK status labels.
- [ ] **Step 3: Implement transfer list** with file pick/send entry points and progress.
- [ ] **Step 4: Implement repair page** showing diagnostics and suggestions.
- [ ] **Step 5: Implement settings page** for local device name and protocol ports.

### Task 5: Android Native Plugin Scaffold

**Files:**
- Create: `mobile/linchuan_uniapp/uni_modules/linchuan-network/package.json`
- Create: `mobile/linchuan_uniapp/uni_modules/linchuan-network/utssdk/interface.uts`
- Create: `mobile/linchuan_uniapp/uni_modules/linchuan-network/utssdk/app-android/index.uts`
- Create: `mobile/linchuan_uniapp/README.md`

- [ ] **Step 1: Define plugin methods** for discovery, TCP discovery, WebSocket chat, file transfer, and diagnostics.
- [ ] **Step 2: Add Android permissions** in `manifest.json` and explain HBuilderX/Android build steps in README.
- [ ] **Step 3: Run available verification**: Node protocol tests on this machine; document that App build requires HBuilderX or DCloud CLI.
