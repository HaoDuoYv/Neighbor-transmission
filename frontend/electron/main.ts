import { app, ipcMain, BrowserWindow, shell, session } from 'electron'
import { createWindow, createTray } from './window-manager'
import { startServer, stopServer, getServerPort } from './process-manager'
import { getDiscoveredServers, startDiscovery, stopDiscovery } from './discovery'
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

function registerWebviewPopupHandling(): void {
  const hiddenPopupWindows = new WeakSet<BrowserWindow>()

  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return

    contents.setWindowOpenHandler(() => ({
      action: 'allow',
      overrideBrowserWindowOptions: {
        show: false,
        skipTaskbar: true,
        width: 1,
        height: 1,
        title: 'download',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      },
    }))

    contents.on('did-create-window', (childWindow) => {
      hiddenPopupWindows.add(childWindow)
      setTimeout(() => {
        if (!childWindow.isDestroyed()) {
          childWindow.close()
        }
      }, 120000)
    })
  })

  session.defaultSession.on('will-download', (_event, item, webContents) => {
    const ownerWindow = BrowserWindow.fromWebContents(webContents)
    if (!ownerWindow || !hiddenPopupWindows.has(ownerWindow)) return

    item.once('done', () => {
      if (!ownerWindow.isDestroyed()) {
        ownerWindow.close()
      }
    })
  })
}

app.whenReady().then(async () => {
  registerWebviewPopupHandling()
  createWindow()
  createTray()
  startDiscovery()

  ipcMain.handle('discovery:get-servers', () => {
    return getDiscoveredServers()
  })

  ipcMain.handle('server:start', async (_event, serverName?: string) => {
    try {
      await startServer(serverName)
      return { success: true, port: getServerPort() }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('server:stop', async () => {
    await stopServer()
  })

  ipcMain.handle('config:get-close-behavior', () => {
    const config = readConfig()
    return config.closeBehavior ?? null
  })

  ipcMain.handle('config:set-close-behavior', (_event, behavior: string) => {
    writeConfig({ ...readConfig(), closeBehavior: behavior })
  })

  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    const target = new URL(url)
    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new Error('Unsupported external URL protocol')
    }
    await shell.openExternal(target.toString())
  })

  ipcMain.handle('window:minimize-to-tray', () => {})

  ipcMain.handle('window:close', () => {
    app.quit()
  })
})

app.on('window-all-closed', () => {
  stopServer()
  stopDiscovery()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
