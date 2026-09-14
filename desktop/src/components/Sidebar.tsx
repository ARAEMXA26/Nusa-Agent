import React, { useState } from 'react';
import { Project } from '../types/protocol';
import { 
  Folder, 
  CheckSquare, 
  Bot, 
  Sparkles, 
  Zap, 
  Puzzle, 
  Settings as SettingsIcon, 
  Plus, 
  Users, 
  ChevronLeft, 
  FolderGit2, 
  FolderPlus 
} from 'lucide-react';

interface SidebarProps {
  connected: boolean;
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project) => void;
  tasks: any[];
  activeTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onSelectDashboard: () => void;
  onCreateProject: (name: string, path: string) => void;
  onOpenNewTask: () => void;
  onOpenSettings: () => void;
  onOpenSkills: () => void;
  onOpenMcp: () => void;
  onOpenBrowser: () => void;
  onOpenMemory: () => void;
  onOpenPlugins: () => void;
  onOpenExtensions: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connected,
  projects: _projects,
  activeProject: _activeProject,
  setActiveProject: _setActiveProject,
  tasks,
  activeTaskId: _activeTaskId,
  onSelectTask,
  onSelectDashboard,
  onCreateProject,
  onOpenNewTask,
  onOpenSettings,
  onOpenSkills,
  onOpenMcp: _onOpenMcp,
  onOpenBrowser,
  onOpenMemory,
  onOpenPlugins: _onOpenPlugins,
  onOpenExtensions,
}) => {
  const [activeNav, setActiveNav] = useState<'projects' | 'tasks' | 'agents' | 'skills' | 'automations' | 'extensions' | 'settings'>('projects');
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projPath, setProjPath] = useState('');

  const recentProjects = [
    { id: 'p1', name: 'Analytics Dashboard', updated: '2 hours ago' },
    { id: 'p2', name: 'Customer Insights', updated: '1 day ago' },
    { id: 'p3', name: 'Marketing Agent', updated: '3 days ago' },
    { id: 'p4', name: 'Product Research', updated: '1 week ago' },
    { id: 'p5', name: 'Infra Automation', updated: '1 week ago' },
  ];

  const handleCreateProj = (e: React.FormEvent) => {
    e.preventDefault();
    if (projName && projPath) {
      onCreateProject(projName, projPath);
      setProjName('');
      setProjPath('');
      setShowNewProjModal(false);
    }
  };

  return (
    <aside className="w-64 bg-[#0D0F12] border-r border-neutral-800/80 flex flex-col h-screen select-none shrink-0 text-neutral-300">
      {/* Brand Header */}
      <div className="pt-6 pb-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Custom vector star icon matching Gambar 1 */}
          <div className="w-6 h-6 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-white stroke-[2.2]">
              <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
              <path d="M12 7L13.5 10.5L17 12L13.5 13.5L12 17L10.5 13.5L7 12L10.5 10.5L12 7Z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-sm text-white tracking-wider">NUSA AGENT</span>
        </div>

        {/* Connection status indicator */}
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-rose-500 animate-pulse'
          }`}
          title={connected ? 'Connected to Gateway' : 'Disconnected'}
        />
      </div>

      {/* Primary Action Button: + New Task matching Gambar 1 */}
      <div className="px-4 py-2.5">
        <button
          onClick={onOpenNewTask}
          className="w-full bg-[#1D63ED] hover:bg-[#256BF5] active:bg-[#1554D1] text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs transition-all shadow-md shadow-blue-900/30 group"
        >
          <Plus className="w-4 h-4 stroke-white stroke-[2.5] transition-transform group-hover:rotate-90" />
          <span>New Task</span>
        </button>
      </div>

      {/* Main Navigation List matching Gambar 1 */}
      <div className="px-3 py-2 space-y-0.5">
        {/* Projects */}
        <button
          onClick={() => {
            setActiveNav('projects');
            onSelectDashboard();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeNav === 'projects'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Folder className="w-4 h-4 stroke-white" />
          <span>Projects</span>
        </button>

        {/* Active Tasks with Badge 3 */}
        <button
          onClick={() => {
            setActiveNav('tasks');
            if (tasks.length > 0) {
              onSelectTask(tasks[0].id);
            }
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeNav === 'tasks'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="w-4 h-4 stroke-white" />
            <span>Active Tasks</span>
          </div>
          <span className="w-5 h-5 rounded-full bg-[#1C212B] text-neutral-300 text-[11px] font-semibold flex items-center justify-center">
            {tasks.length > 0 ? tasks.length : 3}
          </span>
        </button>

        {/* Agents */}
        <button
          onClick={() => {
            setActiveNav('agents');
            onOpenBrowser();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeNav === 'agents'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Bot className="w-4 h-4 stroke-white" />
          <span>Agents</span>
        </button>

        {/* Skills */}
        <button
          onClick={() => {
            setActiveNav('skills');
            onOpenSkills();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeNav === 'skills'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Sparkles className="w-4 h-4 stroke-white" />
          <span>Skills</span>
        </button>

        {/* Automations */}
        <button
          onClick={() => {
            setActiveNav('automations');
            onOpenMemory();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeNav === 'automations'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Zap className="w-4 h-4 stroke-white" />
          <span>Automations</span>
        </button>

        {/* Extensions - EXACTLY PLACED UNDER AUTOMATIONS as required by user! */}
        <button
          onClick={() => {
            setActiveNav('extensions');
            onOpenExtensions();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeNav === 'extensions'
              ? 'bg-[#151921] text-white font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <Puzzle className="w-4 h-4 stroke-white" />
            <span>Extensions</span>
          </div>
          <span className="text-[10px] text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.5 rounded font-mono">
            Open VSX
          </span>
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            setActiveNav('settings');
            onOpenSettings();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeNav === 'settings'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <SettingsIcon className="w-4 h-4 stroke-white" />
          <span>Settings</span>
        </button>
      </div>

      {/* Recent Projects Section matching Gambar 1 */}
      <div className="flex-1 overflow-y-auto px-3 py-4 mt-2">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Recent Projects
          </span>
          <button
            onClick={() => setShowNewProjModal(true)}
            className="text-neutral-500 hover:text-white transition-colors"
            title="Add Project"
          >
            <FolderPlus className="w-3.5 h-3.5 stroke-white" />
          </button>
        </div>

        <div className="space-y-1">
          {recentProjects.map((p, idx) => (
            <button
              key={p.id}
              onClick={onSelectDashboard}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start gap-2.5 ${
                idx === 0
                  ? 'bg-[#151921] border border-neutral-700/60 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
              }`}
            >
              <Folder className="w-4 h-4 stroke-white shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{p.name}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">{p.updated}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Footer: Team Workspace matching Gambar 1 */}
      <div className="p-3 border-t border-neutral-800/80 bg-[#0A0C0E]">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-800/40 cursor-pointer transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#181D26] border border-neutral-700/60 flex items-center justify-center text-white">
              <Users className="w-3.5 h-3.5 stroke-white" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Team Workspace</div>
              <div className="text-[10px] text-neutral-500">8 members</div>
            </div>
          </div>
          <ChevronLeft className="w-3.5 h-3.5 stroke-white" />
        </div>
      </div>

      {/* Create Project Modal */}
      {showNewProjModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h2 className="text-sm font-semibold text-neutral-100 mb-3 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 stroke-white" />
              <span>Tambah Proyek Baru</span>
            </h2>
            <form onSubmit={handleCreateProj} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Nama Proyek</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="Misal: Growth Analytics"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">Direktori Host (Root Path)</label>
                <input
                  type="text"
                  required
                  value={projPath}
                  onChange={(e) => setProjPath(e.target.value)}
                  placeholder="/Users/ariardianto/Documents/AGENT"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjModal(false)}
                  className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
