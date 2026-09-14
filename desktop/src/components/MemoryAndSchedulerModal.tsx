import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Calendar, 
  UserCheck, 
  Clock, 
  Play, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  X,
  FolderLock
} from 'lucide-react';

interface MemoryItem {
  id: string;
  key: string;
  value: string;
  scope: string;
  project_id?: string;
  tags?: string[];
  updated_at?: string;
}

interface ProfileItem {
  id: string;
  name: string;
  description: string;
  default_model: string;
  is_active: boolean;
  profile_dir?: string;
}

interface CronJobItem {
  id: string;
  title: string;
  prompt: string;
  cron_expr: string;
  enabled: boolean;
  last_run_at?: string;
  next_run_at?: string;
}

interface CronRunItem {
  id: string;
  job_id: string;
  status: string;
  output_summary?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

interface MemoryAndSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
}

export const MemoryAndSchedulerModal: React.FC<MemoryAndSchedulerModalProps> = ({
  isOpen,
  onClose,
  activeProjectId,
}) => {
  const [activeTab, setActiveTab] = useState<'memory' | 'profiles' | 'cron'>('memory');

  // Memories State
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newScope, setNewScope] = useState<'project' | 'global'>('global');
  const [isAddingMemory, setIsAddingMemory] = useState(false);

  // Profiles State
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [isAddingProfile, setIsAddingProfile] = useState(false);

  // Cron Scheduler State
  const [cronJobs, setCronJobs] = useState<CronJobItem[]>([]);
  const [selectedJobRuns, setSelectedJobRuns] = useState<{ jobId: string; runs: CronRunItem[] } | null>(null);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobPrompt, setNewJobPrompt] = useState('');
  const [newJobExpr, setNewJobExpr] = useState('@hourly');
  const [isAddingJob, setIsAddingJob] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMemories();
      loadProfiles();
      loadCronJobs();
    }
  }, [isOpen, activeTab]);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // MEMORY ACTIONS
  const loadMemories = async () => {
    try {
      const url = searchQuery
        ? `http://127.0.0.1:4141/api/memory?query=${encodeURIComponent(searchQuery)}`
        : 'http://127.0.0.1:4141/api/memory';
      const res = await fetch(url);
      const data = await res.json();
      setMemories(data.items || []);
    } catch (e) {
      console.error('Failed to fetch memories', e);
    }
  };

  const handleAddMemory = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:4141/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey.trim(),
          value: newValue.trim(),
          scope: newScope,
          project_id: newScope === 'project' ? activeProjectId : undefined,
        }),
      });
      if (res.ok) {
        showNotification(`Memory '${newKey}' stored successfully.`);
        setNewKey('');
        setNewValue('');
        setIsAddingMemory(false);
        loadMemories();
      }
    } catch (e) {
      showNotification('Failed to add memory.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemory = async (key: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/memory/${key}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification(`Memory '${key}' forgotten.`);
        loadMemories();
      }
    } catch (e) {
      showNotification('Failed to delete memory.');
    }
  };

  // PROFILES ACTIONS
  const loadProfiles = async () => {
    try {
      const res = await fetch('http://127.0.0.1:4141/api/profiles');
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (e) {
      console.error('Failed to fetch profiles', e);
    }
  };

  const handleSwitchProfile = async (profileName: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:4141/api/profiles/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName }),
      });
      if (res.ok) {
        showNotification(`Switched active profile to '${profileName}'.`);
        loadProfiles();
      }
    } catch (e) {
      showNotification('Failed to switch profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:4141/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProfileName.trim(),
          description: newProfileDesc.trim(),
        }),
      });
      if (res.ok) {
        showNotification(`Profile '${newProfileName}' created.`);
        setNewProfileName('');
        setNewProfileDesc('');
        setIsAddingProfile(false);
        loadProfiles();
      }
    } catch (e) {
      showNotification('Failed to create profile.');
    } finally {
      setLoading(false);
    }
  };

  // CRON SCHEDULER ACTIONS
  const loadCronJobs = async () => {
    try {
      const res = await fetch('http://127.0.0.1:4141/api/cron/jobs');
      const data = await res.json();
      setCronJobs(data.jobs || []);
    } catch (e) {
      console.error('Failed to fetch cron jobs', e);
    }
  };

  const handleCreateJob = async () => {
    if (!newJobTitle.trim() || !newJobPrompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:4141/api/cron/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newJobTitle.trim(),
          prompt: newJobPrompt.trim(),
          cron_expr: newJobExpr.trim(),
          project_id: activeProjectId,
        }),
      });
      if (res.ok) {
        showNotification(`Scheduled job '${newJobTitle}' registered.`);
        setNewJobTitle('');
        setNewJobPrompt('');
        setIsAddingJob(false);
        loadCronJobs();
      }
    } catch (e) {
      showNotification('Failed to create cron job.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJob = async (jobId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/cron/jobs/${jobId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        loadCronJobs();
      }
    } catch (e) {
      showNotification('Failed to toggle cron job.');
    }
  };

  const handleRunJobNow = async (jobId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/cron/jobs/${jobId}/run`, {
        method: 'POST',
      });
      if (res.ok) {
        showNotification('Cron job triggered and executed successfully!');
        loadCronJobs();
      }
    } catch (e) {
      showNotification('Failed to trigger job.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/cron/jobs/${jobId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showNotification('Scheduled job deleted.');
        loadCronJobs();
      }
    } catch (e) {
      showNotification('Failed to delete cron job.');
    }
  };

  const handleViewJobRuns = async (jobId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:4141/api/cron/jobs/${jobId}/runs`);
      const data = await res.json();
      setSelectedJobRuns({ jobId, runs: data.runs || [] });
    } catch (e) {
      showNotification('Failed to fetch job history.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Memory & Task Automation</h2>
              <p className="text-xs text-neutral-400">Long-Term Memory, Scoped Profiles, and Cron Scheduler</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 px-6 gap-6 bg-neutral-950/40">
          <button
            onClick={() => setActiveTab('memory')}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === 'memory'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            Long-Term Memory
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === 'profiles'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Scoped Profiles
          </button>
          <button
            onClick={() => setActiveTab('cron')}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === 'cron'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Cron Scheduler
          </button>
        </div>

        {/* Notification Banner */}
        {statusMessage && (
          <div className="bg-purple-950/60 border-b border-purple-800/60 px-6 py-2 text-xs text-purple-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: MEMORIES */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadMemories()}
                    placeholder="Search memories by keyword (e.g. style, auth, tech stack)..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={() => setIsAddingMemory(!isAddingMemory)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Memory
                </button>
              </div>

              {/* Add Memory Form */}
              {isAddingMemory && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Memory Key (e.g. coding_style, db_pref)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                    />
                    <select
                      value={newScope}
                      onChange={(e) => setNewScope(e.target.value as any)}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="global">Global (All Workspaces)</option>
                      <option value="project">Project Local</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Memory content or guideline..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    rows={2}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingMemory(false)}
                      className="px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMemory}
                      disabled={loading || !newKey.trim() || !newValue.trim()}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs font-medium"
                    >
                      Save Memory
                    </button>
                  </div>
                </div>
              )}

              {/* Memory List */}
              <div className="grid grid-cols-1 gap-2.5">
                {memories.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500 text-xs">
                    No long-term memories found. Add preferences or guidelines above.
                  </div>
                ) : (
                  memories.map((m) => (
                    <div
                      key={m.id || m.key}
                      className="p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-lg flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-purple-400">{m.key}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            m.scope === 'global' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {m.scope}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed">{m.value}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(m.key)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-900 rounded transition shrink-0"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROFILES */}
          {activeTab === 'profiles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <FolderLock className="w-4 h-4 text-emerald-400" />
                  <span>Cross-Profile Soft Guard: <strong>Active</strong> (Profile directories are isolated)</span>
                </div>
                <button
                  onClick={() => setIsAddingProfile(!isAddingProfile)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Profile
                </button>
              </div>

              {/* Add Profile Form */}
              {isAddingProfile && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
                  <input
                    type="text"
                    placeholder="Profile Name (e.g. devops-engineer, qa-specialist)"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Profile Description..."
                    value={newProfileDesc}
                    onChange={(e) => setNewProfileDesc(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingProfile(false)}
                      className="px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateProfile}
                      disabled={loading || !newProfileName.trim()}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs font-medium"
                    >
                      Create Profile
                    </button>
                  </div>
                </div>
              )}

              {/* Profiles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profiles.map((p) => (
                  <div
                    key={p.id || p.name}
                    className={`p-4 rounded-xl border transition ${
                      p.is_active
                        ? 'bg-purple-950/20 border-purple-500/50 shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-neutral-100">{p.name}</span>
                        {p.is_active && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      {!p.is_active && (
                        <button
                          onClick={() => handleSwitchProfile(p.name)}
                          className="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-medium transition"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mb-3 line-clamp-2">{p.description || 'No description'}</p>
                    <div className="text-[11px] font-mono text-neutral-500 flex items-center justify-between border-t border-neutral-900 pt-2">
                      <span>Model: {p.default_model}</span>
                      <span className="truncate max-w-[150px]">{p.profile_dir}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CRON SCHEDULER */}
          {activeTab === 'cron' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Scheduled tasks run automatically in background using standard cron cadence</span>
                </div>
                <button
                  onClick={() => setIsAddingJob(!isAddingJob)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Schedule Job
                </button>
              </div>

              {/* Add Cron Job Form */}
              {isAddingJob && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Job Title (e.g. Daily Health Audit)"
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                    />
                    <select
                      value={newJobExpr}
                      onChange={(e) => setNewJobExpr(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="@hourly">@hourly (Every hour)</option>
                      <option value="@daily">@daily (Every midnight)</option>
                      <option value="*/30 * * * *">*/30 * * * * (Every 30 mins)</option>
                      <option value="interval:60">interval:60 (Every 60 secs)</option>
                      <option value="0 9 * * 1-5">0 9 * * 1-5 (Workdays 9 AM)</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Autonomous prompt/goal for the agent to execute..."
                    value={newJobPrompt}
                    onChange={(e) => setNewJobPrompt(e.target.value)}
                    rows={2}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingJob(false)}
                      className="px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateJob}
                      disabled={loading || !newJobTitle.trim() || !newJobPrompt.trim()}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs font-medium"
                    >
                      Save & Schedule
                    </button>
                  </div>
                </div>
              )}

              {/* Jobs List */}
              <div className="space-y-3">
                {cronJobs.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500 text-xs">
                    No scheduled cron jobs configured. Create one above.
                  </div>
                ) : (
                  cronJobs.map((j) => (
                    <div
                      key={j.id}
                      className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-neutral-200">{j.title}</span>
                          <span className="font-mono text-[11px] px-1.5 py-0.5 bg-neutral-800 text-purple-300 rounded border border-neutral-700">
                            {j.cron_expr}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            j.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-500'
                          }`}>
                            {j.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-mono line-clamp-1">{j.prompt}</p>
                        <div className="text-[10px] text-neutral-500 flex items-center gap-4 pt-1">
                          <span>Last Run: {j.last_run_at ? new Date(j.last_run_at).toLocaleString() : 'Never'}</span>
                          <span>Next Run: {j.next_run_at ? new Date(j.next_run_at).toLocaleString() : 'Pending'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRunJobNow(j.id)}
                          disabled={loading}
                          className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium flex items-center gap-1 transition"
                          title="Run job immediately"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                          Run Now
                        </button>
                        <button
                          onClick={() => handleViewJobRuns(j.id)}
                          className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium transition"
                        >
                          History
                        </button>
                        <button
                          onClick={() => handleToggleJob(j.id, j.enabled)}
                          className={`px-2.5 py-1.5 rounded text-xs font-medium transition ${
                            j.enabled ? 'bg-amber-950/40 text-amber-300 hover:bg-amber-950/60' : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60'
                          }`}
                        >
                          {j.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteJob(j.id)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-900 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Execution History Drawer / Modal */}
              {selectedJobRuns && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-neutral-200">Execution History for Job</h4>
                    <button
                      onClick={() => setSelectedJobRuns(null)}
                      className="text-neutral-500 hover:text-neutral-300 text-xs"
                    >
                      Close
                    </button>
                  </div>
                  {selectedJobRuns.runs.length === 0 ? (
                    <div className="text-xs text-neutral-500 py-3">No runs recorded yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedJobRuns.runs.map((r) => (
                        <div key={r.id} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${r.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <span className="font-mono text-neutral-300">{r.status}</span>
                            <span className="text-neutral-500">{new Date(r.started_at).toLocaleString()}</span>
                          </div>
                          <span className="text-neutral-400 truncate max-w-xs">{r.output_summary || r.error_message || 'Completed'}</span>
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
