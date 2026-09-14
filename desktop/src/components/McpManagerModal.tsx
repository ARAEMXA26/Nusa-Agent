import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { Network, Server, Wrench, ShieldAlert, X, Plus, Search } from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  transport: string;
  command: string;
  args: string[];
  url: string;
  enabled: boolean;
  is_quarantined: boolean;
  quarantine_reason: string;
}

interface MCPTool {
  server_id: string;
  server_name: string;
  name: string;
  description: string;
  input_schema: any;
  enabled: boolean;
}

interface McpManagerModalProps {
  onClose: () => void;
}

export const McpManagerModal: React.FC<McpManagerModalProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // New server form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServerId, setNewServerId] = useState('');
  const [newServerName, setNewServerName] = useState('');
  const [newServerCommand, setNewServerCommand] = useState('');
  const [newServerArgs, setNewServerArgs] = useState('');

  const fetchServersAndTools = async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        fetch('http://127.0.0.1:4141/api/mcp/servers'),
        fetch('http://127.0.0.1:4141/api/mcp/tools'),
      ]);
      if (sRes.ok) setServers(await sRes.json());
      if (tRes.ok) setTools(await tRes.json());
    } catch (err) {
      console.error('Failed to load MCP config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServersAndTools();
  }, []);

  const handleRegisterServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerId.trim() || !newServerName.trim() || !newServerCommand.trim()) return;

    try {
      const res = await fetch('http://127.0.0.1:4141/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newServerId.trim(),
          name: newServerName.trim(),
          transport: 'stdio',
          command: newServerCommand.trim(),
          args: newServerArgs.trim() ? newServerArgs.split(' ') : [],
        }),
      });

      if (res.ok) {
        // Start server
        await fetch(`http://127.0.0.1:4141/api/mcp/servers/${newServerId.trim()}/start`, {
          method: 'POST',
        });
        setShowAddForm(false);
        setNewServerId('');
        setNewServerName('');
        setNewServerCommand('');
        setNewServerArgs('');
        fetchServersAndTools();
      }
    } catch (err) {
      console.error('Failed to register MCP server:', err);
    }
  };

  const handleQuarantine = async (serverId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/mcp/servers/${serverId}/quarantine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual quarantine by user' }),
      });
      if (res.ok) {
        fetchServersAndTools();
      }
    } catch (err) {
      console.error('Failed to quarantine server:', err);
    }
  };

  const filteredTools = tools.filter((tool) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-neutral-100">{t('mcp_manager')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
            >
              <Plus className="w-4 h-4" />
              {t('register_mcp')}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="text-center py-6 text-neutral-500 text-xs">Memuat konfigurasi MCP...</div>
          )}
          {/* Add Server Form */}
          {showAddForm && (
            <form onSubmit={handleRegisterServer} className="p-4 rounded-xl bg-neutral-950 border border-indigo-900/40 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-100">Daftarkan Server MCP Baru (stdio)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Server ID</label>
                  <input
                    type="text"
                    value={newServerId}
                    onChange={(e) => setNewServerId(e.target.value)}
                    placeholder="misal: my-local-mcp"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Nama Tampilan</label>
                  <input
                    type="text"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="misal: Custom File Tools"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Executable Command</label>
                  <input
                    type="text"
                    value={newServerCommand}
                    onChange={(e) => setNewServerCommand(e.target.value)}
                    placeholder="npx atau python3"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Arguments (dipisah spasi)</label>
                  <input
                    type="text"
                    value={newServerArgs}
                    onChange={(e) => setNewServerArgs(e.target.value)}
                    placeholder="-y @modelcontextprotocol/server-filesystem"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded text-xs text-neutral-400 hover:text-neutral-200"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  {t('save')} & Hubungkan
                </button>
              </div>
            </form>
          )}

          {/* Configured Servers */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Server Terkonfigurasi ({servers.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {servers.map((srv) => (
                <div
                  key={srv.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    srv.is_quarantined
                      ? 'border-red-900/40 bg-red-950/20'
                      : 'border-neutral-800 bg-neutral-950/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-200">{srv.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 uppercase font-mono">
                        {srv.transport}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-neutral-500 mt-2 truncate">
                      {srv.command} {srv.args.join(' ')}
                    </p>

                    {srv.is_quarantined && (
                      <div className="mt-2 text-[11px] text-red-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Terkarantina: {srv.quarantine_reason}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          srv.enabled && !srv.is_quarantined ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      {srv.enabled && !srv.is_quarantined ? 'Aktif' : 'Nonaktif'}
                    </span>

                    {!srv.is_quarantined && (
                      <button
                        onClick={() => handleQuarantine(srv.id)}
                        className="text-[11px] text-red-400 hover:text-red-300 transition"
                      >
                        {t('quarantine')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tools & Search */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                MCP Tools Discovery ({filteredTools.length})
              </h3>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_tools')}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredTools.map((tool) => (
                <div
                  key={`${tool.server_id}-${tool.name}`}
                  className="p-3 rounded-lg border border-neutral-800/80 bg-neutral-950/30 hover:border-neutral-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-mono font-semibold text-neutral-200">{tool.name}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded">
                      via {tool.server_name}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
