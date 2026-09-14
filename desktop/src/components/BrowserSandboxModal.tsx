import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ArrowRight, 
  RefreshCw, 
  X, 
  Layers, 
  Camera, 
  ShieldCheck, 
  ExternalLink,
  MousePointer,
  AlertTriangle,
  Check
} from 'lucide-react';

interface BrowserStatus {
  is_open: boolean;
  url: string;
  title: string;
}

interface InteractiveElement {
  id: string;
  type: string;
  text?: string;
  placeholder?: string;
  href?: string;
}

interface DOMSnapshot {
  success: boolean;
  url: string;
  title: string;
  text_preview: string;
  interactive_elements: InteractiveElement[];
}

interface BrowserSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrowserSandboxModal: React.FC<BrowserSandboxModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('https://example.com');
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [snapshot, setSnapshot] = useState<DOMSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dom' | 'visual'>('dom');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:4141/api/browser/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.url) setUrl(data.url);
      }
    } catch {
      // Gateway offline or idle
    }
  };

  const handleNavigate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url) return;

    setLoading(true);
    setErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('http://localhost:4141/api/browser/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (res.ok && data.success !== false) {
        setSnapshot(data);
        setStatus({ is_open: true, url: data.url, title: data.title });
        setActionSuccessMsg(`Berhasil terhubung ke ${data.title || data.url}`);
      } else {
        setErrorMsg(data.detail || data.error || 'Navigasi gagal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke Gateway gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleElementClick = async (targetId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('http://localhost:4141/api/browser/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMsg(`Elemen ${targetId} diklik`);
        if (data.snapshot) setSnapshot(data.snapshot);
      } else {
        setErrorMsg(data.error || 'Gagal mengeklik elemen.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Request gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseBrowser = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:4141/api/browser/close', { method: 'POST' });
      setStatus({ is_open: false, url: '', title: '' });
      setSnapshot(null);
      setActionSuccessMsg('Sesi browser ditutup.');
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-neutral-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-800/60 text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-100">Browser Sandbox & Computer-Use</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-sky-400 border border-neutral-700">
                  Playwright DOM-First
                </span>
                {status?.is_open && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Otomasi web efisien token dengan ekstraksi accessibility tree dan guardrails SSRF
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.is_open && (
              <button
                onClick={handleCloseBrowser}
                disabled={loading}
                className="px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                Tutup Browser
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Address Bar */}
        <form onSubmit={handleNavigate} className="p-3 border-b border-neutral-800 bg-neutral-900/90 flex items-center gap-2">
          <div className="flex-1 flex items-center bg-neutral-950 border border-neutral-700/80 rounded-lg px-3 py-1.5 gap-2 text-xs focus-within:border-sky-500">
            <Globe className="w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Masukkan URL (misal: https://example.com)"
              className="flex-1 bg-transparent text-neutral-200 outline-none text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            <span>Kunjungi</span>
          </button>
        </form>

        {/* Notifications */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {actionSuccessMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="px-4 pt-3 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dom')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'dom'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>DOM Accessibility Tree</span>
            </button>
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'visual'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Visual Snapshot</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SSRF Protection: Active</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'dom' ? (
            snapshot ? (
              <div className="space-y-4">
                {/* Page info */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-xs font-semibold text-neutral-100">{snapshot.title || 'Untitled Page'}</div>
                  <div className="text-[11px] text-sky-400 truncate mt-0.5">{snapshot.url}</div>
                </div>

                {/* Interactive Elements Grid */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                    <MousePointer className="w-3.5 h-3.5 text-sky-400" />
                    Elemen Interaktif ({snapshot.interactive_elements.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {snapshot.interactive_elements.map((el) => (
                      <div
                        key={el.id}
                        className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 shrink-0">
                            {el.id}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-950 text-sky-300 border border-sky-800/50 shrink-0">
                            {el.type}
                          </span>
                          <span className="text-neutral-300 truncate">
                            {el.text || el.placeholder || el.href || '-'}
                          </span>
                        </div>
                        {el.type === 'button' || el.type === 'a' ? (
                          <button
                            onClick={() => handleElementClick(el.id)}
                            disabled={loading}
                            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] shrink-0"
                          >
                            Klik
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clean Text Preview */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Text Preview (Token-Efficient LLM View)
                  </h3>
                  <pre className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                    {snapshot.text_preview || '(Tidak ada konten teks)'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                <Globe className="w-12 h-12 text-neutral-600 mb-3" />
                <p className="text-sm text-neutral-300 font-medium">Browser Sandbox Belum Aktif</p>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                  Ketikkan URL di bilah atas untuk meluncurkan sesi navigasi Playwright headless dengan inspeksi DOM real-time.
                </p>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
              <Camera className="w-12 h-12 text-neutral-600 mb-3" />
              <p className="text-sm text-neutral-300 font-medium">Visual Screenshot Mode</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                Tampilan visual disimpan ke workspace sebagai artefak PNG untuk inspeksi mata manusia atau model multimodal.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-2">
            <span>Scoped Computer-Use: Screen Bounds [0..3840, 0..2160]</span>
            <span>•</span>
            <span>Policy Tier 2: Approval Required for Keys & Clicks</span>
          </div>
          <div className="flex items-center gap-1 text-neutral-400">
            <span>Powered by Playwright</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>

      </div>
    </div>
  );
};
