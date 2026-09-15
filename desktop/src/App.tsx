import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useGateway } from './hooks/useGateway';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { ApprovalsInbox } from './components/ApprovalsInbox';
import { TaskTimeline } from './components/TaskTimeline';
import { ArtifactPanel, ArtifactsPanelState } from './components/ArtifactPanel';
import { SettingsModal } from './components/SettingsModal';
import { SkillsManagerModal } from './components/SkillsManagerModal';
import { McpManagerModal } from './components/McpManagerModal';
import { BrowserSandboxModal } from './components/BrowserSandboxModal';
import { MemoryAndSchedulerModal } from './components/MemoryAndSchedulerModal';
import { PluginMarketplaceModal } from './components/PluginMarketplaceModal';
import { ExtensionsMarketplace } from './components/ExtensionsMarketplace';
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

  // Start directly in task mode matching Gambar 1 layout
  const [viewMode, setViewMode] = useState<'task' | 'dashboard'>('task');
  const [showSettings, setShowSettings] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const [showExtensions, setShowExtensions] = useState(false);
  const [updateAvailableInfo, setUpdateAvailableInfo] = useState<any>(null);

  // Tri-state panel state: 'docked' | 'expanded' | 'closed'
  const [artifactsPanelState, setArtifactsPanelState] = useState<ArtifactsPanelState>('docked');
  const [lastDockedWidth, setLastDockedWidth] = useState<number>(480);
  const reopenButtonRef = useRef<HTMLButtonElement>(null);

  // Global shortcut to toggle Artifacts panel (Cmd+Option+A / Ctrl+Option+A)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setArtifactsPanelState((prev) => (prev === 'closed' ? 'docked' : 'closed'));
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0C0E] font-sans text-neutral-100 antialiased select-none">
      {/* Top Header Bar matching Gambar 1 */}
      <TopBar
        workspaceName="Workspace / Growth"
        modelName="Nusa-1 (Latest)"
        isSandboxed={true}
        tokenCount="12.4K tokens"
        cost="$0.03"
        isArtifactsClosed={artifactsPanelState === 'closed'}
        onOpenArtifacts={() => setArtifactsPanelState('docked')}
      />

      {/* Main 3-Column Layout: Left Sidebar, Center Mission & Editor, Right Website Preview & Artifacts */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          connected={connected}
          projects={projects}
          activeProject={activeProject}
          setActiveProject={setActiveProject}
          tasks={tasks}
          activeTaskId={viewMode === 'task' ? activeTask?.id || 'demo-task' : null}
          onSelectTask={handleSelectTask}
          onSelectDashboard={handleSelectDashboard}
          onCreateProject={(name, path) => createProject(name, path)}
          onOpenNewTask={() => {
            setViewMode('task');
          }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenSkills={() => setShowSkills(true)}
          onOpenMcp={() => setShowMcp(true)}
          onOpenBrowser={() => setShowBrowser(true)}
          onOpenMemory={() => setShowMemory(true)}
          onOpenPlugins={() => setShowPlugins(true)}
          onOpenExtensions={() => setShowExtensions(true)}
        />

        {/* Center Section: Dashboard or Task Timeline (with Conversation & Antigravity Code Editor) */}
        {viewMode === 'dashboard' ? (
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
          <main className="flex-1 flex flex-col h-full min-w-0 bg-[#0E1013]">
            {/* Approvals Inbox if any */}
            <ApprovalsInbox
              approvals={approvals}
              onRespond={(apprId, decision) => respondApproval(apprId, decision)}
            />

            {/* Task Timeline matching Gambar 1 & Antigravity editor tab matching Gambar 3 */}
            <TaskTimeline
              activeTask={activeTask}
              onSteer={(msg) => activeTask && steerTask(activeTask.id, msg)}
              onCancel={() => activeTask && cancelTask(activeTask.id)}
              onCreateTask={(goal) => activeProject && createTask(activeProject.id, goal)}
              onBackToDashboard={handleSelectDashboard}
              isArtifactsClosed={artifactsPanelState === 'closed'}
              onOpenArtifacts={() => setArtifactsPanelState('docked')}
              reopenButtonRef={reopenButtonRef}
            />
          </main>
        )}

        {/* Right Section: Artifacts & Live Website Preview matching Gambar 1 */}
        <ArtifactPanel
          artifacts={artifacts}
          panelState={artifactsPanelState}
          onPanelStateChange={setArtifactsPanelState}
          lastDockedWidth={lastDockedWidth}
          onDockedWidthChange={setLastDockedWidth}
          reopenButtonRef={reopenButtonRef}
        />
      </div>

      {/* Extensions Marketplace Modal matching Gambar 2 */}
      <ExtensionsMarketplace
        isOpen={showExtensions}
        onClose={() => setShowExtensions(false)}
      />

      {/* Other Modals */}
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
            <Sparkles className="w-5 h-5 animate-pulse stroke-white" />
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
