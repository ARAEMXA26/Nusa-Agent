import React, { useState } from 'react';
import { Project } from '../types/protocol';
import { useI18n } from '../i18n';
import { 
  FolderGit2, 
  ListTodo, 
  Settings, 
  Globe2, 
  ShieldCheck, 
  FolderPlus,
  Sparkles,
  Network
} from 'lucide-react';

interface SidebarProps {
  connected: boolean;
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project) => void;
  tasks: any[];
  activeTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onCreateProject: (name: string, path: string) => void;
  onOpenSettings: () => void;
  onOpenSkills: () => void;
  onOpenMcp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connected,
  projects,
  activeProject,
  setActiveProject,
  tasks,
  activeTaskId,
  onSelectTask,
  onCreateProject,
  onOpenSettings,
  onOpenSkills,
  onOpenMcp,
}) => {
  const { t, language, setLanguage } = useI18n();
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projPath, setProjPath] = useState('');

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
    <aside className="w-72 bg-neutral-900/90 border-r border-neutral-800 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-neutral-100 tracking-tight">Nusa Agent</h1>
            <p className="text-[10px] text-neutral-400">Desktop Command Center</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 animate-pulse'
            }`}
            title={connected ? t('connected') : t('disconnected')}
          />
        </div>
      </div>

      {/* Projects Section */}
      <div className="p-3 border-b border-neutral-800">
        <div className="flex items-center justify-between text-xs font-medium text-neutral-400 px-1 mb-2">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <FolderGit2 className="w-3.5 h-3.5" />
            {t('projects')}
          </span>
          <button
            onClick={() => setShowNewProjModal(true)}
            className="text-neutral-400 hover:text-indigo-400 transition-colors"
            title={t('new_project')}
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        <select
          value={activeProject?.id || ''}
          onChange={(e) => {
            const p = projects.find((proj) => proj.id === e.target.value);
            if (p) setActiveProject(p);
          }}
          className="w-full bg-neutral-800/80 border border-neutral-700/80 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {projects.length === 0 && <option value="">(Belum ada proyek)</option>}
          {projects.map((proj) => (
            <option key={proj.id} value={proj.id}>
              {proj.name} ({proj.root_path})
            </option>
          ))}
        </select>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 px-1 mb-2 flex items-center gap-1.5">
          <ListTodo className="w-3.5 h-3.5" />
          {t('tasks')} ({tasks.length})
        </div>

        {tasks.map((task) => {
          const isActive = task.id === activeTaskId;
          let badgeColor = 'bg-neutral-800 text-neutral-300';
          if (task.status === 'completed') badgeColor = 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50';
          else if (task.status === 'awaiting_approval') badgeColor = 'bg-amber-950/80 text-amber-400 border border-amber-800/50 animate-pulse';
          else if (task.status === 'executing' || task.status === 'planning') badgeColor = 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/50';
          else if (task.status === 'failed') badgeColor = 'bg-rose-950/80 text-rose-400 border border-rose-800/50';

          return (
            <button
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-1.5 border ${
                isActive
                  ? 'bg-neutral-800/90 border-indigo-500/50 text-neutral-100 shadow-sm'
                  : 'border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium truncate pr-2">{task.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${badgeColor}`}>
                  {task.status}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-1">{task.goal}</p>
            </button>
          );
        })}
      </div>

      {/* Footer Controls: Skills, MCP, Language & Settings */}
      <div className="p-2.5 border-t border-neutral-800 space-y-2">
        <div className="grid grid-cols-2 gap-1.5 text-xs text-neutral-400">
          <button
            onClick={onOpenSkills}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-neutral-800/40 hover:bg-neutral-800 hover:text-indigo-300 transition-colors"
            title={t('skills_hub')}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate">{t('skills_hub')}</span>
          </button>

          <button
            onClick={onOpenMcp}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-neutral-800/40 hover:bg-neutral-800 hover:text-emerald-300 transition-colors"
            title={t('mcp_manager')}
          >
            <Network className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">{t('mcp_manager')}</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
          <button
            onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
            title="Ganti Bahasa / Toggle Language"
          >
            <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold uppercase text-[11px]">{language}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
            title={t('settings')}
          >
            <Settings className="w-3.5 h-3.5 text-neutral-400 hover:text-neutral-200" />
            <span>{t('settings')}</span>
          </button>
        </div>
      </div>

      {/* Create Project Modal */}
      {showNewProjModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h2 className="text-sm font-semibold text-neutral-100 mb-3 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              {t('new_project')}
            </h2>
            <form onSubmit={handleCreateProj} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Nama Proyek</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="Misal: Proyek Backend API"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">Direktori Host (Root Path)</label>
                <input
                  type="text"
                  required
                  value={projPath}
                  onChange={(e) => setProjPath(e.target.value)}
                  placeholder="/Users/nama/Documents/my-project"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-neutral-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjModal(false)}
                  className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
