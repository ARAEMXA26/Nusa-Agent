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
  ChevronRight,
  FolderGit2, 
  FolderPlus,
  Search,
  Play,
  Files,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export type SidebarMode = 'expanded' | 'compact' | 'hidden';
export type PrimaryView =
  | 'home'
  | 'projects'
  | 'tasks'
  | 'agents'
  | 'skills'
  | 'automations'
  | 'extensions'
  | 'settings';

export interface SidebarProps {
  connected: boolean;
  sidebarMode?: SidebarMode;
  onSidebarModeChange?: (mode: SidebarMode) => void;
  primaryView?: PrimaryView;
  onSelectPrimaryView?: (view: PrimaryView) => void;
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project) => void;
  tasks: any[];
  activeTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onSelectDashboard: () => void;
  onSelectProjects?: () => void;
  onCreateProject: (name: string, path: string) => void;
  onOpenNewTask: () => void;
  onOpenSettings: () => void;
  onOpenSkills: () => void;
  onOpenMcp: () => void;
  onOpenBrowser: () => void;
  onOpenMemory: () => void;
  onOpenPlugins?: () => void;
  onOpenExtensions: () => void;
  onOpenSearch?: () => void;
  onOpenSourceControl?: () => void;
  onOpenRunDebug?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connected,
  sidebarMode = 'expanded',
  onSidebarModeChange,
  primaryView = 'projects',
  onSelectPrimaryView,
  projects: _projects,
  activeProject: _activeProject,
  setActiveProject: _setActiveProject,
  tasks,
  activeTaskId: _activeTaskId,
  onSelectTask,
  onSelectDashboard,
  onSelectProjects,
  onCreateProject,
  onOpenNewTask,
  onOpenSettings,
  onOpenSkills,
  onOpenMcp: _onOpenMcp,
  onOpenBrowser,
  onOpenMemory,
  onOpenPlugins: _onOpenPlugins,
  onOpenExtensions,
  onOpenSearch,
  onOpenSourceControl,
  onOpenRunDebug,
}) => {
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projPath, setProjPath] = useState('');

  const recentProjects = [
    { id: 'p1', name: 'CODE', path: '/Users/ariardianto/Documents/AGENT/CODE', updated: 'Just now' },
    { id: 'p2', name: 'Analytics Dashboard', path: '/Users/ariardianto/Documents/AGENT/analytics', updated: '2 hours ago' },
    { id: 'p3', name: 'Customer Insights', path: '/Users/ariardianto/Documents/AGENT/insights', updated: '1 day ago' },
    { id: 'p4', name: 'Marketing Agent', path: '/Users/ariardianto/Documents/AGENT/marketing', updated: '3 days ago' },
    { id: 'p5', name: 'Product Research', path: '/Users/ariardianto/Documents/AGENT/research', updated: '1 week ago' },
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

  const handleNavClick = (view: PrimaryView) => {
    if (onSelectPrimaryView) {
      onSelectPrimaryView(view);
    }
    if (view === 'projects') {
      if (onSelectProjects) onSelectProjects();
    } else if (view === 'tasks') {
      if (tasks.length > 0) {
        onSelectTask(tasks[0].id);
      } else {
        onSelectTask('demo-task');
      }
    } else if (view === 'agents') {
      onOpenBrowser();
    } else if (view === 'skills') {
      onOpenSkills();
    } else if (view === 'automations') {
      onOpenMemory();
    } else if (view === 'extensions') {
      onOpenExtensions();
    } else if (view === 'settings') {
      onOpenSettings();
    } else if (view === 'home') {
      onSelectDashboard();
    }
  };

  // -------------------------------------------------------------
  // 1. HIDDEN MODE: Render restore button floating or minimized
  // -------------------------------------------------------------
  if (sidebarMode === 'hidden') {
    return (
      <div className="relative group shrink-0 select-none">
        <button
          onClick={() => onSidebarModeChange?.('compact')}
          className="fixed top-3 left-3 z-50 p-1.5 rounded-lg bg-[#14171D] hover:bg-[#1E232D] text-neutral-400 hover:text-white border border-neutral-700/80 shadow-lg transition-all"
          title="Tampilkan Sidebar (Cmd+B)"
          aria-label="Tampilkan Sidebar"
        >
          <PanelLeftOpen className="w-4 h-4 stroke-white" />
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. COMPACT MODE: Slim Activity Rail matching Image 3 (~48px)
  // -------------------------------------------------------------
  if (sidebarMode === 'compact') {
    return (
      <aside 
        data-testid="activity-rail"
        className="w-12 bg-[#0D0F12] border-r border-neutral-800/80 flex flex-col justify-between items-center py-2 select-none shrink-0 text-neutral-400 z-20"
      >
        {/* Top Activity Icons */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          {/* Top Star/Logo - Toggles expanded mode on click */}
          <button
            onClick={() => onSidebarModeChange?.('expanded')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-neutral-800/60 transition-colors mb-2"
            title="Nusa Agent (Klik untuk buka sidebar penuh)"
            aria-label="Nusa Agent Sidebar"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white stroke-[2.2]">
              <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
              <path d="M12 7L13.5 10.5L17 12L13.5 13.5L12 17L10.5 13.5L7 12L10.5 10.5L12 7Z" fill="white" />
            </svg>
          </button>

          {/* 1. Explorer / Projects icon (Active in projects mode matching Image 3) */}
          <button
            onClick={() => handleNavClick('projects')}
            className={`w-full h-10 flex items-center justify-center relative transition-colors group ${
              primaryView === 'projects'
                ? 'text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
            title="Explorer (Projects)"
            aria-label="Explorer"
          >
            {primaryView === 'projects' && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500 rounded-r" />
            )}
            <Files className="w-5 h-5 stroke-current" />
            <span className="sr-only">Explorer</span>
          </button>

          {/* 2. Search Icon */}
          <button
            onClick={() => {
              handleNavClick('projects');
              onOpenSearch?.();
            }}
            className="w-full h-10 flex items-center justify-center relative text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors group"
            title="Pencarian File & Simbol (Search)"
            aria-label="Search"
          >
            <Search className="w-5 h-5 stroke-current" />
          </button>

          {/* 3. Source Control / Git Icon */}
          <button
            onClick={() => {
              handleNavClick('projects');
              onOpenSourceControl?.();
            }}
            className="w-full h-10 flex items-center justify-center relative text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors group"
            title="Source Control (Git)"
            aria-label="Source Control"
          >
            <FolderGit2 className="w-5 h-5 stroke-current" />
          </button>

          {/* 4. Run and Debug Icon */}
          <button
            onClick={() => onOpenRunDebug?.()}
            className="w-full h-10 flex items-center justify-center relative text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors group"
            title="Run and Debug"
            aria-label="Run and Debug"
          >
            <Play className="w-5 h-5 stroke-current" />
          </button>

          {/* 5. Extensions Icon (Puzzle) */}
          <button
            onClick={() => onOpenExtensions()}
            className={`w-full h-10 flex items-center justify-center relative transition-colors group ${
              primaryView === 'extensions'
                ? 'text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
            title="Extensions Marketplace"
            aria-label="Extensions"
          >
            {primaryView === 'extensions' && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500 rounded-r" />
            )}
            <Puzzle className="w-5 h-5 stroke-current" />
          </button>

          {/* 6. Skills Hub Icon */}
          <button
            onClick={() => onOpenSkills()}
            className={`w-full h-10 flex items-center justify-center relative transition-colors group ${
              primaryView === 'skills'
                ? 'text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
            title="Skills Hub"
            aria-label="Skills Hub"
          >
            <Sparkles className="w-5 h-5 stroke-current" />
          </button>

          {/* 7. Active Tasks Icon */}
          <button
            onClick={() => handleNavClick('tasks')}
            className={`w-full h-10 flex items-center justify-center relative transition-colors group ${
              primaryView === 'tasks'
                ? 'text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
            title="Active Tasks & Timeline"
            aria-label="Active Tasks"
          >
            {primaryView === 'tasks' && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500 rounded-r" />
            )}
            <CheckSquare className="w-5 h-5 stroke-current" />
          </button>
        </div>

        {/* Bottom Activity Icons */}
        <div className="flex flex-col items-center gap-1.5 w-full pb-1">
          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="w-full h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5 stroke-current" />
          </button>

          {/* Expand Sidebar Button */}
          <button
            onClick={() => onSidebarModeChange?.('expanded')}
            className="w-full h-9 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors"
            title="Perluas Sidebar (Cmd+B)"
            aria-label="Perluas Sidebar"
          >
            <ChevronRight className="w-4 h-4 stroke-current" />
          </button>

          {/* Connection status indicator */}
          <div className="py-1 flex items-center justify-center" title={connected ? 'Connected to Gateway' : 'Disconnected'}>
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-rose-500 animate-pulse'
              }`}
            />
          </div>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // 3. EXPANDED MODE: Full Nusa Agent Sidebar (256px / w-64)
  // -------------------------------------------------------------
  return (
    <aside 
      data-testid="sidebar-expanded"
      className="w-64 bg-[#0D0F12] border-r border-neutral-800/80 flex flex-col h-full select-none shrink-0 text-neutral-300 z-20"
    >
      {/* Brand Header */}
      <div className="pt-5 pb-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-white stroke-[2.2]">
              <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
              <path d="M12 7L13.5 10.5L17 12L13.5 13.5L12 17L10.5 13.5L7 12L10.5 10.5L12 7Z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-sm text-white tracking-wider">NUSA AGENT</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-rose-500 animate-pulse'
            }`}
            title={connected ? 'Connected to Gateway' : 'Disconnected'}
          />

          {/* Minimize to compact rail button */}
          <button
            onClick={() => onSidebarModeChange?.('compact')}
            className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title="Kecilkan ke Activity Rail (Cmd+B)"
            aria-label="Kecilkan Sidebar"
          >
            <PanelLeftClose className="w-3.5 h-3.5 stroke-white" />
          </button>
        </div>
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

      {/* Main Navigation List */}
      <div className="px-3 py-2 space-y-0.5">
        {/* Projects - Opens Coding-First IDE Workspace */}
        <button
          onClick={() => handleNavClick('projects')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'projects'
              ? 'bg-[#151921] text-white font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Folder className="w-4 h-4 stroke-white" />
          <span>Projects</span>
        </button>

        {/* Active Tasks */}
        <button
          onClick={() => handleNavClick('tasks')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'tasks'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="w-4 h-4 stroke-white" />
            <span>Active Tasks</span>
          </div>
          <span className="w-5 h-5 rounded-full bg-[#1C212B] text-neutral-300 text-[11px] font-semibold flex items-center justify-center">
            {tasks.length > 0 ? tasks.length : 1}
          </span>
        </button>

        {/* Agents */}
        <button
          onClick={() => handleNavClick('agents')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'agents'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Bot className="w-4 h-4 stroke-white" />
          <span>Agents</span>
        </button>

        {/* Skills */}
        <button
          onClick={() => handleNavClick('skills')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'skills'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Sparkles className="w-4 h-4 stroke-white" />
          <span>Skills</span>
        </button>

        {/* Automations */}
        <button
          onClick={() => handleNavClick('automations')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'automations'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Zap className="w-4 h-4 stroke-white" />
          <span>Automations</span>
        </button>

        {/* Extensions */}
        <button
          onClick={() => handleNavClick('extensions')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'extensions'
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
          onClick={() => handleNavClick('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'settings'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <SettingsIcon className="w-4 h-4 stroke-white" />
          <span>Settings</span>
        </button>
      </div>

      {/* Recent Projects Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 mt-2 border-t border-neutral-800/60">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Recent Projects
          </span>
          <button
            onClick={() => setShowNewProjModal(true)}
            className="text-neutral-500 hover:text-white transition-colors p-1 rounded"
            title="Tambah Proyek"
          >
            <FolderPlus className="w-3.5 h-3.5 stroke-white" />
          </button>
        </div>

        <div className="space-y-1">
          {recentProjects.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => {
                handleNavClick('projects');
              }}
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

      {/* Bottom Footer: Team Workspace */}
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
                  placeholder="/Users/ariardianto/Documents/AGENT/CODE"
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
