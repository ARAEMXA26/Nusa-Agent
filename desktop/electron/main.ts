import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
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

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] Failed to load ${validatedURL}: ${errorCode} ${errorDescription}`);
    dialog.showErrorBox(
      'Nusa Agent UI Load Error',
      `Gagal memuat antarmuka Nusa Agent (${errorCode}): ${errorDescription}\nPath: ${validatedURL}`
    );
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      console.error(`[Renderer Error ${level}] ${message} (${sourceId}:${line})`);
    }
  });

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' || (input.meta && input.alt && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools();
    }
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

// Dialog handler for folder selection (legacy callback)
ipcMain.on('openDirectoryDialog', async (event: any) => {
  if (!mainWindow) return;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    event.reply('directorySelected', result.filePaths[0]);
  }
});

// Native Workspace Bridge Handlers
ipcMain.handle('workspace:open-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Pilih Project Folder',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('workspace:read-dir', async (_event, dirPath: string) => {
  try {
    const resolvedPath = path.resolve(dirPath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Directory not found: ${dirPath}`, entries: [] };
    }
    const dirents = await fs.promises.readdir(resolvedPath, { withFileTypes: true });
    const entries = dirents.map((dirent) => ({
      name: dirent.name,
      path: path.join(resolvedPath, dirent.name),
      is_dir: dirent.isDirectory(),
      is_symlink: dirent.isSymbolicLink(),
    }));
    entries.sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return { success: true, entries };
  } catch (err: any) {
    return { success: false, error: err.message, entries: [] };
  }
});

ipcMain.handle('workspace:read-file', async (_event, filePath: string) => {
  try {
    const resolvedPath = path.resolve(filePath);
    const content = await fs.promises.readFile(resolvedPath, 'utf-8');
    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message, content: '' };
  }
});

ipcMain.handle('workspace:write-file', async (_event, filePath: string, content: string) => {
  try {
    const resolvedPath = path.resolve(filePath);
    await fs.promises.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.promises.writeFile(resolvedPath, content, 'utf-8');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('workspace:create-file', async (_event, filePath: string) => {
  try {
    const resolvedPath = path.resolve(filePath);
    await fs.promises.mkdir(path.dirname(resolvedPath), { recursive: true });
    if (!fs.existsSync(resolvedPath)) {
      await fs.promises.writeFile(resolvedPath, '', 'utf-8');
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('workspace:create-folder', async (_event, dirPath: string) => {
  try {
    const resolvedPath = path.resolve(dirPath);
    await fs.promises.mkdir(resolvedPath, { recursive: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('workspace:rename-item', async (_event, oldPath: string, newPath: string) => {
  try {
    const resolvedOld = path.resolve(oldPath);
    const resolvedNew = path.resolve(newPath);
    await fs.promises.rename(resolvedOld, resolvedNew);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('workspace:delete-item', async (_event, targetPath: string) => {
  try {
    const resolved = path.resolve(targetPath);
    try {
      await shell.trashItem(resolved);
      return { success: true, trashed: true };
    } catch {
      await fs.promises.rm(resolved, { recursive: true, force: true });
      return { success: true, trashed: false };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('workspace:reveal-in-finder', async (_event, targetPath: string) => {
  try {
    const resolved = path.resolve(targetPath);
    shell.showItemInFolder(resolved);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
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
