import React, { useState, useEffect } from 'react';
import { 
  RotateCw, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  Download, 
  Check, 
  Filter, 
  X, 
  FolderOpen, 
  Boxes, 
  Star 
} from 'lucide-react';

export interface ExtensionItem {
  id: string;
  name: string;
  publisher: string;
  description: string;
  version: string;
  downloads?: string;
  rating?: number;
  icon?: string;
  installed?: boolean;
  enabled?: boolean;
  executionTime?: string | null;
  downloadUrl?: string;
  installPath?: string;
}

interface ExtensionsMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionsMarketplace: React.FC<ExtensionsMarketplaceProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [installedList, setInstalledList] = useState<ExtensionItem[]>([]);
  const [recommendedList, setRecommendedList] = useState<ExtensionItem[]>([]);
  const [isInstalledOpen, setIsInstalledOpen] = useState(true);
  const [isRecommendedOpen, setIsRecommendedOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedExtForMenu, setSelectedExtForMenu] = useState<string | null>(null);

  const fetchExtensions = async (query = '') => {
    setLoading(true);
    try {
      const url = query 
        ? `http://127.0.0.1:4141/api/extensions?q=${encodeURIComponent(query)}` 
        : 'http://127.0.0.1:4141/api/extensions';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInstalledList(data.installed || []);
        setRecommendedList(data.recommended || []);
      }
    } catch (e) {
      console.warn('Fallback to built-in extension lists:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExtensions(searchQuery);
    }
  }, [isOpen, searchQuery]);

  const handleInstall = async (ext: ExtensionItem) => {
    setInstallingId(ext.id);
    try {
      const res = await fetch('http://127.0.0.1:4141/api/extensions/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ext.id,
          name: ext.name,
          publisher: ext.publisher,
          version: ext.version,
          description: ext.description,
          downloadUrl: ext.downloadUrl,
        }),
      });

      if (res.ok) {
        setStatusMessage(`Extension "${ext.name}" berhasil diinstal ke ~/.nusa/extensions/`);
        await fetchExtensions(searchQuery);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to install extension:', err);
    } finally {
      setInstallingId(null);
    }
  };

  const handleUninstall = async (extId: string) => {
    try {
      await fetch(`http://127.0.0.1:4141/api/extensions/${encodeURIComponent(extId)}`, {
        method: 'DELETE',
      });
      setStatusMessage(`Extension "${extId}" berhasil dihapus.`);
      setSelectedExtForMenu(null);
      await fetchExtensions(searchQuery);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to uninstall extension:', err);
    }
  };

  if (!isOpen) return null;

  // Custom vector icons for extension logos matching image 2
  const renderExtensionLogo = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('clangd')) {
      return (
        <div className="w-9 h-9 rounded bg-[#1A2536] border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-sm shadow-sm">
          C
        </div>
      );
    }
    if (n.includes('claude')) {
      return (
        <div className="w-9 h-9 rounded bg-[#2D1B19] border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
          </svg>
        </div>
      );
    }
    if (n.includes('container') || n.includes('docker')) {
      return (
        <div className="w-9 h-9 rounded bg-[#10243E] border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M3 9l9-5 9 5v8l-9 5-9-5V9z" />
            <path d="M12 4v18M3 9l9 5 9-5" />
          </svg>
        </div>
      );
    }
    if (n.includes('go')) {
      return (
        <div className="w-9 h-9 rounded bg-[#0F2936] border border-cyan-400/30 flex items-center justify-center font-bold text-cyan-300 text-sm shadow-sm">
          GO
        </div>
      );
    }
    if (n.includes('pyrefly') || n.includes('python')) {
      return (
        <div className="w-9 h-9 rounded bg-[#1F2338] border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17" />
          </svg>
        </div>
      );
    }
    if (n.includes('markdownlint')) {
      return (
        <div className="w-9 h-9 rounded bg-neutral-900 border border-neutral-700 flex flex-col items-center justify-center text-white text-[9px] font-mono leading-none font-bold">
          <span>M↓</span>
          <span className="text-[8px] text-neutral-400">Lint</span>
        </div>
      );
    }
    if (n.includes('firefox')) {
      return (
        <div className="w-9 h-9 rounded bg-[#371926] border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7c-2.5 0-4 1.5-4 4 0 2.5 2 4 4 4 2 0 4-1.5 4-4" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
        <Boxes className="w-5 h-5 stroke-white" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in">
      <div className="bg-[#121417] border border-neutral-800 w-full max-w-xl h-[88vh] rounded-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header matching Gambar 2 */}
        <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-neutral-800/80 bg-[#15181C]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-100 tracking-wide">Extensions</h3>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => fetchExtensions(searchQuery)} 
              title="Refresh Extensions"
              className="p-1.5 rounded hover:bg-neutral-800 transition-colors text-white"
            >
              <RotateCw className={`w-3.5 h-3.5 stroke-white ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              title="More Actions"
              className="p-1.5 rounded hover:bg-neutral-800 transition-colors text-white"
            >
              <MoreHorizontal className="w-3.5 h-3.5 stroke-white" />
            </button>
            <button 
              onClick={onClose} 
              title="Close"
              className="p-1.5 rounded hover:bg-neutral-800 transition-colors text-white ml-1"
            >
              <X className="w-4 h-4 stroke-white" />
            </button>
          </div>
        </div>

        {/* Search Bar matching Gambar 2 */}
        <div className="p-3 border-b border-neutral-800/60 bg-[#121417]">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Extensions in Marketplace"
              className="w-full bg-[#181B20] border border-neutral-700/80 rounded-md py-1.5 pl-3 pr-14 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
            <div className="absolute right-2 flex items-center gap-1 text-neutral-400">
              <button className="p-1 hover:text-white transition-colors" title="Filter Marketplace">
                <Filter className="w-3.5 h-3.5 stroke-white" />
              </button>
            </div>
          </div>

          {/* Subtitle notice from Gambar 2 */}
          <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
            By default, Antigravity IDE uses{' '}
            <a 
              href="https://open-vsx.org" 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              Open VSX
            </a>{' '}
            as a marketplace. This can be changed in{' '}
            <span className="text-blue-400 hover:underline cursor-pointer">Antigravity IDE settings</span>.
          </p>

          {statusMessage && (
            <div className="mt-2 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded flex items-center gap-1.5">
              <Check className="w-3 h-3 stroke-white" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Scrollable List Sections matching Gambar 2 */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/50">
          {/* Installed Section */}
          <div>
            <button
              onClick={() => setIsInstalledOpen(!isInstalledOpen)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-neutral-300 hover:bg-neutral-800/40 transition-colors bg-[#14171B]"
            >
              <div className="flex items-center gap-1.5">
                {isInstalledOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 stroke-white" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 stroke-white" />
                )}
                <span>Installed</span>
              </div>
              <span className="text-[10px] bg-neutral-800/80 text-neutral-400 px-2 py-0.5 rounded-full">
                {installedList.length}
              </span>
            </button>

            {isInstalledOpen && (
              <div className="divide-y divide-neutral-800/40">
                {installedList.map((ext) => (
                  <div
                    key={ext.id}
                    className="p-3 hover:bg-neutral-800/30 transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {renderExtensionLogo(ext.name)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-neutral-100 truncate">{ext.name}</h4>
                          {ext.executionTime && (
                            <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                              <RotateCw className="w-2.5 h-2.5 stroke-white" />
                              {ext.executionTime}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                          {ext.description}
                        </p>
                        <span className="text-[10px] text-neutral-500 font-medium block mt-0.5">
                          {ext.publisher}
                        </span>
                      </div>
                    </div>

                    <div className="relative shrink-0 flex items-center gap-1 pt-1">
                      <button
                        onClick={() => setSelectedExtForMenu(selectedExtForMenu === ext.id ? null : ext.id)}
                        className="p-1 rounded hover:bg-neutral-700/60 text-white transition-colors"
                        title="Extension Settings"
                      >
                        <Settings className="w-3.5 h-3.5 stroke-white" />
                      </button>

                      {selectedExtForMenu === ext.id && (
                        <div className="absolute right-0 top-7 w-40 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 z-30 text-xs text-neutral-300">
                          <button
                            onClick={() => handleUninstall(ext.id)}
                            className="w-full text-left px-3 py-1.5 hover:bg-rose-950/60 hover:text-rose-300 text-rose-400"
                          >
                            Uninstall
                          </button>
                          <button
                            onClick={() => {
                              alert(`Tersimpan di: ~/.nusa/extensions/${ext.id}`);
                              setSelectedExtForMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 text-neutral-300 flex items-center gap-1.5"
                          >
                            <FolderOpen className="w-3.5 h-3.5 stroke-white" />
                            Open Folder
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Section */}
          <div>
            <button
              onClick={() => setIsRecommendedOpen(!isRecommendedOpen)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-neutral-300 hover:bg-neutral-800/40 transition-colors bg-[#14171B]"
            >
              <div className="flex items-center gap-1.5">
                {isRecommendedOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 stroke-white" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 stroke-white" />
                )}
                <span>Recommended</span>
              </div>
              <span className="text-[10px] bg-neutral-800/80 text-neutral-400 px-2 py-0.5 rounded-full">
                {recommendedList.length}
              </span>
            </button>

            {isRecommendedOpen && (
              <div className="divide-y divide-neutral-800/40">
                {recommendedList.map((ext) => (
                  <div
                    key={ext.id}
                    className="p-3 hover:bg-neutral-800/30 transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {renderExtensionLogo(ext.name)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-neutral-100 truncate">{ext.name}</h4>
                          {ext.downloads && (
                            <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                              <Download className="w-2.5 h-2.5 stroke-white" />
                              {ext.downloads}
                            </span>
                          )}
                          {ext.rating && (
                            <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-medium">
                              <Star className="w-2.5 h-2.5 fill-amber-400 stroke-white" />
                              {ext.rating}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                          {ext.description}
                        </p>
                        <span className="text-[10px] text-neutral-500 font-medium block mt-0.5">
                          {ext.publisher}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1">
                      <button
                        onClick={() => handleInstall(ext)}
                        disabled={installingId === ext.id}
                        className="px-3 py-1 bg-[#0E639C] hover:bg-[#1177BB] text-white text-xs font-semibold rounded transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {installingId === ext.id ? (
                          <>
                            <RotateCw className="w-3 h-3 stroke-white animate-spin" />
                            <span>Installing...</span>
                          </>
                        ) : (
                          <span>Install</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info showing destination folder */}
        <div className="p-2.5 bg-[#15181C] border-t border-neutral-800/80 px-4 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 stroke-white" />
            <span>Folder Penyimpanan: <code className="text-neutral-300">~/.nusa/extensions/</code></span>
          </div>
          <span className="text-[10px] text-neutral-500">Source: Open VSX / Community</span>
        </div>
      </div>
    </div>
  );
};
