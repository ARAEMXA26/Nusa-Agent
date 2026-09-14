import React, { useState, useEffect } from 'react';
import {
  Package,
  ShieldCheck,
  ShieldAlert,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Star,
  Power,
  RefreshCw,
  X,
} from 'lucide-react';

interface PluginMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PluginMarketplaceModal: React.FC<PluginMarketplaceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed' | 'scanner'>('marketplace');
  const [catalog, setCatalog] = useState<any[]>([]);
  const [installed, setInstalled] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Scanner Tab State
  const [scanPath, setScanPath] = useState('');
  const [scanReport, setScanReport] = useState<any | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCatalog();
      fetchInstalled();
    }
  }, [isOpen]);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://127.0.0.1:4141/api/plugins/marketplace');
      if (res.ok) {
        const data = await res.json();
        setCatalog(data.catalog || []);
      }
    } catch (e) {
      console.error('Failed to fetch marketplace catalog:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstalled = async () => {
    try {
      const res = await fetch('http://127.0.0.1:4141/api/plugins/installed');
      if (res.ok) {
        const data = await res.json();
        setInstalled(data.plugins || []);
      }
    } catch (e) {
      console.error('Failed to fetch installed plugins:', e);
    }
  };

  const handleTogglePlugin = async (id: string, currentStatus: string) => {
    const shouldEnable = currentStatus !== 'installed';
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/plugins/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: shouldEnable }),
      });
      if (res.ok) {
        fetchInstalled();
        setActionMessage(`Plugin status updated`);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  const handleUninstall = async (id: string) => {
    if (!window.confirm(`Uninstall plugin '${id}'?`)) return;
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/plugins/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchInstalled();
        setActionMessage(`Plugin '${id}' uninstalled.`);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (e) {
      console.error('Uninstall failed:', e);
    }
  };

  const handleRunScan = async () => {
    if (!scanPath.trim()) return;
    try {
      setScanning(true);
      setScanReport(null);
      const res = await fetch('http://127.0.0.1:4141/api/plugins/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory_path: scanPath.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanReport(data.report);
      } else {
        const err = await res.json();
        alert(`Scan failed: ${err.detail}`);
      }
    } catch (e) {
      alert(`Scan request error: ${e}`);
    } finally {
      setScanning(false);
    }
  };

  if (!isOpen) return null;

  const categories = ['All', 'DevOps', 'Development', 'Database', 'Web Automation'];

  const filteredCatalog = catalog.filter((p) => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950/60 border border-emerald-700/50 rounded-lg text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                Plugin Marketplace & Security Center
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Phase 6
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Curated extensions, Ed25519 signing verification & deep AST code audits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-neutral-800 bg-neutral-900/50 text-xs">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'marketplace'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Package className="w-4 h-4" />
              Marketplace Catalog ({catalog.length})
            </button>
            <button
              onClick={() => setActiveTab('installed')}
              className={`py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'installed'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Installed ({installed.length})
            </button>
            <button
              onClick={() => setActiveTab('scanner')}
              className={`py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'scanner'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              AST Security Auditor
            </button>
          </div>

          {actionMessage && (
            <div className="text-xs text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
              {actionMessage}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/30">
          {/* TAB 1: MARKETPLACE */}
          {activeTab === 'marketplace' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search extensions by name, tag, or description..."
                    className="w-full pl-9 pr-4 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        selectedCategory === cat
                          ? 'bg-emerald-600 text-white font-medium'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Plugins */}
              {loading ? (
                <div className="flex items-center justify-center py-16 text-neutral-500 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Loading marketplace catalog...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {filteredCatalog.map((plugin) => {
                  const isInstalled = installed.some((ip) => ip.id === plugin.id);
                  return (
                    <div
                      key={plugin.id}
                      className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-1.5">
                              {plugin.name}
                              {plugin.is_official && (
                                <span
                                  title="Signed by Official Nusa Authority"
                                  className="text-emerald-400"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </span>
                              )}
                            </h3>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              v{plugin.version} • by {plugin.author}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400 text-xs bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{plugin.stars}</span>
                          </div>
                        </div>

                        <p className="text-xs text-neutral-300 mb-3 leading-relaxed">
                          {plugin.description}
                        </p>

                        {/* Permissions Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {plugin.permissions?.map((perm: string) => (
                            <span
                              key={perm}
                              className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 text-xs">
                        <span className="text-[11px] text-neutral-400 bg-neutral-800/60 px-2 py-0.5 rounded">
                          {plugin.category}
                        </span>
                        {isInstalled ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Installed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              alert(
                                `To install custom plugins locally, place them in your workspace or use the AST Scanner tab.`
                              );
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /> Get Plugin
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* TAB 2: INSTALLED */}
          {activeTab === 'installed' && (
            <div className="space-y-4">
              {installed.length === 0 ? (
                <div className="text-center py-16 text-neutral-500 space-y-2">
                  <Package className="w-10 h-10 mx-auto text-neutral-600" />
                  <p className="text-sm font-medium">No plugins currently installed.</p>
                  <p className="text-xs">Browse the catalog or install extensions from local folders.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {installed.map((p) => (
                    <div
                      key={p.id}
                      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-neutral-100">{p.name}</h4>
                          <span className="text-xs font-mono text-neutral-400">v{p.version}</span>
                          {/* Status Badge */}
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                              p.status === 'installed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : p.status === 'quarantined'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                            }`}
                          >
                            {p.status}
                          </span>
                          {/* Verification Badge */}
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 ${
                              p.verification_status === 'verified'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {p.verification_status === 'verified' ? (
                              <ShieldCheck className="w-3 h-3" />
                            ) : (
                              <ShieldAlert className="w-3 h-3" />
                            )}
                            {p.verification_status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">{p.description}</p>
                        <div className="text-[11px] font-mono text-neutral-500 truncate max-w-lg">
                          SHA-256: {p.checksum || 'N/A'}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          onClick={() => handleTogglePlugin(p.id, p.status)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                            p.status === 'installed'
                              ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                              : 'bg-emerald-950 hover:bg-emerald-900 border-emerald-700 text-emerald-300'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {p.status === 'installed' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleUninstall(p.id)}
                          className="p-1.5 bg-neutral-800 hover:bg-red-950 hover:text-red-400 border border-neutral-700 rounded-lg text-neutral-400 transition-colors"
                          title="Uninstall plugin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCANNER */}
          {activeTab === 'scanner' && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Deep AST Static Code Security Scanner
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Audit Python source code trees for dangerous functions (`eval`, `exec`), raw shell
                    executions (`os.system`, `subprocess(shell=True)`), or private secret leaks prior to installation.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300">
                    Plugin Directory Path (Absolute or Relative)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scanPath}
                      onChange={(e) => setScanPath(e.target.value)}
                      placeholder="/path/to/my-plugin-folder"
                      className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleRunScan}
                      disabled={scanning || !scanPath.trim()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      {scanning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning...
                        </>
                      ) : (
                        'Run Audit'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Scan Report Result */}
              {scanReport && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      {scanReport.is_safe ? (
                        <div className="p-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-red-950 text-red-400 border border-red-800 rounded-lg">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-100">
                          {scanReport.is_safe ? 'Safe to Install' : 'Security Threats Detected'}
                        </h4>
                        <span className="text-[11px] text-neutral-400">
                          Scanned {scanReport.scanned_files_count} Python files • Highest Severity:{' '}
                          <span
                            className={`font-semibold ${
                              scanReport.highest_severity === 'CRITICAL' || scanReport.highest_severity === 'HIGH'
                                ? 'text-red-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {scanReport.highest_severity}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Findings list */}
                  {scanReport.findings.length === 0 ? (
                    <p className="text-xs text-emerald-400/90 bg-emerald-950/40 p-3 rounded-lg border border-emerald-900/50">
                      Clean AST inspection: No dangerous function calls, reverse shells, or credential access patterns found.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-neutral-300">Detailed Findings:</h5>
                      {scanReport.findings.map((f: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border text-xs space-y-1 ${
                            f.severity === 'CRITICAL' || f.severity === 'HIGH'
                              ? 'bg-red-950/40 border-red-900/60 text-red-200'
                              : 'bg-amber-950/40 border-amber-900/60 text-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-semibold">{f.rule_id} [{f.severity}]</span>
                            <span>{f.file_path}{f.line_number ? `:${f.line_number}` : ''}</span>
                          </div>
                          <p className="text-neutral-300">{f.message}</p>
                          {f.snippet && (
                            <code className="block bg-black/40 p-1.5 rounded font-mono text-[11px] text-neutral-400">
                              {f.snippet}
                            </code>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
