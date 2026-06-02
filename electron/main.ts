import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { DiscoveryService } from './services/discovery'
import { FileTransferService } from './services/fileTransfer'
import { MessagingService } from './services/messaging'
import { DatabaseService } from './services/database'
import { generateId } from './utils/id'
import { getLocalIP } from './utils/network'

const DEFAULT_SAVE_PATH = join(app.getPath('downloads'), '邻传')

const VALID_MESSAGE_TYPES = ['text', 'image', 'file', 'code', 'emoji']

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
}

function initServices() {
  // 初始化数据库
  databaseService = new DatabaseService()

  // 初始化消息服务（需要在 discoveryService.start() 之前，因为设备上线时要自动连接 WebSocket）
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
  fileTransferService = new FileTransferService(DEFAULT_SAVE_PATH)

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
}

function registerIpcHandlers() {
  // 窗口控制（从 createWindow 移入，避免重复注册）
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  // 设备相关
  ipcMain.handle('device:list', () => {
    try {
      return databaseService.getDevices()
    } catch (err) {
      throw new Error(`获取设备列表失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('device:online', () => {
    try {
      return discoveryService.getOnlineDevices()
    } catch (err) {
      throw new Error(`获取在线设备失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('device:setName', (_, name: string) => {
    deviceName = name
    // TODO: 更新心跳包中的设备名（DiscoveryService 尚未提供 updateDeviceName 方法）
    // discoveryService?.updateDeviceName?.(name)
  })
  ipcMain.handle('device:toggleFavorite', (_, deviceId: string, isFavorite: boolean) => {
    try {
      databaseService.toggleFavorite(deviceId, isFavorite)
    } catch (err) {
      throw new Error(`收藏设备失败: ${(err as Error).message}`)
    }
  })

  // 消息相关
  ipcMain.handle('message:send', (_, toDevice: string, type: string, content: string, metadata?: Record<string, unknown>) => {
    if (!VALID_MESSAGE_TYPES.includes(type)) {
      throw new Error(`无效的消息类型: ${type}`)
    }
    try {
      return messagingService.sendMessage(toDevice, type as 'text' | 'image' | 'file' | 'code' | 'emoji', content, metadata)
    } catch (err) {
      throw new Error(`发送消息失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('message:list', (_, device1: string, device2: string) => {
    try {
      return databaseService.getMessages(device1, device2)
    } catch (err) {
      throw new Error(`获取消息列表失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('message:search', (_, keyword: string) => {
    try {
      return databaseService.searchMessages(keyword)
    } catch (err) {
      throw new Error(`搜索消息失败: ${(err as Error).message}`)
    }
  })

  // 文件传输相关
  ipcMain.handle('transfer:sendFile', async (_, filePath: string, toDeviceIP: string, toDevicePort: number) => {
    try {
      return await fileTransferService.sendFile(filePath, toDeviceIP, toDevicePort)
    } catch (err) {
      throw new Error(`发送文件失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('transfer:cancel', (_, fileId: string) => {
    try {
      fileTransferService.cancelTransfer(fileId)
    } catch (err) {
      throw new Error(`取消传输失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('transfer:list', () => {
    try {
      return databaseService.getTransfers()
    } catch (err) {
      throw new Error(`获取传输列表失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('transfer:active', () => {
    try {
      return databaseService.getTransfersByStatus('transferring')
    } catch (err) {
      throw new Error(`获取活跃传输失败: ${(err as Error).message}`)
    }
  })

  // 文件库相关
  ipcMain.handle('files:list', (_, type?: string, keyword?: string) => {
    try {
      return databaseService.getFilesByType(type, keyword)
    } catch (err) {
      throw new Error(`获取文件列表失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('files:open', async (_, filePath: string) => {
    try {
      await shell.openPath(filePath)
    } catch (err) {
      throw new Error(`打开文件失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('files:openDir', async (_, filePath: string) => {
    try {
      await shell.showItemInFolder(filePath)
    } catch (err) {
      throw new Error(`打开文件目录失败: ${(err as Error).message}`)
    }
  })
  ipcMain.handle('files:select', async () => {
    if (!mainWindow) throw new Error('窗口未初始化')
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections']
      })
      return result.filePaths
    } catch (err) {
      throw new Error(`选择文件失败: ${(err as Error).message}`)
    }
  })

  // 设置相关
  ipcMain.handle('settings:get', () => {
    return { deviceName, savePath: DEFAULT_SAVE_PATH }
  })
  ipcMain.handle('settings:setSavePath', (_, _path: string) => {
    throw new Error('保存路径设置功能待实现')
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
  discoveryService?.stop()
  fileTransferService?.stop()
  messagingService?.stop()
  databaseService?.close()
  app.quit()
})
