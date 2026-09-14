import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { Settings, KeyRound, Cpu, X } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [defaultModel, setDefaultModel] = useState('openai/gpt-4o');
  const [saving, setSaving] = useState(false);

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
  }, []);

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-neutral-100">{t('settings')}</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-neutral-400 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              {t('model_provider')} & Default Model
            </label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="deterministic">Deterministic Test Runner (Offline/Tests)</option>
              <option value="openai/gpt-4o">OpenAI GPT-4o</option>
              <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
              <option value="anthropic/claude-3-5-sonnet-20241022">Anthropic Claude 3.5 Sonnet</option>
              <option value="ollama/llama3.1">Ollama Local (llama3.1)</option>
              <option value="openrouter/auto">OpenRouter Auto</option>
            </select>
          </div>

          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              {t('api_keys')}
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">OpenAI / OpenRouter API Key</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">OpenAI Base URL (Optional)</label>
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
              className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
