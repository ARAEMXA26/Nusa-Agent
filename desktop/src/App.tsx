import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useGateway } from './hooks/useGateway';
import { Sidebar } from './components/Sidebar';
import { AgentManager } from './components/AgentManager';
import { ApprovalsInbox } from './components/ApprovalsInbox';
import { TaskTimeline } from './components/TaskTimeline';
import { ArtifactPanel } from './components/ArtifactPanel';
import { SettingsModal } from './components/SettingsModal';
import { SkillsManagerModal } from './components/SkillsManagerModal';
import { McpManagerModal } from './components/McpManagerModal';
import { BrowserSandboxModal } from './components/BrowserSandboxModal';
import { MemoryAndSchedulerModal } from './components/MemoryAndSchedulerModal';
import { PluginMarketplaceModal } from './components/PluginMarketplaceModal';

import { CommandCenterDashboard } from './components/CommandCenterDashboard';

export const App: React.FC = () => {
  const {
    connected,
    projects,
    activeProject,
    setActiveProject,
    tasks,
    activeTask,
    approvals,
    artifacts,
    createProject,
    fetchTaskDetail,
    createTask,
    steerTask,
    cancelTask,
    respondApproval,
  } = useGateway();

  const [viewMode, setViewMode] = useState<'dashboard' | 'task'>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const [updateAvailableInfo, setUpdateAvailableInfo] = useState<any>(null);

  useEffect(() => {
    if ((window as any).nusa?.onUpdateAvailable) {
      (window as any).nusa.onUpdateAvailable((info: any) => {
        if (info?.updateAvailable) {
          setUpdateAvailableInfo(info);
        }
      });
    }
  }, []);

  const handleSelectTask = (taskId: string) => {
    fetchTaskDetail(taskId);
    setViewMode('task');
  };

  const handleSelectDashboard = () => {
    setViewMode('dashboard');
  };

  const handleCreateTask = async (goal: string) => {
    let projId = activeProject?.id;
    if (!projId) {
      if (projects.length > 0) {
        projId = projects[0].id;
        setActiveProject(projects[0]);
      } else {
        const created = await createProject('Workspace', '/Users/ariardianto/Documents/AGENT');
        projId = created.id;
      }
    }
    if (projId) {
      await createTask(projId, goal);
      setViewMode('task');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 font-sans text-neutral-100 antialiased">
      {/* Sidebar */}
      <Sidebar
        connected={connected}
        projects={projects}
        activeProject={activeProject}
        setActiveProject={setActiveProject}
        tasks={tasks}
        activeTaskId={viewMode === 'task' ? activeTask?.id || null : null}
        onSelectTask={handleSelectTask}
        onSelectDashboard={handleSelectDashboard}
        onCreateProject={(name, path) => createProject(name, path)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSkills={() => setShowSkills(true)}
        onOpenMcp={() => setShowMcp(true)}
        onOpenBrowser={() => setShowBrowser(true)}
        onOpenMemory={() => setShowMemory(true)}
        onOpenPlugins={() => setShowPlugins(true)}
      />

      {/* Main Workspace Area */}
      {viewMode === 'dashboard' || !activeTask ? (
        <CommandCenterDashboard
          connected={connected}
          projects={projects}
          activeProject={activeProject}
          setActiveProject={setActiveProject}
          tasks={tasks}
          onSelectTask={handleSelectTask}
          onCreateTask={handleCreateTask}
          onOpenSettings={() => setShowSettings(true)}
          onOpenSkills={() => setShowSkills(true)}
          onOpenMcp={() => setShowMcp(true)}
          onOpenBrowser={() => setShowBrowser(true)}
          onOpenMemory={() => setShowMemory(true)}
          onOpenPlugins={() => setShowPlugins(true)}
          onOpenNewProjectModal={() => setShowSettings(true)}
        />
      ) : (
        <>
          <main className="flex-1 flex flex-col h-screen min-w-0">
            {/* Agent Status Bar */}
            <AgentManager
              activeTask={activeTask}
              onCancelTask={activeTask ? () => cancelTask(activeTask.id) : undefined}
            />

            {/* Approvals Inbox (Visible if any pending approvals) */}
            <ApprovalsInbox
              approvals={approvals}
              onRespond={(apprId, decision) => respondApproval(apprId, decision)}
            />

            {/* Task Timeline & Steering */}
            <TaskTimeline
              activeTask={activeTask}
              onSteer={(msg) => activeTask && steerTask(activeTask.id, msg)}
              onCancel={() => activeTask && cancelTask(activeTask.id)}
              onCreateTask={(goal) => activeProject && createTask(activeProject.id, goal)}
              onBackToDashboard={handleSelectDashboard}
            />
          </main>

          {/* Right-side Artifact & Verification Panel */}
          <ArtifactPanel artifacts={artifacts} />
        </>
      )}

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showSkills && <SkillsManagerModal onClose={() => setShowSkills(false)} />}
      {showMcp && <McpManagerModal onClose={() => setShowMcp(false)} />}
      <BrowserSandboxModal isOpen={showBrowser} onClose={() => setShowBrowser(false)} />
      <MemoryAndSchedulerModal
        isOpen={showMemory}
        onClose={() => setShowMemory(false)}
        activeProjectId={activeProject?.id}
      />
      <PluginMarketplaceModal
        isOpen={showPlugins}
        onClose={() => setShowPlugins(false)}
      />

      {/* Floating Auto-Update Notification Banner */}
      {updateAvailableInfo && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-neutral-900/95 border border-emerald-500/50 shadow-2xl backdrop-blur-md flex items-center gap-3.5 max-w-md animate-in fade-in slide-in-from-bottom-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center shrink-0 text-emerald-400 shadow-inner">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 space-y-0.5">
            <h5 className="font-semibold text-xs text-neutral-100 flex items-center gap-1.5">
              <span>Pembaruan v{updateAvailableInfo.latestVersion} Tersedia!</span>
            </h5>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Pembaruan siap dipasang langsung secara otomatis tanpa perlu unduh ulang.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setShowSettings(true);
                setUpdateAvailableInfo(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-md shadow-emerald-600/20"
            >
              Perbarui
            </button>
            <button
              onClick={() => setUpdateAvailableInfo(null)}
              className="px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 text-xs transition-colors"
            >
              Nanti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
