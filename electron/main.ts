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
  const savePath = join(app.getPath('downloads'), '邻传')

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
  ipcMain.handle('settings:setSavePath', (_, _path: string) => {
    // 保存到 electron-store（待实现）
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
