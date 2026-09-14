import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import nusaLogo from '../assets/logo.png';
import {
  KeyRound,
  Cpu,
  X,
  RefreshCw,
  CheckCircle2,
  Download,
  Laptop,
  Monitor,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'llm' | 'about'>('llm');

  // LLM Config
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [defaultModel, setDefaultModel] = useState('openai/gpt-4o');
  const [saving, setSaving] = useState(false);

  // App & Update State
  const [appInfo, setAppInfo] = useState({
    version: '0.1.0',
    platform: 'darwin',
    arch: 'arm64',
    electronVersion: '44.3.0',
    nodeVersion: '22.10.0',
    isPackaged: false,
  });
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [showAllDownloads, setShowAllDownloads] = useState(false);

  useEffect(() => {
    fetch('http://127.0.0.1:4141/api/settings')
      .then((res) => res.json())
      .then((data) => {
        const s = data.settings || {};
        if (s.openai_api_key) setOpenaiKey(s.openai_api_key);
        if (s.openai_base_url) setOpenaiBaseUrl(s.openai_base_url);
        if (s.anthropic_api_key) setAnthropicKey(s.anthropic_api_key);
        if (s.ollama_base_url) setOllamaUrl(s.ollama_base_url);
        if (s.default_model) setDefaultModel(s.default_model);
      })
      .catch((err) => console.warn('Failed to load settings', err));

    // Fetch system and app info if inside Electron
    if ((window as any).nusa?.getAppInfo) {
      (window as any).nusa.getAppInfo().then((info: any) => {
        if (info) setAppInfo(info);
      });
    }

    // Auto-fetch update status and device downloads
    handleCheckUpdates();
  }, []);

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    try {
      if ((window as any).nusa?.checkForUpdates) {
        const res = await (window as any).nusa.checkForUpdates();
        setUpdateResult(res);
      } else {
        // Fallback simulation in web preview / browser
        const currentTag = 'v0.1.0';
        setUpdateResult({
          updateAvailable: false,
          currentVersion: '0.1.0',
          latestVersion: '0.1.0',
          currentDeviceLabel: 'macOS Apple Silicon (arm64)',
          deviceDownloadUrl: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-mac-arm64.dmg`,
          deviceDownloadName: 'Nusa-Agent-0.1.0-mac-arm64.dmg',
          deviceDownloadSize: '123.7 MB',
          availableDownloads: [
            {
              os: 'mac',
              platformName: 'macOS Apple Silicon (M1/M2/M3/M4)',
              arch: 'arm64',
              format: '.dmg',
              filename: `Nusa-Agent-0.1.0-mac-arm64.dmg`,
              url: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-mac-arm64.dmg`,
              sizeFormatted: '126.1 MB',
              isCurrentDevice: true,
            },
            {
              os: 'mac',
              platformName: 'macOS Apple Silicon (Portable)',
              arch: 'arm64',
              format: '.zip',
              filename: `Nusa-Agent-0.1.0-mac-arm64.zip`,
              url: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-mac-arm64.zip`,
              sizeFormatted: '125.5 MB',
              isCurrentDevice: false,
            },
            {
              os: 'mac',
              platformName: 'macOS Intel (x64)',
              arch: 'x64',
              format: '.dmg',
              filename: `Nusa-Agent-0.1.0-mac-x64.dmg`,
              url: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-mac-x64.dmg`,
              sizeFormatted: '132.9 MB',
              isCurrentDevice: false,
            },
            {
              os: 'mac',
              platformName: 'macOS Intel (Portable)',
              arch: 'x64',
              format: '.zip',
              filename: `Nusa-Agent-0.1.0-mac-x64.zip`,
              url: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-mac-x64.zip`,
              sizeFormatted: '132.3 MB',
              isCurrentDevice: false,
            },
            {
              os: 'win',
              platformName: 'Windows 64-bit (Setup Installer)',
              arch: 'x64',
              format: '.exe',
              filename: `Nusa-Agent-0.1.0-win-x64.exe`,
              url: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-win-x64.exe`,
              sizeFormatted: '109.2 MB',
              isCurrentDevice: false,
            },
            {
              os: 'win',
              platformName: 'Windows 64-bit (Portable)',
              arch: 'x64',
              format: '.exe',
              filename: `Nusa-Agent-0.1.0-win-x64-portable.exe`,
              url: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-win-x64-portable.exe`,
              sizeFormatted: '108.9 MB',
              isCurrentDevice: false,
            },
            {
              os: 'linux',
              platformName: 'Linux Universal (AppImage)',
              arch: 'x64',
              format: '.AppImage',
              filename: `Nusa-Agent-0.1.0-linux-x64.AppImage`,
              url: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-linux-x64.AppImage`,
              sizeFormatted: '124.1 MB',
              isCurrentDevice: false,
            },
            {
              os: 'linux',
              platformName: 'Linux Debian/Ubuntu (.deb)',
              arch: 'x64',
              format: '.deb',
              filename: `Nusa-Agent-0.1.0-linux-x64.deb`,
              url: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-linux-x64.deb`,
              sizeFormatted: '98.2 MB',
              isCurrentDevice: false,
            },
            {
              os: 'linux',
              platformName: 'Linux Standalone (.tar.gz)',
              arch: 'x64',
              format: '.tar.gz',
              filename: `Nusa-Agent-0.1.0-linux-x64.tar.gz`,
              url: `https://github.com/ARAEMXA26/Nusa-Agent/releases/download/${currentTag}/Nusa-Agent-0.1.0-linux-x64.tar.gz`,
              sizeFormatted: '117.6 MB',
              isCurrentDevice: false,
            }
          ],
          releaseNotes: 'You are running the latest production build of Nusa Agent.',
        });
      }
    } catch (err: any) {
      setUpdateResult({
        updateAvailable: false,
        error: err?.message || 'Failed to check updates',
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('http://127.0.0.1:4141/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openai_api_key: openaiKey || undefined,
          openai_base_url: openaiBaseUrl || undefined,
          anthropic_api_key: anthropicKey || undefined,
          ollama_base_url: ollamaUrl || undefined,
          default_model: defaultModel || undefined,
        }),
      });
      onClose();
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1 shadow-sm">
              <img src={nusaLogo} alt="Nusa Agent Logo" className="w-full h-full object-contain" />
            </div>
            <h3 className="font-semibold text-neutral-100 text-sm">{t('settings')}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-md hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-4">
          <button
            onClick={() => setActiveTab('llm')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'llm'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            {t('model_provider')}
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'about'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Tentang, Perangkat & Rilis
          </button>
        </div>

        {/* Tab 1: LLM Configuration */}
        {activeTab === 'llm' && (
          <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Default LLM Model
                </label>
                <input
                  type="text"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  placeholder="openai/gpt-4o or ollama/llama3.1:8b"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded pl-8 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  OpenAI Base URL (Optional)
                </label>
                <input
                  type="text"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Anthropic API Key
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded pl-8 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Ollama Base URL
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : t('save')}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: About, Platform, and Auto-Update */}
        {activeTab === 'about' && (
          <div className="p-5 space-y-4 overflow-y-auto text-sm">
            {/* App Card with Official Logo */}
            <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-start gap-3.5 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-center p-1 shrink-0 shadow-md shadow-indigo-500/10">
                <img src={nusaLogo} alt="Nusa Agent Logo" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-100 text-base">Nusa Agent</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                    v{appInfo.version}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Production Release
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Local-first autonomous AI agent command center lintas platform desktop yang aman, terisolasi, dan berdaya tinggi.
                </p>
              </div>
            </div>

            {/* System Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-neutral-800/40 border border-neutral-800 space-y-0.5">
                <span className="text-neutral-400">Sistem Operasi Aktif</span>
                <p className="font-mono text-neutral-200 uppercase flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                  {appInfo.platform} ({appInfo.arch})
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-800/40 border border-neutral-800 space-y-0.5">
                <span className="text-neutral-400">Electron Runtime</span>
                <p className="font-mono text-neutral-200">v{appInfo.electronVersion}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-800/40 border border-neutral-800 space-y-0.5">
                <span className="text-neutral-400">Local Gateway Daemon</span>
                <p className="font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  127.0.0.1:4141 (Online)
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-800/40 border border-neutral-800 space-y-0.5">
                <span className="text-neutral-400">Lisensi Perangkat Lunak</span>
                <p className="font-mono text-neutral-200">Apache 2.0 Open Source</p>
              </div>
            </div>

            {/* Dynamic Device Download & Update Center */}
            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-neutral-200 text-sm flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-indigo-400" />
                    Pembaruan Perangkat & Tautan Unduhan
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Tautan otomatis tersinkronisasi saat ada commit dan rilis kode baru.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={checkingUpdate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  {checkingUpdate ? 'Memeriksa...' : 'Periksa Pembaruan'}
                </button>
              </div>

              {/* Update Alert (if newer version detected) */}
              {updateResult?.updateAvailable && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/60 text-emerald-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Versi Pembaruan Baru Tersedia: v{updateResult.latestVersion}!</span>
                  </div>
                  <p className="text-neutral-300 text-[11px]">{updateResult.releaseNotes}</p>
                </div>
              )}

              {/* Active Device Quick Download Card */}
              <div className="p-3.5 rounded-lg bg-indigo-950/30 border border-indigo-800/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5" />
                    Perangkat Anda Saat Ini: {updateResult?.currentDeviceLabel || `${appInfo.platform} (${appInfo.arch})`}
                  </span>
                  {updateResult?.deviceDownloadSize && (
                    <span className="text-[10px] font-mono bg-indigo-900/60 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-700/60">
                      {updateResult.deviceDownloadSize}
                    </span>
                  )}
                </div>

                {updateResult?.deviceDownloadUrl ? (
                  <a
                    href={updateResult.deviceDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {updateResult.updateAvailable
                        ? `Unduh Pembaruan Terbaru (${updateResult.deviceDownloadName || 'Installer'})`
                        : `Unduh Installer Resmi (${updateResult.deviceDownloadName || 'Installer'})`}
                    </span>
                  </a>
                ) : (
                  <div className="text-xs text-neutral-400 py-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Anda sedang menjalankan versi stabil Nusa Agent.</span>
                  </div>
                )}
              </div>

              {/* Collapsible: All Available Device Downloads */}
              <div className="border-t border-neutral-800/80 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllDownloads(!showAllDownloads)}
                  className="flex items-center justify-between w-full py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Tautan Unduhan Semua Perangkat Tersedia ({updateResult?.availableDownloads?.length || 0})
                  </span>
                  {showAllDownloads ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showAllDownloads && (
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {updateResult?.availableDownloads?.map((dl: any, idx: number) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-md text-xs border ${
                          dl.isCurrentDevice
                            ? 'bg-indigo-950/40 border-indigo-800 text-indigo-200'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate mr-2">
                          <span className="font-medium text-neutral-200">{dl.platformName}</span>
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                            {dl.format}
                          </span>
                          {dl.isCurrentDevice && (
                            <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded uppercase tracking-wider font-semibold">
                              Perangkat Ini
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {dl.sizeFormatted && (
                            <span className="text-[10px] font-mono text-neutral-400">
                              {dl.sizeFormatted}
                            </span>
                          )}
                          <a
                            href={dl.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors"
                            title={`Unduh ${dl.filename}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Official GitHub Releases Link */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                <span>Versi kode & rilis otomatis terhubung ke GitHub</span>
                <a
                  href="https://github.com/ARAEMXA26/Nusa-Agent/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Lihat GitHub Releases
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
