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
