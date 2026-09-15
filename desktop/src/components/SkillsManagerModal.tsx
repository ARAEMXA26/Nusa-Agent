import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Shield,
  X,
  Tag,
  Wrench,
  AlertTriangle,
  Search,
  Plus,
  Download,
  RotateCw,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  FileText,
  Activity,
  Layers,
  Cpu,
  Lock,
  ChevronRight,
  Info,
} from 'lucide-react';

export type SkillScope = 'bundled' | 'global' | 'user' | 'workspace';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AuditStatus = 'passed' | 'warning' | 'failed' | 'not_audited' | 'stale';

export interface ScanFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  message: string;
  file?: string;
  line?: number;
}

export interface ScanResult {
  passed: boolean;
  status: AuditStatus;
  risk_score: number;
  findings: ScanFinding[];
  audited_at?: string;
  audited_version?: string;
  checksum?: string;
}

export interface DependencyHealthItem {
  type: 'command' | 'runtime' | 'plugin' | 'env_var' | 'tool';
  name: string;
  available: boolean;
  required: boolean;
  details: string;
}

export interface SkillItem {
  id: string;
  name: string;
  version: string;
  description: string;
  tags: string[];
  scope: SkillScope;
  risk_level: RiskLevel;
  enabled: boolean;
  tools: string[];
  optional_tools: string[];
  path: string;
  audit: ScanResult;
  dependencies_health: DependencyHealthItem[];
  has_scripts: boolean;
  has_references: boolean;
  has_assets: boolean;
  usage_count: number;
  last_used_at?: string | null;
}

export interface SkillDetail {
  manifest: {
    schemaVersion: number;
    id: string;
    name: string;
    version: string;
    description: string;
    tags: string[];
    scope: SkillScope;
    entrypoint: string;
    enabledByDefault: boolean;
    tools: string[];
    optionalTools: string[];
    dependencies: {
      commands: string[];
      runtimes: string[];
      plugins: string[];
      environmentVariables: string[];
    };
    permissions: {
      filesystem: 'none' | 'read' | 'workspace-write';
      network: 'none' | 'restricted' | 'unrestricted';
      shell: 'none' | 'sandboxed' | 'host-with-approval';
      computerControl: 'none' | 'view' | 'interact-with-approval';
    };
    riskLevel: RiskLevel;
    requiresApprovalFor: string[];
    compatibility?: {
      os?: string[];
      minAppVersion?: string;
    };
  };
  instructions: string;
  path: string;
  checksum: string;
  instruction_checksum: string;
  manifest_checksum: string;
  enabled: boolean;
  audit: ScanResult;
  dependencies_health: DependencyHealthItem[];
  has_scripts: boolean;
  has_references: boolean;
  has_assets: boolean;
  usage_count: number;
  last_used_at?: string | null;
}

interface SkillsManagerModalProps {
  onClose: () => void;
}

type FilterType = 'all' | 'active' | 'inactive' | 'attention' | 'bundled' | 'global' | 'workspace';
type TabType = 'overview' | 'instructions' | 'tools' | 'dependencies' | 'security' | 'traces' | 'test';

export const SkillsManagerModal: React.FC<SkillsManagerModalProps> = ({ onClose }) => {
  // State
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Detail Modal State
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<SkillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Diagnostic Test State
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);

  // Traces State
  const [traces, setTraces] = useState<any[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);

  // Create / Import Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form State for Create Skill
  const [createForm, setCreateForm] = useState({
    id: '',
    name: '',
    version: '1.0.0',
    description: '',
    tags: '',
    scope: 'user' as SkillScope,
    risk_level: 'low' as RiskLevel,
    tools: 'workspace_read, file_read',
    instructions: `# Nama Skill\n\n## Purpose\nTujuan skill ini...\n\n## Trigger Conditions\nKapan skill ini aktif...\n\n## Do Not Use When\nKapan jangan digunakan...\n\n## Inputs\nInput yang diterima...\n\n## Allowed Tools\nTool yang diizinkan...\n\n## Workflow\nLangkah-langkah kerja...\n\n## Safety and Approval Gates\nBatasan keamanan...\n\n## Verification\nCara verifikasi hasil...\n\n## Output Contract\nFormat keluaran...\n\n## Failure Handling\nPenanganan kegagalan...\n`,
  });

  // Form State for Import Skill
  const [importSourcePath, setImportSourcePath] = useState('');

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://127.0.0.1:4141/api/skills');
      if (res.ok) {
        const rawData = await res.json();
        const list: any[] = Array.isArray(rawData) ? rawData : [];
        const normalized: SkillItem[] = list.map((s: any) => {
          const rawAudit = s.audit || s.scan_result || {};
          const auditStatus: AuditStatus =
            rawAudit.status ||
            (rawAudit.passed === false ? 'failed' : rawAudit.passed ? 'passed' : 'not_audited');

          return {
            id: s.id || s.name || 'unknown-skill',
            name: s.name || s.id || 'Unknown Skill',
            version: s.version || '1.0.0',
            description: s.description || '',
            tags: Array.isArray(s.tags) ? s.tags : [],
            scope: (s.scope as SkillScope) || 'bundled',
            risk_level: (s.risk_level as RiskLevel) || 'low',
            enabled: Boolean(s.enabled),
            tools: Array.isArray(s.tools)
              ? s.tools
              : Array.isArray(s.allowed_tools)
              ? s.allowed_tools
              : [],
            optional_tools: Array.isArray(s.optional_tools) ? s.optional_tools : [],
            path: s.path || '',
            audit: {
              passed: Boolean(rawAudit.passed ?? true),
              status: auditStatus,
              risk_score: typeof rawAudit.risk_score === 'number' ? rawAudit.risk_score : 0,
              findings: Array.isArray(rawAudit.findings) ? rawAudit.findings : [],
              audited_at: rawAudit.audited_at,
              audited_version: rawAudit.audited_version,
              checksum: rawAudit.checksum,
            },
            dependencies_health: Array.isArray(s.dependencies_health) ? s.dependencies_health : [],
            has_scripts: Boolean(s.has_scripts),
            has_references: Boolean(s.has_references),
            has_assets: Boolean(s.has_assets),
            usage_count: typeof s.usage_count === 'number' ? s.usage_count : 0,
            last_used_at: s.last_used_at || null,
          };
        });
        setSkills(normalized);
      } else {
        showToast('Gagal memuat daftar skills dari gateway.', 'error');
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
      showToast('Gagal terhubung ke gateway Nusa Agent.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  // Fetch Skill Detail
  const openSkillDetail = async (skillId: string, initialTab: TabType = 'overview') => {
    setSelectedSkillId(skillId);
    setActiveTab(initialTab);
    setDetailLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/skills/${skillId}`);
      if (res.ok) {
        const detail: SkillDetail = await res.json();
        setSelectedSkillDetail(detail);
      } else {
        showToast(`Gagal memuat detail skill '${skillId}'.`, 'error');
      }
    } catch (err) {
      console.error('Failed to load skill detail:', err);
    } finally {
      setDetailLoading(false);
    }

    // Also fetch traces in background
    fetchTraces(skillId);
  };

  const fetchTraces = async (skillId: string) => {
    setTracesLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/skills/${skillId}/traces`);
      if (res.ok) {
        const data = await res.json();
        setTraces(data.traces || []);
      }
    } catch (err) {
      console.error('Failed to load traces:', err);
    } finally {
      setTracesLoading(false);
    }
  };

  const runDiagnosticTest = async (skillId: string) => {
    setTesting(true);
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/skills/${skillId}/test`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        showToast(data.success ? 'Diagnostic Test Berhasil Lulus!' : 'Diagnostic Test Menemukan Isu.', data.success ? 'success' : 'error');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Test gagal dijalankan.', 'error');
      }
    } catch (err) {
      showToast('Error saat menghubungi server pengujian.', 'error');
    } finally {
      setTesting(false);
    }
  };

  const runSecurityAudit = async (skillId: string) => {
    try {
      showToast(`Menjalankan audit keamanan untuk '${skillId}'...`, 'info');
      const res = await fetch(`http://127.0.0.1:4141/api/skills/${skillId}/audit`, { method: 'POST' });
      if (res.ok) {
        const auditRes: ScanResult = await res.json();
        showToast(`Audit selesai: Status ${auditRes.status.toUpperCase()}`, auditRes.passed ? 'success' : 'error');
        // Refresh detail and skill list
        fetchSkills();
        if (selectedSkillId === skillId) {
          openSkillDetail(skillId, 'security');
        }
      } else {
        const err = await res.json();
        showToast(err.detail || 'Audit gagal.', 'error');
      }
    } catch (err) {
      showToast('Error saat audit skill.', 'error');
    }
  };

  const toggleSkill = async (skillId: string, currentEnabled: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    if (!currentEnabled && skill.audit.status === 'failed') {
      showToast(`Skill '${skill.name}' gagal audit keamanan dan tidak dapat diaktifkan.`, 'error');
      return;
    }

    const endpoint = currentEnabled
      ? `http://127.0.0.1:4141/api/skills/${skillId}/disable`
      : `http://127.0.0.1:4141/api/skills/${skillId}/enable`;

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        setSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, enabled: !currentEnabled } : s))
        );
        if (selectedSkillDetail && selectedSkillDetail.manifest.id === skillId) {
          setSelectedSkillDetail({ ...selectedSkillDetail, enabled: !currentEnabled });
        }
        showToast(`Skill '${skill.name}' berhasil ${!currentEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Gagal mengubah status skill.', 'error');
      }
    } catch (err) {
      console.error('Failed to toggle skill:', err);
      showToast('Error saat mengubah status skill.', 'error');
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus skill '${skillId}'? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:4141/api/skills/${skillId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Skill '${skillId}' berhasil dihapus.`, 'success');
        setSelectedSkillId(null);
        setSelectedSkillDetail(null);
        fetchSkills();
      } else {
        const err = await res.json();
        showToast(err.detail || 'Gagal menghapus skill.', 'error');
      }
    } catch (err) {
      showToast('Error saat menghapus skill.', 'error');
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const toolsArray = createForm.tools.split(',').map((t) => t.trim()).filter(Boolean);
      const tagsArray = createForm.tags.split(',').map((t) => t.trim()).filter(Boolean);

      const payload = {
        manifest: {
          schemaVersion: 1,
          id: createForm.id.trim(),
          name: createForm.name.trim(),
          version: createForm.version.trim(),
          description: createForm.description.trim(),
          tags: tagsArray,
          scope: createForm.scope,
          entrypoint: 'SKILL.md',
          enabledByDefault: true,
          tools: toolsArray,
          permissions: {
            filesystem: 'workspace-write',
            network: 'none',
            shell: 'none',
            computerControl: 'none',
          },
          riskLevel: createForm.risk_level,
          requiresApprovalFor: [],
        },
        instructions: createForm.instructions,
        scope: createForm.scope,
      };

      const res = await fetch('http://127.0.0.1:4141/api/skills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`Skill '${createForm.name}' berhasil dibuat!`, 'success');
        setShowCreateModal(false);
        fetchSkills();
      } else {
        const err = await res.json();
        showToast(err.detail || 'Gagal membuat skill.', 'error');
      }
    } catch (err) {
      showToast('Error saat membuat skill.', 'error');
    }
  };

  const handleImportSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importSourcePath.trim()) return;

    try {
      const res = await fetch('http://127.0.0.1:4141/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_path: importSourcePath.trim() }),
      });

      if (res.ok) {
        showToast('Skill berhasil diimpor!', 'success');
        setShowImportModal(false);
        setImportSourcePath('');
        fetchSkills();
      } else {
        const err = await res.json();
        showToast(err.detail || 'Gagal mengimpor skill.', 'error');
      }
    } catch (err) {
      showToast('Error saat mengimpor skill.', 'error');
    }
  };

  // Filtered Skills
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      if (!skill) return false;
      const tags = Array.isArray(skill.tags) ? skill.tags : [];
      const tools = Array.isArray(skill.tools) ? skill.tools : [];
      const auditStatus = skill.audit?.status || 'not_audited';
      const deps = Array.isArray(skill.dependencies_health) ? skill.dependencies_health : [];

      // 1. Text Search
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchName = (skill.name || '').toLowerCase().includes(query);
        const matchId = (skill.id || '').toLowerCase().includes(query);
        const matchDesc = (skill.description || '').toLowerCase().includes(query);
        const matchTags = tags.some((t) => t.toLowerCase().includes(query));
        const matchTools = tools.some((t) => t.toLowerCase().includes(query));
        if (!matchName && !matchId && !matchDesc && !matchTags && !matchTools) {
          return false;
        }
      }

      // 2. Chip Filter
      switch (activeFilter) {
        case 'active':
          return Boolean(skill.enabled);
        case 'inactive':
          return !skill.enabled;
        case 'attention':
          return (
            auditStatus === 'failed' ||
            auditStatus === 'warning' ||
            auditStatus === 'stale' ||
            deps.some((d) => d.required && !d.available)
          );
        case 'bundled':
          return skill.scope === 'bundled';
        case 'global':
          return skill.scope === 'global' || skill.scope === 'user';
        case 'workspace':
          return skill.scope === 'workspace';
        case 'all':
        default:
          return true;
      }
    });
  }, [skills, searchQuery, activeFilter]);

  // Render Audit Badge
  const renderAuditBadge = (audit?: ScanResult) => {
    const status = audit?.status || 'not_audited';
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-[#0C2419] text-[#34D399] px-2.5 py-0.5 rounded border border-[#164E33]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Lolos Audit Keamanan
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-amber-950/40 text-amber-300 px-2.5 py-0.5 rounded border border-amber-800/50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Peringatan Keamanan
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-red-950/40 text-red-300 px-2.5 py-0.5 rounded border border-red-800/50">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            Gagal Audit (Terkarantina)
          </span>
        );
      case 'stale':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-yellow-950/30 text-yellow-300 px-2.5 py-0.5 rounded border border-yellow-800/40">
            <RotateCw className="w-3.5 h-3.5 text-yellow-400" />
            Audit Kedaluwarsa
          </span>
        );
      case 'not_audited':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-neutral-800 text-neutral-400 px-2.5 py-0.5 rounded border border-neutral-700">
            <Shield className="w-3.5 h-3.5" />
            Belum Diaudit
          </span>
        );
    }
  };

  // Render Risk Level Badge
  const renderRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'low':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/30">LOW</span>;
      case 'medium':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-800/30">MED</span>;
      case 'high':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-950/40 text-orange-300 border border-orange-800/30">HIGH</span>;
      case 'critical':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-950/50 text-red-300 border border-red-700/50 animate-pulse">CRITICAL</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-[60] px-4 py-2.5 rounded-xl text-xs font-medium border shadow-2xl flex items-center gap-2 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80'
              : toastMessage.type === 'error'
              ? 'bg-red-950/90 text-red-200 border-red-800/80'
              : 'bg-neutral-800/90 text-neutral-200 border-neutral-700'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
          {toastMessage.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Window */}
      <div className="bg-[#0D0F14] border border-[#1E232E] rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col border-b border-[#1E232E] bg-[#11141D] px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight text-neutral-100">Skills Hub</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1A1F2C] text-indigo-300 border border-indigo-900/40">
                    {skills.length} skills aktif & terdaftar
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Standard Agent Skills dengan <span className="text-indigo-300 font-semibold">progressive disclosure</span>. Instruksi skill hanya dimuat ke dalam memori model ketika tugas yang sesuai diaktifkan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Skill
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181C26] hover:bg-[#202634] text-neutral-300 border border-[#282F40] text-xs font-medium transition"
              >
                <Download className="w-3.5 h-3.5" />
                Import Skill
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 transition ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar & Filter Chips */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari skill, tag, atau tool…"
                className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'active', label: 'Aktif' },
                  { id: 'inactive', label: 'Nonaktif' },
                  { id: 'attention', label: 'Butuh perhatian' },
                  { id: 'bundled', label: 'Bundled' },
                  { id: 'global', label: 'Global' },
                  { id: 'workspace', label: 'Workspace' },
                ] as Array<{ id: FilterType; label: string }>
              ).map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={`text-xs px-3 py-1 rounded-lg border transition ${
                    activeFilter === chip.id
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 font-medium'
                      : 'bg-[#0E1117] text-neutral-400 border-[#1B212D] hover:text-neutral-200 hover:bg-[#141822]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Skill Card List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-[#0A0C10]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-2">
              <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-sm">Menemukan dan memverifikasi skills...</span>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-2 border border-dashed border-neutral-800 rounded-2xl bg-[#0D0F14]/50">
              <Layers className="w-8 h-8 text-neutral-600" />
              <span className="text-sm">Tidak ada skill yang cocok dengan kriteria pencarian.</span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
                className="text-xs text-indigo-400 hover:underline mt-1"
              >
                Reset filter pencarian
              </button>
            </div>
          ) : (
            filteredSkills.map((skill) => {
              const deps = Array.isArray(skill.dependencies_health) ? skill.dependencies_health : [];
              const missingDeps = deps.filter((d) => d.required && !d.available);
              const isPassed = Boolean(skill.audit?.passed);
              const auditStatus = skill.audit?.status || 'not_audited';
              const tags = Array.isArray(skill.tags) ? skill.tags : [];
              const tools = Array.isArray(skill.tools) ? skill.tools : [];

              return (
                <div
                  key={skill.id}
                  onClick={() => openSkillDetail(skill.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                    isPassed
                      ? 'bg-[#10131B] border-[#1E232E] hover:border-indigo-500/40 hover:bg-[#121622]'
                      : 'bg-red-950/10 border-red-900/40 hover:border-red-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Metadata and Content */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Name, Version, Scope, Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-neutral-100 group-hover:text-indigo-300 transition">
                          {skill.name}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-[#171B24] text-neutral-300 border border-[#262D3D]">
                          v{skill.version}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#161D31] text-[#7C9BF2] border border-[#283860]">
                          {skill.scope}
                        </span>
                        {renderRiskBadge(skill.risk_level)}
                        {renderAuditBadge(skill.audit)}

                        {/* Missing Dependency Warning Badge */}
                        {missingDeps.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-800/40">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            {missingDeps.length} dep tidak tersedia
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
                        {skill.description}
                      </p>

                      {/* Tags & Tools */}
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-neutral-400">
                        {tags.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-neutral-500" />
                            <span className="text-neutral-400">{tags.join(', ')}</span>
                          </div>
                        )}
                        {tools.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Wrench className="w-3 h-3 text-neutral-500" />
                            <span className="text-neutral-300 font-mono text-[11px]">
                              Tools: {tools.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions & Toggle Switch */}
                    <div className="flex items-center gap-3 self-center pl-2">
                      {/* Toggle Switch */}
                      <button
                        title={
                          auditStatus === 'failed'
                            ? 'Skill tidak dapat diaktifkan karena gagal audit keamanan'
                            : skill.enabled
                            ? 'Klik untuk menonaktifkan skill'
                            : 'Klik untuk mengaktifkan skill'
                        }
                        disabled={auditStatus === 'failed'}
                        onClick={(e) => toggleSkill(skill.id, skill.enabled, e)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          skill.enabled && isPassed ? 'bg-[#5D5FEF]' : 'bg-[#222734]'
                        } ${auditStatus === 'failed' ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            skill.enabled && isPassed ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      {/* Open detail arrow icon */}
                      <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* Skill Detail Drawer / Modal                              */}
      {/* ======================================================== */}
      {selectedSkillId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-end animate-fadeIn">
          <div className="bg-[#0E1118] border-l border-[#1F2533] w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#1F2533] bg-[#121620] space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-neutral-100">
                      {selectedSkillDetail ? selectedSkillDetail.manifest.name : selectedSkillId}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                      v{selectedSkillDetail?.manifest.version || '1.0.0'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#161D31] text-[#7C9BF2] border border-[#283860]">
                      {selectedSkillDetail?.manifest.scope || 'bundled'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {selectedSkillDetail?.manifest.description}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedSkillId(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-[#1F2533] -mb-6 pt-2 overflow-x-auto text-xs">
                {(
                  [
                    { id: 'overview', label: 'Ringkasan', icon: Layers },
                    { id: 'instructions', label: 'Instruksi (SKILL.md)', icon: FileText },
                    { id: 'tools', label: 'Tools & Permissions', icon: Lock },
                    { id: 'dependencies', label: 'Dependencies', icon: Cpu },
                    { id: 'security', label: 'Audit Keamanan', icon: ShieldCheck },
                    { id: 'traces', label: 'Observability & Traces', icon: Activity },
                    { id: 'test', label: 'Diagnostik Test', icon: Play },
                  ] as Array<{ id: TabType; label: string; icon: any }>
                ).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-300'
                          : 'border-transparent text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0C10]">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-2">
                  <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">Memuat detail skill...</span>
                </div>
              ) : !selectedSkillDetail ? (
                <div className="text-center py-20 text-neutral-500 text-xs">Detail skill tidak ditemukan.</div>
              ) : (
                <>
                  {/* Tab: Overview */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-[#121620] border border-[#1F2533] space-y-1">
                          <span className="text-neutral-500 text-[11px]">Status Eksekusi</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                selectedSkillDetail.enabled ? 'bg-emerald-400' : 'bg-neutral-600'
                              }`}
                            />
                            <span className="font-semibold text-neutral-200">
                              {selectedSkillDetail.enabled ? 'Aktif di Router' : 'Dinonaktifkan'}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#121620] border border-[#1F2533] space-y-1">
                          <span className="text-neutral-500 text-[11px]">Level Risiko</span>
                          <div className="flex items-center gap-2">
                            {renderRiskBadge(selectedSkillDetail.manifest.riskLevel)}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#121620] border border-[#1F2533] space-y-1">
                          <span className="text-neutral-500 text-[11px]">Penggunaan Total</span>
                          <div className="font-semibold text-neutral-200">
                            {selectedSkillDetail.usage_count} kali dijalankan
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#121620] border border-[#1F2533] space-y-1">
                          <span className="text-neutral-500 text-[11px]">Terakhir Digunakan</span>
                          <div className="text-neutral-300">
                            {selectedSkillDetail.last_used_at || 'Belum pernah digunakan'}
                          </div>
                        </div>
                      </div>

                      {/* File Path & Integrity Checksums */}
                      <div className="p-3.5 rounded-xl bg-[#121620] border border-[#1F2533] space-y-2">
                        <div className="font-semibold text-neutral-200">Integritas & Penyimpanan</div>
                        <div className="text-neutral-400 font-mono text-[11px] break-all">
                          Path: {selectedSkillDetail.path}
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-[11px] font-mono text-neutral-400 pt-1 border-t border-[#1F2533]">
                          <div>Total Checksum: <span className="text-neutral-300">{selectedSkillDetail.checksum}</span></div>
                          <div>Instruction Checksum: <span className="text-neutral-300">{selectedSkillDetail.instruction_checksum}</span></div>
                          <div>Manifest Checksum: <span className="text-neutral-300">{selectedSkillDetail.manifest_checksum}</span></div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => runSecurityAudit(selectedSkillDetail.manifest.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          Audit Ulang Sekarang
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('test');
                            runDiagnosticTest(selectedSkillDetail.manifest.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#191E2A] hover:bg-[#222838] text-neutral-200 border border-[#2B3346] text-xs font-medium transition"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                          Jalankan Test Diagnostik
                        </button>

                        {selectedSkillDetail.manifest.scope !== 'bundled' && (
                          <button
                            onClick={() => handleDeleteSkill(selectedSkillDetail.manifest.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-medium transition ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus Skill
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab: Instructions (SKILL.md) */}
                  {activeTab === 'instructions' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span>Kontrak 10-Bagian Wajib SKILL.md</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedSkillDetail.instructions);
                            showToast('Instruksi berhasil disalin ke clipboard!', 'success');
                          }}
                          className="text-indigo-400 hover:underline"
                        >
                          Salin Teks
                        </button>
                      </div>
                      <div className="p-4 rounded-xl bg-[#08090C] border border-[#1E232E] font-mono text-[12px] text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                        {selectedSkillDetail.instructions}
                      </div>
                    </div>
                  )}

                  {/* Tab: Tools & Permissions */}
                  {activeTab === 'tools' && (
                    <div className="space-y-4 text-xs">
                      {/* Allowed Tools */}
                      <div className="p-4 rounded-xl bg-[#121620] border border-[#1F2533] space-y-2">
                        <div className="font-semibold text-neutral-200 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-indigo-400" />
                          Declared Tools (Least Privilege Boundary)
                        </div>
                        <p className="text-neutral-400 text-[11px]">
                          Hanya tool yang terdaftar di bawah ini yang dapat dipanggil saat skill ini aktif. Tool lain ditolak secara default (Deny by Default).
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {selectedSkillDetail.manifest.tools.map((tool) => (
                            <span
                              key={tool}
                              className="px-2.5 py-1 rounded-md bg-[#181D29] text-indigo-300 border border-indigo-900/40 font-mono text-[11px]"
                            >
                              {tool}
                            </span>
                          ))}
                          {selectedSkillDetail.manifest.optionalTools?.map((tool) => (
                            <span
                              key={tool}
                              className="px-2.5 py-1 rounded-md bg-[#181D29] text-neutral-400 border border-neutral-700/50 font-mono text-[11px]"
                            >
                              {tool} (opsional)
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Permissions Matrix */}
                      <div className="p-4 rounded-xl bg-[#121620] border border-[#1F2533] space-y-3">
                        <div className="font-semibold text-neutral-200 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-400" />
                          Policy Permissions
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#1F2533]">
                            <span className="text-neutral-500">Filesystem:</span>
                            <div className="font-semibold text-neutral-200 mt-0.5">
                              {selectedSkillDetail.manifest.permissions.filesystem}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#1F2533]">
                            <span className="text-neutral-500">Network:</span>
                            <div className="font-semibold text-neutral-200 mt-0.5">
                              {selectedSkillDetail.manifest.permissions.network}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#1F2533]">
                            <span className="text-neutral-500">Shell:</span>
                            <div className="font-semibold text-neutral-200 mt-0.5">
                              {selectedSkillDetail.manifest.permissions.shell}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#1F2533]">
                            <span className="text-neutral-500">Computer Control:</span>
                            <div className="font-semibold text-neutral-200 mt-0.5">
                              {selectedSkillDetail.manifest.permissions.computerControl}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Human Approval Required */}
                      <div className="p-4 rounded-xl bg-[#121620] border border-[#1F2533] space-y-2">
                        <div className="font-semibold text-neutral-200">Requires Approval For</div>
                        {selectedSkillDetail.manifest.requiresApprovalFor.length === 0 ? (
                          <span className="text-neutral-400 text-[11px]">
                            Mengikuti gate approval standar (destructive file delete, host shell command, external network send).
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {selectedSkillDetail.manifest.requiresApprovalFor.map((appr) => (
                              <span
                                key={appr}
                                className="px-2 py-0.5 rounded bg-amber-950/30 text-amber-300 border border-amber-800/40 text-[11px]"
                              >
                                {appr}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab: Dependencies */}
                  {activeTab === 'dependencies' && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-xl bg-[#121620] border border-[#1F2533] space-y-3">
                        <div className="font-semibold text-neutral-200">Pemeriksaan Dependensi Sistem & Tool</div>
                        <div className="divide-y divide-[#1F2533]">
                          {selectedSkillDetail.dependencies_health.map((dep, idx) => (
                            <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-neutral-200">{dep.name}</span>
                                  <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                                    {dep.type}
                                  </span>
                                  {dep.required ? (
                                    <span className="text-[10px] text-amber-400">wajib</span>
                                  ) : (
                                    <span className="text-[10px] text-neutral-500">opsional</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-neutral-500">{dep.details}</p>
                              </div>

                              <div>
                                {dep.available ? (
                                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Tersedia
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-950/30 px-2 py-0.5 rounded border border-red-800/40">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Hilang
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Security Audit */}
                  {activeTab === 'security' && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-xl bg-[#121620] border border-[#1F2533] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-neutral-200">Hasil Audit Statis & Checksum</div>
                          {renderAuditBadge(selectedSkillDetail.audit)}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                          <div className="p-2 rounded bg-[#0D1017] border border-[#1F2533]">
                            <span className="text-neutral-500">Risk Score:</span>
                            <div className="font-bold text-neutral-200 mt-0.5">{selectedSkillDetail.audit.risk_score} / 100</div>
                          </div>
                          <div className="p-2 rounded bg-[#0D1017] border border-[#1F2533]">
                            <span className="text-neutral-500">Versi Diaudit:</span>
                            <div className="text-neutral-300 mt-0.5">{selectedSkillDetail.audit.audited_version || selectedSkillDetail.manifest.version}</div>
                          </div>
                          <div className="p-2 rounded bg-[#0D1017] border border-[#1F2533]">
                            <span className="text-neutral-500">Waktu Audit:</span>
                            <div className="text-neutral-300 mt-0.5">{selectedSkillDetail.audit.audited_at || 'Saat discovery'}</div>
                          </div>
                        </div>

                        {/* Findings List */}
                        <div className="space-y-2 pt-2">
                          <span className="font-semibold text-neutral-300">Temuan Pemeriksaan Keamanan:</span>
                          {selectedSkillDetail.audit.findings.length === 0 ? (
                            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              Tidak ada kerentanan atau prompt injection yang ditemukan dalam paket ini.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {selectedSkillDetail.audit.findings.map((finding, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 space-y-1 text-red-200"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[11px] uppercase tracking-wider text-red-400">
                                      [{finding.severity}] {finding.category}
                                    </span>
                                    {finding.line && (
                                      <span className="text-[10px] text-neutral-400">Baris {finding.line}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-neutral-200">{finding.message}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Observability & Traces */}
                  {activeTab === 'traces' && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-xl bg-[#121620] border border-[#1F2533] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-neutral-200">Riwayat Eksekusi Skill (Audit Trail)</div>
                          <button
                            onClick={() => fetchTraces(selectedSkillDetail.manifest.id)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-200"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {tracesLoading ? (
                          <div className="text-center py-6 text-neutral-500">Memuat trace eksekusi...</div>
                        ) : traces.length === 0 ? (
                          <div className="text-center py-8 text-neutral-500">
                            Belum ada riwayat eksekusi untuk skill ini.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {traces.map((trace, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg bg-[#0A0C10] border border-[#1F2533] space-y-2"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-mono text-neutral-300">Run ID: {trace.id}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-medium ${
                                      trace.status === 'completed'
                                        ? 'text-emerald-400 bg-emerald-950/40'
                                        : trace.status === 'active'
                                        ? 'text-blue-400 bg-blue-950/40'
                                        : 'text-red-400 bg-red-950/40'
                                    }`}
                                  >
                                    {trace.status}
                                  </span>
                                </div>
                                <div className="text-neutral-400 text-[11px]">
                                  Model: <span className="text-neutral-300">{trace.model}</span> • Alasan:{' '}
                                  <span className="text-neutral-300">{trace.reason}</span>
                                </div>
                                {trace.tool_calls && trace.tool_calls.length > 0 && (
                                  <div className="pt-1.5 border-t border-[#1F2533] space-y-1">
                                    <span className="text-[10px] text-neutral-500 uppercase">Tool Calls:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {trace.tool_calls.map((tc: any, tIdx: number) => (
                                        <span
                                          key={tIdx}
                                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                            tc.permitted
                                              ? 'bg-neutral-800 text-neutral-300'
                                              : 'bg-red-950/50 text-red-300 border border-red-800/40'
                                          }`}
                                        >
                                          {tc.tool_name} ({tc.decision})
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab: Diagnostic Test */}
                  {activeTab === 'test' && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-xl bg-[#121620] border border-[#1F2533] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-neutral-200">Pemeriksaan Diagnostik Skill</div>
                          <button
                            disabled={testing}
                            onClick={() => runDiagnosticTest(selectedSkillDetail.manifest.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50 transition"
                          >
                            <Play className="w-3.5 h-3.5" />
                            {testing ? 'Menguji...' : 'Uji Sekarang'}
                          </button>
                        </div>

                        {testResult ? (
                          <div className="space-y-3 pt-2">
                            <div
                              className={`p-3 rounded-lg border flex items-center gap-2.5 font-medium ${
                                testResult.success
                                  ? 'bg-emerald-950/30 text-emerald-300 border-emerald-800/50'
                                  : 'bg-red-950/30 text-red-300 border-red-800/50'
                              }`}
                            >
                              {testResult.success ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                              <span>
                                {testResult.success
                                  ? 'Semua pemeriksaan validasi skema, kontrak, dependensi, dan keamanan lolos dengan sukses.'
                                  : 'Ditemukan kegagalan dalam verifikasi skill.'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2.5 rounded bg-[#0A0C10] border border-[#1F2533]">
                                <span className="text-neutral-500">Validitas Manifest:</span>
                                <div className="font-semibold text-neutral-200 mt-0.5">
                                  {testResult.manifest_valid ? 'Valid (Pydantic Schema)' : 'Invalid'}
                                </div>
                              </div>
                              <div className="p-2.5 rounded bg-[#0A0C10] border border-[#1F2533]">
                                <span className="text-neutral-500">Status Audit:</span>
                                <div className="font-semibold text-neutral-200 mt-0.5">
                                  {testResult.audit_status}
                                </div>
                              </div>
                              <div className="p-2.5 rounded bg-[#0A0C10] border border-[#1F2533]">
                                <span className="text-neutral-500">Kesesuaian Kontrak SKILL.md:</span>
                                <div className="font-semibold text-neutral-200 mt-0.5">
                                  {testResult.contract_missing_sections?.length === 0
                                    ? 'Lengkap (10/10 bagian)'
                                    : `Kurang ${testResult.contract_missing_sections?.length} bagian`}
                                </div>
                              </div>
                              <div className="p-2.5 rounded bg-[#0A0C10] border border-[#1F2533]">
                                <span className="text-neutral-500">Status Dependensi:</span>
                                <div className="font-semibold text-neutral-200 mt-0.5">
                                  {testResult.dependencies_ok ? 'Semua dependensi wajib tersedia' : 'Ada dependensi yang hilang'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-neutral-400 text-xs py-4 text-center">
                            Klik tombol "Uji Sekarang" untuk menjalankan dry-run diagnostic test pada skill ini.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal: Buat Skill                                        */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D0F14] border border-[#1F2533] rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2533] bg-[#11141D]">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-neutral-100 text-base">Buat Skill Baru</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-neutral-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSkill} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="create-skill-id" className="text-neutral-300 font-medium">Skill ID (kebab-case)*</label>
                  <input
                    id="create-skill-id"
                    required
                    type="text"
                    value={createForm.id}
                    onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                    placeholder="misal: api-integrator"
                    className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2 text-neutral-200"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="create-skill-name" className="text-neutral-300 font-medium">Nama UI*</label>
                  <input
                    id="create-skill-name"
                    required
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="misal: API Integrator"
                    className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2 text-neutral-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="create-skill-desc" className="text-neutral-300 font-medium">Deskripsi Singkat*</label>
                <textarea
                  id="create-skill-desc"
                  required
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Jelaskan kapabilitas dan batasan skill ini..."
                  className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2 text-neutral-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">Versi</label>
                  <input
                    type="text"
                    value={createForm.version}
                    onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                    className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2 text-neutral-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">Scope</label>
                  <select
                    value={createForm.scope}
                    onChange={(e) => setCreateForm({ ...createForm, scope: e.target.value as SkillScope })}
                    className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2 text-neutral-200"
                  >
                    <option value="user">User / Global</option>
                    <option value="workspace">Workspace</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">Risk Level</label>
                  <select
                    value={createForm.risk_level}
                    onChange={(e) => setCreateForm({ ...createForm, risk_level: e.target.value as RiskLevel })}
                    className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2 text-neutral-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Tools yang Dibutuhkan (pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={createForm.tools}
                  onChange={(e) => setCreateForm({ ...createForm, tools: e.target.value })}
                  className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2 text-neutral-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Tags (pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={createForm.tags}
                  onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                  placeholder="api, rest, network"
                  className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2 text-neutral-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Instruksi SKILL.md (10 Bagian Wajib)</label>
                <textarea
                  rows={8}
                  value={createForm.instructions}
                  onChange={(e) => setCreateForm({ ...createForm, instructions: e.target.value })}
                  className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2 text-neutral-200 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2533]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow"
                >
                  Simpan & Validasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal: Import Skill                                      */}
      {/* ======================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D0F14] border border-[#1F2533] rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2533] bg-[#11141D]">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-neutral-100 text-base">Import Skill</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-neutral-400 hover:text-neutral-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSkill} className="p-6 space-y-4 text-xs">
              <p className="text-neutral-400 leading-relaxed">
                Masukkan path absolut ke direktori skill yang berisi <span className="font-mono text-neutral-200">skill.json</span> dan <span className="font-mono text-neutral-200">SKILL.md</span>. Skill akan dipindai keamanannya sebelum didaftarkan.
              </p>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Path Direktori Skill</label>
                <input
                  required
                  type="text"
                  value={importSourcePath}
                  onChange={(e) => setImportSourcePath(e.target.value)}
                  placeholder="/Users/.../custom-skill"
                  className="w-full bg-[#0A0C10] border border-[#1F2533] rounded-lg p-2.5 text-neutral-200 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2533]">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow"
                >
                  Import Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
