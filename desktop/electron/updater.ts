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
