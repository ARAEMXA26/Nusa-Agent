import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('nusa', {
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-updates'),
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
