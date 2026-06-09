import { BrowserWindow, Tray, Menu, nativeImage, app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

const configPath = path.join(app.getPath('userData'), 'config.json')

function readConfig(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  } catch {
    return {}
  }
}

function writeConfig(data: Record<string, unknown>): void {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

export function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'WebSocket Chat',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (isQuitting) return

    e.preventDefault()
    const config = readConfig()
    const behavior = config.closeBehavior as string | undefined

    if (behavior === 'minimize') {
      mainWindow?.hide()
    } else if (behavior === 'quit') {
      isQuitting = true
      app.quit()
    } else {
      mainWindow?.webContents.send('show-close-dialog')
    }
  })

  ipcMain.on('close-dialog-result', (_event, choice: { action: string; remember: boolean }) => {
    if (choice.remember) {
      writeConfig({ ...readConfig(), closeBehavior: choice.action })
    }
    if (choice.action === 'minimize') {
      mainWindow?.hide()
    } else {
      isQuitting = true
      app.quit()
    }
  })

  return mainWindow
}

export function createTray(): void {
  const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVQ4T2P8z8BQz0BFAMIAQgP+M1LRgP8MEDAAE30A/bsCAAAAAElFTkSuQmCC')
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('WebSocket Chat')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
