import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import {
  Settings,
  KeyRound,
  Cpu,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Laptop
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
  }, []);

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateResult(null);
    try {
      if ((window as any).nusa?.checkForUpdates) {
        const res = await (window as any).nusa.checkForUpdates();
        setUpdateResult(res);
      } else {
        // Fallback simulation in web preview
        await new Promise((r) => setTimeout(r, 800));
        setUpdateResult({
          updateAvailable: false,
          currentVersion: '0.1.0',
          latestVersion: '0.1.0',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-neutral-100">{t('settings')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/20 px-4 pt-2 gap-2 text-sm">
          <button
            onClick={() => setActiveTab('llm')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'llm'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Model & Providers
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'about'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            About & Auto-Update
          </button>
        </div>

        {/* Tab 1: LLM & Provider Settings */}
        {activeTab === 'llm' && (
          <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-neutral-300 font-medium pb-1 border-b border-neutral-800">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>Konfigurasi Model LLM</span>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Default Model</label>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="openai/gpt-4o">OpenAI: GPT-4o (Default Recommended)</option>
                  <option value="openai/gpt-4o-mini">OpenAI: GPT-4o Mini (Fast & Cheap)</option>
                  <option value="anthropic/claude-3-5-sonnet-20241022">Anthropic: Claude 3.5 Sonnet</option>
                  <option value="anthropic/claude-3-5-haiku-20241022">Anthropic: Claude 3.5 Haiku</option>
                  <option value="ollama/qwen2.5-coder:7b">Ollama: Qwen 2.5 Coder 7B (Local)</option>
                  <option value="ollama/llama3.1:8b">Ollama: Llama 3.1 8B (Local)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-neutral-300 font-medium pt-3 pb-1 border-b border-neutral-800">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>{t('api_keys')}</span>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">OpenAI Base URL (Optional / Compatible)</label>
                <input
                  type="text"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Anthropic API Key</label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Ollama Base URL (Local)</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : t('save')}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: About, Platform, and Auto-Update */}
        {activeTab === 'about' && (
          <div className="p-4 space-y-4 overflow-y-auto text-sm">
            {/* App Card */}
            <div className="p-4 rounded-lg bg-neutral-950/60 border border-neutral-800 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-100 text-base">Nusa Agent</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                    v{appInfo.version}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Production Release
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Local-first autonomous AI agent command center across desktop platforms.
                </p>
              </div>
            </div>

            {/* System Info Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-neutral-800/40 border border-neutral-800 space-y-0.5">
                <span className="text-neutral-400">Operating System</span>
                <p className="font-mono text-neutral-200 uppercase">
                  {appInfo.platform} ({appInfo.arch})
                </p>
              </div>
              <div className="p-2.5 rounded bg-neutral-800/40 border border-neutral-800 space-y-0.5">
                <span className="text-neutral-400">Electron Runtime</span>
                <p className="font-mono text-neutral-200">v{appInfo.electronVersion}</p>
              </div>
              <div className="p-2.5 rounded bg-neutral-800/40 border border-neutral-800 space-y-0.5">
                <span className="text-neutral-400">Local Gateway</span>
                <p className="font-mono text-emerald-400">127.0.0.1:4141 (Online)</p>
              </div>
              <div className="p-2.5 rounded bg-neutral-800/40 border border-neutral-800 space-y-0.5">
                <span className="text-neutral-400">License</span>
                <p className="font-mono text-neutral-200">Apache 2.0 Open Source</p>
              </div>
            </div>

            {/* Check for Updates Section */}
            <div className="p-4 rounded-lg bg-neutral-950/40 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-neutral-200 text-sm">Software Updates</h4>
                  <p className="text-xs text-neutral-400">
                    Check GitHub Releases for the latest patches and multi-platform packages.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={checkingUpdate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  {checkingUpdate ? 'Checking...' : 'Check for Updates'}
                </button>
              </div>

              {/* Update Result Feedback */}
              {updateResult && (
                <div
                  className={`p-3 rounded-md text-xs border ${
                    updateResult.updateAvailable
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      : updateResult.error
                      ? 'bg-red-950/40 border-red-800/60 text-red-200'
                      : 'bg-neutral-800/60 border-neutral-700 text-neutral-300'
                  }`}
                >
                  {updateResult.updateAvailable ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 font-medium text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Update Available: v{updateResult.latestVersion}!</span>
                      </div>
                      <p className="text-neutral-300">{updateResult.releaseNotes}</p>
                      {updateResult.downloadUrl && (
                        <a
                          href={updateResult.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs mt-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Update
                        </a>
                      )}
                    </div>
                  ) : updateResult.error ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{updateResult.error}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{updateResult.releaseNotes || 'You are on the latest version of Nusa Agent (v0.1.0).'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium"
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
