interface ElectronAPI {
  // 设备相关
  getDevices: () => Promise<any[]>
  getOnlineDevices: () => Promise<any[]>
  setDeviceName: (name: string) => Promise<void>
  toggleFavorite: (deviceId: string, isFavorite: boolean) => Promise<void>

  // 消息相关
  sendMessage: (toDevice: string, type: string, content: string, metadata?: Record<string, unknown>) => Promise<any>
  getMessages: (device1: string, device2: string) => Promise<any[]>
  searchMessages: (keyword: string) => Promise<any[]>

  // 文件传输相关
  sendFile: (filePath: string, toDeviceIP: string, toDevicePort: number) => Promise<any>
  cancelTransfer: (fileId: string) => Promise<void>
  getTransfers: () => Promise<any[]>
  getActiveTransfers: () => Promise<any[]>

  // 文件库相关
  getFiles: (type?: string, keyword?: string) => Promise<any[]>
  openFile: (filePath: string) => Promise<void>
  openFileDir: (filePath: string) => Promise<void>
  selectFile: () => Promise<string[]>

  // 设置相关
  getSettings: () => Promise<any>
  setSavePath: (path: string) => Promise<void>

  // 窗口控制
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void

  // 事件监听
  onDeviceOnline: (callback: (device: any) => void) => () => void
  onDeviceOffline: (callback: (deviceId: string) => void) => () => void
  onDeviceUpdate: (callback: (device: any) => void) => () => void
  onTransferProgress: (callback: (task: any) => void) => () => void
  onTransferComplete: (callback: (task: any) => void) => () => void
  onTransferError: (callback: (error: any) => void) => () => void
  onMessageReceived: (callback: (message: any) => void) => () => void
  onMessageSent: (callback: (message: any) => void) => () => void
  onMessageError: (callback: (error: any) => void) => () => void
}

declare interface Window {
  electronAPI: ElectronAPI
}
