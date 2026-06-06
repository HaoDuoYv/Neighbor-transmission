import { contextBridge, ipcRenderer } from 'electron'

// TODO: 定义 ElectronAPI 接口类型，后续将创建 electron/preload.d.ts 类型声明文件
// 目前回调参数暂时保留 unknown 类型

contextBridge.exposeInMainWorld('electronAPI', {
  // 设备相关
  getDevices: () => ipcRenderer.invoke('device:list'),
  getOnlineDevices: () => ipcRenderer.invoke('device:online'),
  setDeviceName: (name: string) => ipcRenderer.invoke('device:setName', name),
  toggleFavorite: (deviceId: string, isFavorite: boolean) => ipcRenderer.invoke('device:toggleFavorite', deviceId, isFavorite),
  getDeviceInfo: () => ipcRenderer.invoke('device:info'),
  pingDevice: (targetIP: string) => ipcRenderer.invoke('device:ping', targetIP),
  runNetworkDiagnostics: () => ipcRenderer.invoke('network:diagnostics'),

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

  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // 事件监听（每个方法返回取消订阅函数以避免内存泄漏）
  onDeviceOnline: (callback: (device: unknown) => void) => {
    const handler = (_: unknown, device: unknown) => callback(device)
    ipcRenderer.on('device:online', handler)
    return () => { ipcRenderer.removeListener('device:online', handler) }
  },
  onDeviceOffline: (callback: (deviceId: string) => void) => {
    const handler = (_: unknown, deviceId: string) => callback(deviceId)
    ipcRenderer.on('device:offline', handler)
    return () => { ipcRenderer.removeListener('device:offline', handler) }
  },
  onDeviceUpdate: (callback: (device: unknown) => void) => {
    const handler = (_: unknown, device: unknown) => callback(device)
    ipcRenderer.on('device:update', handler)
    return () => { ipcRenderer.removeListener('device:update', handler) }
  },
  onTransferProgress: (callback: (task: unknown) => void) => {
    const handler = (_: unknown, task: unknown) => callback(task)
    ipcRenderer.on('transfer:progress', handler)
    return () => { ipcRenderer.removeListener('transfer:progress', handler) }
  },
  onTransferComplete: (callback: (task: unknown) => void) => {
    const handler = (_: unknown, task: unknown) => callback(task)
    ipcRenderer.on('transfer:complete', handler)
    return () => { ipcRenderer.removeListener('transfer:complete', handler) }
  },
  onTransferError: (callback: (error: unknown) => void) => {
    const handler = (_: unknown, error: unknown) => callback(error)
    ipcRenderer.on('transfer:error', handler)
    return () => { ipcRenderer.removeListener('transfer:error', handler) }
  },
  onMessageReceived: (callback: (message: unknown) => void) => {
    const handler = (_: unknown, message: unknown) => callback(message)
    ipcRenderer.on('message:new', handler)
    return () => { ipcRenderer.removeListener('message:new', handler) }
  },
  onMessageSent: (callback: (message: unknown) => void) => {
    const handler = (_: unknown, message: unknown) => callback(message)
    ipcRenderer.on('message:sent', handler)
    return () => { ipcRenderer.removeListener('message:sent', handler) }
  },
  onMessageError: (callback: (error: unknown) => void) => {
    const handler = (_: unknown, error: unknown) => callback(error)
    ipcRenderer.on('message:error', handler)
    return () => { ipcRenderer.removeListener('message:error', handler) }
  }
})
