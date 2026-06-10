/// <reference types="vite/client" />

interface ElectronAPI {
  getDiscoveredServers: () => Promise<any[]>
  startLocalServer: (serverName?: string, port?: number) => Promise<{ success: boolean; port?: number; error?: string }>
  stopLocalServer: () => Promise<void>
  minimizeToTray: () => Promise<void>
  closeApp: () => Promise<void>
  openExternal: (url: string) => Promise<void>
  getCloseBehavior: () => Promise<string | null>
  setCloseBehavior: (behavior: string) => Promise<void>
  onShowCloseDialog: (callback: () => void) => void
  sendCloseDialogResult: (choice: { action: string; remember: boolean }) => void
}

interface Window {
  electronAPI?: ElectronAPI
}
