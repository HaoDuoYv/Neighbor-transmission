import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getDiscoveredServers: () => ipcRenderer.invoke('discovery:get-servers'),
  startLocalServer: (serverName?: string) => ipcRenderer.invoke('server:start', serverName),
  stopLocalServer: () => ipcRenderer.invoke('server:stop'),
  minimizeToTray: () => ipcRenderer.invoke('window:minimize-to-tray'),
  closeApp: () => ipcRenderer.invoke('window:close'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  getCloseBehavior: () => ipcRenderer.invoke('config:get-close-behavior'),
  setCloseBehavior: (behavior: string) => ipcRenderer.invoke('config:set-close-behavior', behavior),
  onShowCloseDialog: (callback: () => void) => ipcRenderer.on('show-close-dialog', () => callback()),
  sendCloseDialogResult: (choice: { action: string; remember: boolean }) => ipcRenderer.send('close-dialog-result', choice),
})
