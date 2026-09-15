import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('nusa', {
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-updates'),
  installUpdate: (url?: string) => ipcRenderer.invoke('app:install-update', url),
  onUpdateProgress: (callback: (data: { percent: number; status: string }) => void) => {
    ipcRenderer.on('app:update-progress', (_event, data) => callback(data));
  },
  onUpdateAvailable: (callback: (result: any) => void) => {
    ipcRenderer.on('app:update-available', (_event, result) => callback(result));
  },
  onUpdateResult: (callback: (result: any) => void) => {
    ipcRenderer.on('app:update-result', (_event, result) => callback(result));
  },
  workspace: {
    openFolder: () => ipcRenderer.invoke('workspace:open-folder'),
    readDir: (dirPath: string) => ipcRenderer.invoke('workspace:read-dir', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('workspace:read-file', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('workspace:write-file', filePath, content),
    createFile: (filePath: string) => ipcRenderer.invoke('workspace:create-file', filePath),
    createFolder: (dirPath: string) => ipcRenderer.invoke('workspace:create-folder', dirPath),
    renameItem: (oldPath: string, newPath: string) => ipcRenderer.invoke('workspace:rename-item', oldPath, newPath),
    deleteItem: (targetPath: string) => ipcRenderer.invoke('workspace:delete-item', targetPath),
    revealInFinder: (targetPath: string) => ipcRenderer.invoke('workspace:reveal-in-finder', targetPath),
  },
  send: (channel: string, data: any) => {
    const validChannels = ['toGateway', 'openDirectoryDialog'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['fromGateway', 'directorySelected'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event: any, ...args: any[]) => func(...args));
    }
  },
});
