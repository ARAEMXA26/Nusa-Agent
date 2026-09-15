import { app, ipcMain, BrowserWindow } from 'electron';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

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

export interface DeviceDownload {
  os: 'mac' | 'win' | 'linux';
  platformName: string;
  arch: string;
  format: string;
  filename: string;
  url: string;
  sizeBytes?: number;
  sizeFormatted?: string;
  isCurrentDevice: boolean;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  deviceDownloadUrl?: string;
  deviceDownloadName?: string;
  deviceDownloadSize?: string;
  currentDeviceLabel?: string;
  availableDownloads: DeviceDownload[];
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

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function getCurrentDeviceLabel(): string {
  const p = process.platform;
  const a = process.arch;
  if (p === 'darwin') {
    return a === 'arm64' ? 'macOS Apple Silicon (arm64)' : 'macOS Intel (x64)';
  } else if (p === 'win32') {
    return 'Windows 10 / 11 (x64)';
  } else if (p === 'linux') {
    return 'Linux (x64)';
  }
  return `${p} (${a})`;
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

  const deviceLabel = getCurrentDeviceLabel();
  const currentPlat = process.platform;
  const currentArch = process.arch;

  // Fallback defaults for all devices based on current version/latest endpoint
  const buildDefaultDownloads = (tag: string): DeviceDownload[] => {
    const ver = tag.replace(/^v/, '');
    return [
      {
        os: 'mac',
        platformName: 'macOS Apple Silicon (M1/M2/M3/M4)',
        arch: 'arm64',
        format: '.dmg',
        filename: `Nusa-Agent-${ver}-mac-arm64.dmg`,
        url: `https://github.com/${repo}/releases/download/${tag}/Nusa-Agent-${ver}-mac-arm64.dmg`,
        isCurrentDevice: currentPlat === 'darwin' && currentArch === 'arm64',
      },
      {
        os: 'mac',
        platformName: 'macOS Apple Silicon (Portable)',
        arch: 'arm64',
        format: '.zip',
        filename: `Nusa-Agent-${ver}-mac-arm64.zip`,
        url: `https://github.com/${repo}/releases/download/${tag}/Nusa-Agent-${ver}-mac-arm64.zip`,
        isCurrentDevice: false,
      },
      {
        os: 'mac',
        platformName: 'macOS Intel (x64)',
        arch: 'x64',
        format: '.dmg',
        filename: `Nusa-Agent-${ver}-mac-x64.dmg`,
        url: `https://github.com/${repo}/releases/download/${tag}/Nusa-Agent-${ver}-mac-x64.dmg`,
        isCurrentDevice: currentPlat === 'darwin' && currentArch === 'x64',
      },
      {
        os: 'mac',
        platformName: 'macOS Intel (Portable)',
        arch: 'x64',
        format: '.zip',
        filename: `Nusa-Agent-${ver}-mac-x64.zip`,
        url: `https://github.com/${repo}/releases/download/${tag}/Nusa-Agent-${ver}-mac-x64.zip`,
        isCurrentDevice: false,
      },
      {
        os: 'win',
        platformName: 'Windows (Setup Installer)',
        arch: 'x64',
        format: '.exe',
        filename: `Nusa-Agent-${ver}-win-x64.exe`,
        url: `https://github.com/${repo}/releases/download/${tag}/Nusa-Agent-${ver}-win-x64.exe`,
        isCurrentDevice: currentPlat === 'win32',
      },
      {
        os: 'win',
        platformName: 'Windows (Portable)',
        arch: 'x64',
        format: '.exe',
        filename: `Nusa-Agent-${ver}-win-x64-portable.exe`,
        url: `https://github.com/${repo}/releases/download/${tag}/Nusa-Agent-${ver}-win-x64-portable.exe`,
        isCurrentDevice: false,
      },
      {
        os: 'linux',
        platformName: 'Linux Universal (AppImage)',
        arch: 'x64',
        format: '.AppImage',
        filename: `Nusa-Agent-${ver}-linux-x64.AppImage`,
        url: `https://github.com/${repo}/releases/download/${tag}/Nusa-Agent-${ver}-linux-x64.AppImage`,
        isCurrentDevice: currentPlat === 'linux',
      },
      {
        os: 'linux',
        platformName: 'Linux Debian/Ubuntu (.deb)',
        arch: 'x64',
        format: '.deb',
        filename: `Nusa-Agent-${ver}-linux-x64.deb`,
        url: `https://github.com/${repo}/releases/download/${tag}/Nusa-Agent-${ver}-linux-x64.deb`,
        isCurrentDevice: false,
      },
      {
        os: 'linux',
        platformName: 'Linux Standalone (.tar.gz)',
        arch: 'x64',
        format: '.tar.gz',
        filename: `Nusa-Agent-${ver}-linux-x64.tar.gz`,
        url: `https://github.com/${repo}/releases/download/${tag}/Nusa-Agent-${ver}-linux-x64.tar.gz`,
        isCurrentDevice: false,
      },
    ];
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
            const rawAssets = Array.isArray(release.assets) ? release.assets : [];

            // Map standard device downloads and fill real URLs & sizes if available
            const downloads = buildDefaultDownloads(release.tag_name || `v${latestTag}`);
            for (const dl of downloads) {
              const matchedAsset = rawAssets.find((a: any) => {
                const aname = (a.name || '').toLowerCase();
                if (dl.os === 'mac') {
                  if (dl.arch === 'arm64') {
                    return aname.includes('mac-arm64') && aname.endsWith(dl.format);
                  } else {
                    return aname.includes('mac-x64') && aname.endsWith(dl.format);
                  }
                } else if (dl.os === 'win') {
                  if (dl.filename.includes('portable')) {
                    return aname.includes('portable') && aname.endsWith('.exe');
                  }
                  return (aname.includes('win') || aname.includes('setup')) && aname.endsWith('.exe') && !aname.includes('portable');
                } else if (dl.os === 'linux') {
                  return aname.endsWith(dl.format);
                }
                return false;
              });

              if (matchedAsset) {
                dl.url = matchedAsset.browser_download_url;
                dl.filename = matchedAsset.name;
                dl.sizeBytes = matchedAsset.size;
                dl.sizeFormatted = formatBytes(matchedAsset.size);
              }
            }

            // Identify current device download
            const currentDl = downloads.find((d) => d.isCurrentDevice) || downloads[0];

            resolve({
              updateAvailable: isNewer,
              currentVersion,
              latestVersion: latestTag,
              releaseNotes: release.body || 'Production multi-platform release of Nusa Agent.',
              publishedAt: release.published_at,
              downloadUrl: release.html_url,
              deviceDownloadUrl: currentDl?.url,
              deviceDownloadName: currentDl?.filename,
              deviceDownloadSize: currentDl?.sizeFormatted,
              currentDeviceLabel: deviceLabel,
              availableDownloads: downloads,
            });
          } catch (e: any) {
            const fallbackDl = buildDefaultDownloads(`v${currentVersion}`);
            const currentDl = fallbackDl.find((d) => d.isCurrentDevice) || fallbackDl[0];
            resolve({
              updateAvailable: false,
              currentVersion,
              latestVersion: currentVersion,
              currentDeviceLabel: deviceLabel,
              deviceDownloadUrl: currentDl?.url,
              deviceDownloadName: currentDl?.filename,
              availableDownloads: fallbackDl,
              error: 'Failed to parse release info from GitHub API',
            });
          }
        } else {
          // Fallback if repository doesn't have releases or rate limited
          const fallbackDl = buildDefaultDownloads(`v${currentVersion}`);
          const currentDl = fallbackDl.find((d) => d.isCurrentDevice) || fallbackDl[0];
          resolve({
            updateAvailable: false,
            currentVersion,
            latestVersion: currentVersion,
            releaseNotes: 'You are running the latest production release.',
            currentDeviceLabel: deviceLabel,
            deviceDownloadUrl: currentDl?.url,
            deviceDownloadName: currentDl?.filename,
            availableDownloads: fallbackDl,
          });
        }
      });
    });

    req.on('error', (err) => {
      const fallbackDl = buildDefaultDownloads(`v${currentVersion}`);
      const currentDl = fallbackDl.find((d) => d.isCurrentDevice) || fallbackDl[0];
      resolve({
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        currentDeviceLabel: deviceLabel,
        deviceDownloadUrl: currentDl?.url,
        deviceDownloadName: currentDl?.filename,
        availableDownloads: fallbackDl,
        error: err.message,
      });
    });

    req.setTimeout(6000, () => {
      req.destroy();
      const fallbackDl = buildDefaultDownloads(`v${currentVersion}`);
      const currentDl = fallbackDl.find((d) => d.isCurrentDevice) || fallbackDl[0];
      resolve({
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        currentDeviceLabel: deviceLabel,
        deviceDownloadUrl: currentDl?.url,
        deviceDownloadName: currentDl?.filename,
        availableDownloads: fallbackDl,
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

function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (percent: number, status: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 8) {
        return reject(new Error('Terlalu banyak pengalihan (redirect) saat mengunduh pembaruan.'));
      }

      const client = currentUrl.startsWith('https:') ? https : http;
      const req = client.get(
        currentUrl,
        {
          headers: {
            'User-Agent': 'Nusa-Agent-Desktop-App',
            Accept: '*/*',
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return follow(res.headers.location, redirectCount + 1);
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`Server rilis merespons dengan HTTP ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let receivedBytes = 0;
          const fileStream = fs.createWriteStream(destPath);

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            if (totalBytes > 0 && onProgress) {
              const pct = Math.min(95, Math.round((receivedBytes / totalBytes) * 95));
              const mbReceived = (receivedBytes / 1048576).toFixed(1);
              const mbTotal = (totalBytes / 1048576).toFixed(1);
              onProgress(pct, `Mengunduh berkas rilis (${mbReceived} MB / ${mbTotal} MB)...`);
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => resolve());
          });

          fileStream.on('error', (err) => {
            try { fs.unlinkSync(destPath); } catch {}
            reject(err);
          });
        }
      );

      req.on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch {}
        reject(err);
      });

      req.setTimeout(60000, () => {
        req.destroy();
        try { fs.unlinkSync(destPath); } catch {}
        reject(new Error('Koneksi pengunduhan pembaruan terputus (timeout).'));
      });
    };

    follow(url);
  });
}

export async function downloadAndInstallUpdate(
  mainWindow: BrowserWindow | null,
  customUrl?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const sendProgress = (percent: number, status: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:update-progress', { percent, status });
    }
  };

  try {
    let downloadUrl = customUrl;

    if (!downloadUrl) {
      sendProgress(5, 'Memeriksa versi rilis terbaru dari server...');
      const checkRes = await checkForUpdates();
      if (!checkRes.availableDownloads || checkRes.availableDownloads.length === 0) {
        throw new Error('Tidak ada tautan unduhan pembaruan yang tersedia.');
      }

      const currentPlat = process.platform;
      const currentArch = process.arch;

      // On macOS, prefer .zip archive for instant programmatic extraction
      if (currentPlat === 'darwin') {
        const zipDl = checkRes.availableDownloads.find(
          (d) => d.os === 'mac' && d.arch === currentArch && d.format === '.zip'
        );
        downloadUrl = zipDl?.url || checkRes.deviceDownloadUrl;
      } else {
        downloadUrl = checkRes.deviceDownloadUrl;
      }
    }

    if (!downloadUrl) {
      throw new Error('Gagal mendeteksi URL berkas pembaruan untuk perangkat ini.');
    }

    const tempDir = app.getPath('temp');
    const urlObj = new URL(downloadUrl);
    const filename = path.basename(urlObj.pathname);
    const destFile = path.join(tempDir, `nusa-update-${Date.now()}-${filename}`);

    sendProgress(10, `Mempersiapkan pengunduhan ${filename}...`);
    await downloadFile(downloadUrl, destFile, sendProgress);

    // Platform-specific automatic installation
    if (process.platform === 'darwin') {
      sendProgress(95, 'Mengekstrak dan memverifikasi integritas aplikasi...');
      const extractDir = path.join(tempDir, `nusa-extracted-${Date.now()}`);
      fs.mkdirSync(extractDir, { recursive: true });

      // If it's a zip file, unpack with native ditto to preserve symlinks and attributes
      if (destFile.endsWith('.zip')) {
        execSync(`ditto -xk "${destFile}" "${extractDir}"`);
      } else if (destFile.endsWith('.dmg')) {
        // Mount DMG and ditto copy out
        const mountPoint = path.join(tempDir, `nusa-mount-${Date.now()}`);
        fs.mkdirSync(mountPoint, { recursive: true });
        execSync(`hdiutil attach "${destFile}" -mountpoint "${mountPoint}" -nobrowse -quiet`);
        try {
          execSync(`ditto "${mountPoint}/Nusa Agent.app" "${extractDir}/Nusa Agent.app"`);
        } finally {
          execSync(`hdiutil detach "${mountPoint}" -force -quiet || true`);
          try { fs.rmdirSync(mountPoint); } catch {}
        }
      }

      const extractedApp = path.join(extractDir, 'Nusa Agent.app');
      if (!fs.existsSync(extractedApp)) {
        throw new Error('Format pembaruan tidak valid: Nusa Agent.app tidak ditemukan.');
      }

      // Ad-hoc codesign and remove quarantine attribute
      try {
        execSync(`xattr -cr "${extractedApp}"`);
        execSync(`codesign --force --deep --sign - "${extractedApp}"`);
      } catch (signErr) {
        console.warn('Codesign notice on update:', signErr);
      }

      sendProgress(98, 'Memasang pembaruan ke /Applications...');
      let targetApp = '/Applications/Nusa Agent.app';
      if (app.isPackaged) {
        const parentApp = path.dirname(path.dirname(path.dirname(process.execPath)));
        if (parentApp.endsWith('.app')) {
          targetApp = parentApp;
        }
      }

      // Create autonomous relaunch script
      const scriptPath = path.join(tempDir, `nusa-swap-${Date.now()}.sh`);
      const scriptContent = `#!/bin/bash
sleep 1
rm -rf "${targetApp}"
mv "${extractedApp}" "${targetApp}"
rm -rf "${extractDir}"
rm -f "${destFile}"
open "${targetApp}"
rm -f "${scriptPath}"
`;
      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

      sendProgress(100, 'Pembaruan berhasil dipasang! Memulai ulang aplikasi...');
      const child = spawn('/bin/bash', [scriptPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      setTimeout(() => {
        app.quit();
      }, 1200);

      return { success: true, message: 'Pembaruan berhasil dipasang. Aplikasi sedang dimulai ulang.' };
    } else if (process.platform === 'win32') {
      sendProgress(98, 'Menjalankan instalasi pembaruan Windows...');
      const child = spawn(destFile, ['/S'], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      setTimeout(() => {
        app.quit();
      }, 1000);

      return { success: true, message: 'Installer Windows dijalankan secara otomatis.' };
    } else {
      // Linux
      sendProgress(98, 'Memasang pembaruan Linux...');
      if (destFile.endsWith('.AppImage')) {
        execSync(`chmod +x "${destFile}"`);
        const currentAppImage = process.env.APPIMAGE;
        if (currentAppImage && fs.existsSync(currentAppImage)) {
          fs.copyFileSync(destFile, currentAppImage);
          execSync(`chmod +x "${currentAppImage}"`);
        }
      }

      sendProgress(100, 'Pembaruan selesai.');
      return { success: true, message: 'Pembaruan Linux berhasil disiapkan.' };
    }
  } catch (err: any) {
    sendProgress(0, `Gagal memasang pembaruan: ${err.message}`);
    return { success: false, error: err.message };
  }
}

let updaterIpcRegistered = false;
let currentMainWindow: BrowserWindow | null = null;
let backgroundCheckTimer: NodeJS.Timeout | null = null;

export function registerUpdaterIpc(mainWindow: BrowserWindow | null): void {
  currentMainWindow = mainWindow;

  if (updaterIpcRegistered) {
    return;
  }
  updaterIpcRegistered = true;

  try {
    ipcMain.removeHandler('app:get-info');
    ipcMain.removeHandler('app:check-updates');
    ipcMain.removeHandler('app:install-update');
  } catch {}

  ipcMain.handle('app:get-info', () => {
    return getAppInfo();
  });

  ipcMain.handle('app:check-updates', async () => {
    const result = await checkForUpdates();
    if (currentMainWindow && !currentMainWindow.isDestroyed()) {
      currentMainWindow.webContents.send('app:update-result', result);
    }
    return result;
  });

  ipcMain.handle('app:install-update', async (_event, customUrl?: string) => {
    return downloadAndInstallUpdate(currentMainWindow, customUrl);
  });

  // Background Automatic Update Checker
  // 1. Check 5 seconds after launch
  setTimeout(async () => {
    try {
      const res = await checkForUpdates();
      if (res.updateAvailable && currentMainWindow && !currentMainWindow.isDestroyed()) {
        currentMainWindow.webContents.send('app:update-available', res);
      }
    } catch {}
  }, 5000);

  // 2. Re-check periodically every 30 minutes
  if (backgroundCheckTimer) {
    clearInterval(backgroundCheckTimer);
  }
  backgroundCheckTimer = setInterval(async () => {
    try {
      const res = await checkForUpdates();
      if (res.updateAvailable && currentMainWindow && !currentMainWindow.isDestroyed()) {
        currentMainWindow.webContents.send('app:update-available', res);
      }
    } catch {}
  }, 30 * 60 * 1000);
}

