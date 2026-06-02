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

  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

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
