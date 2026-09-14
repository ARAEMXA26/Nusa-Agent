import { app, ipcMain, BrowserWindow } from 'electron';
import https from 'https';

export interface AppInfo {
  version: string;
  name: string;
  platform: string;
  arch: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  isPackaged: boolean;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  error?: string;
}

export function getAppInfo(): AppInfo {
  return {
    version: app.getVersion() || '0.1.0',
    name: app.getName() || 'Nusa Agent',
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    isPackaged: app.isPackaged,
  };
}

export function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion() || '0.1.0';
  const repo = 'ARAEMXA26/Nusa-Agent';
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${repo}/releases/latest`,
    headers: {
      'User-Agent': 'Nusa-Agent-Desktop-App',
      Accept: 'application/vnd.github.v3+json',
    },
  };

  return new Promise((resolve) => {
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const release = JSON.parse(data);
            const latestTag = release.tag_name ? release.tag_name.replace(/^v/, '') : currentVersion;
            const isNewer = compareVersions(latestTag, currentVersion) > 0;
            resolve({
              updateAvailable: isNewer,
              currentVersion,
              latestVersion: latestTag,
              releaseNotes: release.body || 'No release notes provided.',
              publishedAt: release.published_at,
              downloadUrl: release.html_url,
            });
          } catch (e: any) {
            resolve({
              updateAvailable: false,
              currentVersion,
              latestVersion: currentVersion,
              error: 'Failed to parse release info',
            });
          }
        } else {
          // Fallback if repository doesn't have releases yet
          resolve({
            updateAvailable: false,
            currentVersion,
            latestVersion: currentVersion,
            releaseNotes: 'You are running the latest production release.',
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        error: err.message,
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        error: 'Update check timed out',
      });
    });
  });
}

function compareVersions(v1: string, v2: string): number {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function registerUpdaterIpc(mainWindow: BrowserWindow | null): void {
  ipcMain.handle('app:get-info', () => {
    return getAppInfo();
  });

  ipcMain.handle('app:check-updates', async () => {
    const result = await checkForUpdates();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:update-result', result);
    }
    return result;
  });
}
