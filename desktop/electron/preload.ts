import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('nusa', {
  platform: process.platform,
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
