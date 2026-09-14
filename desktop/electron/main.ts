import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { startGatewayProcess, stopGatewayProcess } from './gateway-process';
import { registerUpdaterIpc } from './updater';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  registerUpdaterIpc(mainWindow);
}

// Dialog handler for folder selection
ipcMain.on('openDirectoryDialog', async (event: any) => {
  if (!mainWindow) return;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    event.reply('directorySelected', result.filePaths[0]);
  }
});

app.whenReady().then(async () => {
  if (process.platform === 'darwin' && app.dock) {
    try {
      const dockIconPath = path.join(__dirname, '../build/icon.png');
      app.dock.setIcon(dockIconPath);
    } catch {
      // Ignore if dock icon cannot be set
    }
  }
  await startGatewayProcess();
  createWindow();
});

app.on('will-quit', () => {
  stopGatewayProcess();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
