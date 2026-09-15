import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useGateway } from './hooks/useGateway';
import { TopBar } from './components/TopBar';
import { Sidebar, SidebarMode, PrimaryView } from './components/Sidebar';
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
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProjectExplorer } from './components/ProjectExplorer';
import { CodeWorkspaceEditor, OpenTab } from './components/CodeWorkspaceEditor';

export type WorkspaceState =
  | { status: 'empty' }
  | { status: 'opening'; requestedPath?: string }
  | { status: 'open'; workspaceId: string; rootPaths: string[] }
  | { status: 'error'; message: string };

export interface AppProps {
  initialView?: PrimaryView;
}

export const App: React.FC<AppProps> = ({ initialView = 'projects' }) => {
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

  // Primary navigation view: 'projects' | 'tasks' | 'home' | 'agents' | 'skills' | 'automations' | 'extensions' | 'settings'
  // Default to 'projects' for the coding-first IDE experience requested
  const [primaryView, setPrimaryView] = useState<PrimaryView>(initialView);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(initialView === 'projects' ? 'compact' : 'expanded');

  const [showSettings, setShowSettings] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const [showExtensions, setShowExtensions] = useState(false);
  const [updateAvailableInfo, setUpdateAvailableInfo] = useState<any>(null);

  // Workspace Root Path (single source of truth)
  const defaultRoot = '/Users/ariardianto/Documents/AGENT/CODE';
  const [workspaceRoot, setWorkspaceRoot] = useState<string>(activeProject?.root_path || defaultRoot);
  const [_workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    status: 'open',
    workspaceId: 'CODE',
    rootPaths: [defaultRoot],
  });

  // Editor Tabs
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);

  // Tri-state panel state for tasks/chat view: 'docked' | 'expanded' | 'closed'
  const [artifactsPanelState, setArtifactsPanelState] = useState<ArtifactsPanelState>('docked');
  const [lastDockedWidth, setLastDockedWidth] = useState<number>(480);
  const reopenButtonRef = useRef<HTMLButtonElement>(null);

  // Synchronize workspaceRoot when activeProject changes
  useEffect(() => {
    if (activeProject?.root_path) {
      setWorkspaceRoot(activeProject.root_path);
      setWorkspaceState({
        status: 'open',
        workspaceId: activeProject.name || 'CODE',
        rootPaths: [activeProject.root_path],
      });
    }
  }, [activeProject?.root_path, activeProject?.name]);

  // Global shortcut: Cmd+B / Ctrl+B to cycle sidebar mode (expanded -> compact -> hidden -> expanded)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarMode((prev) => {
          if (prev === 'expanded') return 'compact';
          if (prev === 'compact') return 'hidden';
          return 'expanded';
        });
      }
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setArtifactsPanelState((prev) => (prev === 'closed' ? 'docked' : 'closed'));
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Auto-updater listener
  useEffect(() => {
    if ((window as any).nusa?.onUpdateAvailable) {
      (window as any).nusa.onUpdateAvailable((info: any) => {
        if (info?.updateAvailable) {
          setUpdateAvailableInfo(info);
        }
      });
    }
  }, []);

  // Seed initial tabs matching Gambar 2 (electron-builder.json, ErrorBoundary.tsx, SKILLS_HUB.md, SkillHub.test.tsx)
  useEffect(() => {
    const seedTabs = async () => {
      const initialPaths = [
        {
          rel: 'desktop/electron-builder.json',
          name: 'electron-builder.json',
          lang: 'json',
          diag: 3,
        },
        {
          rel: 'desktop/src/components/ErrorBoundary.tsx',
          name: 'ErrorBoundary.tsx',
          lang: 'typescript',
        },
        {
          rel: 'SKILLS_HUB.md',
          name: 'SKILLS_HUB.md',
          lang: 'markdown',
        },
        {
          rel: 'desktop/src/__tests__/SkillsHub.test.tsx',
          name: 'SkillHub.test.tsx',
          lang: 'typescript',
        },
      ];

      const tabsData: OpenTab[] = [];
      for (const item of initialPaths) {
        const fullPath = `${workspaceRoot}/${item.rel}`;
        let content = '';
        try {
          if ((window as any).nusa?.workspace?.readFile) {
            const res = await (window as any).nusa.workspace.readFile(fullPath);
            content = res.content;
          } else {
            const resp = await fetch(
              `http://127.0.0.1:4141/api/workspace/file?path=${encodeURIComponent(fullPath)}`
            );
            if (resp.ok) {
              const data = await resp.json();
              content = data.content;
            }
          }
        } catch {
          // Keep empty if not read yet
        }

        // Default content for electron-builder.json if read failed
        if (!content && item.rel.includes('electron-builder.json')) {
          content = `{\n  "appId": "com.nusa.agent",\n  "productName": "Nusa Agent",\n  "target": [\n    {\n      "target": "dir"\n    }\n  ],\n  "category": "Development",\n  "artifactName": "Nusa-Agent-\${version}-linux-\${arch}.\${ext}",\n  "appImage": {\n    "artifactName": "Nusa-Agent-\${version}-linux-\${arch}.AppImage"\n  },\n  "deb": {\n    "artifactName": "Nusa-Agent-\${version}-linux-\${arch}.deb"\n  },\n  "publish": {\n    "provider": "github",\n    "owner": "ARAEMXA26",\n    "repo": "Nusa-Agent"\n  }\n}`;
        }

        tabsData.push({
          path: fullPath,
          name: item.name,
          relativePath: item.rel,
          content: content || `// ${item.name}`,
          originalContent: content || `// ${item.name}`,
          isDirty: false,
          language: item.lang,
          diagnosticsCount: item.diag,
        });
      }

      setOpenTabs(tabsData);
      setActiveTabIndex(0);
    };

    if (openTabs.length === 0) {
      seedTabs();
    }
  }, [workspaceRoot]);

  // Handle selecting a file from Project Explorer
  const handleSelectFile = useCallback(
    async (filePath: string, relativePath: string) => {
      const existingIndex = openTabs.findIndex((t) => t.path === filePath);
      if (existingIndex >= 0) {
        setActiveTabIndex(existingIndex);
        return;
      }

      let content = '';
      try {
        if ((window as any).nusa?.workspace?.readFile) {
          const res = await (window as any).nusa.workspace.readFile(filePath);
          content = res.content;
        } else {
          const resp = await fetch(
            `http://127.0.0.1:4141/api/workspace/file?path=${encodeURIComponent(filePath)}`
          );
          if (resp.ok) {
            const data = await resp.json();
            content = data.content;
          }
        }
      } catch (err) {
        console.error('Failed to read file:', err);
      }

      const fileName = filePath.split('/').pop() || 'Untitled';
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const language =
        ext === 'json'
          ? 'json'
          : ext === 'ts' || ext === 'tsx'
          ? 'typescript'
          : ext === 'js' || ext === 'jsx'
          ? 'javascript'
          : ext === 'md'
          ? 'markdown'
          : ext === 'css'
          ? 'css'
          : ext === 'html'
          ? 'html'
          : ext === 'py'
          ? 'python'
          : ext === 'sh'
          ? 'shell'
          : 'text';

      const newTab: OpenTab = {
        path: filePath,
        name: fileName,
        relativePath: relativePath,
        content: content,
        originalContent: content,
        isDirty: false,
        language: language,
      };

      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabIndex(openTabs.length);
    },
    [openTabs]
  );

  // Handle updating editor tab content
  const handleUpdateContent = useCallback((index: number, newContent: string) => {
    setOpenTabs((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          content: newContent,
          isDirty: newContent !== updated[index].originalContent,
        };
      }
      return updated;
    });
  }, []);

  // Handle saving file to disk
  const handleSaveFile = useCallback(
    async (index: number) => {
      const tab = openTabs[index];
      if (!tab) return;
      try {
        if ((window as any).nusa?.workspace?.writeFile) {
          await (window as any).nusa.workspace.writeFile(tab.path, tab.content);
        } else {
          await fetch('http://127.0.0.1:4141/api/workspace/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: tab.path, content: tab.content }),
          });
        }
        setOpenTabs((prev) => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              originalContent: tab.content,
              isDirty: false,
            };
          }
          return updated;
        });
      } catch (err) {
        console.error('Error saving file:', err);
      }
    },
    [openTabs]
  );

  // Handle closing a tab
  const handleCloseTab = useCallback(
    (index: number) => {
      setOpenTabs((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        if (activeTabIndex >= updated.length) {
          setActiveTabIndex(Math.max(0, updated.length - 1));
        }
        return updated;
      });
    },
    [activeTabIndex]
  );

  // Handle native folder picker
  const handleOpenFolderPicker = useCallback(async () => {
    try {
      if ((window as any).nusa?.workspace?.openFolder) {
        const picked = await (window as any).nusa.workspace.openFolder();
        if (picked && !picked.canceled && picked.path) {
          setWorkspaceRoot(picked.path);
          setWorkspaceState({
            status: 'open',
            workspaceId: picked.path.split('/').pop() || 'workspace',
            rootPaths: [picked.path],
          });
          // Notify gateway
          fetch('http://127.0.0.1:4141/api/workspace/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ root_path: picked.path }),
          }).catch(() => {});
        }
      } else {
        const entered = prompt('Masukkan direktori project:', workspaceRoot);
        if (entered) {
          setWorkspaceRoot(entered);
          fetch('http://127.0.0.1:4141/api/workspace/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ root_path: entered }),
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error opening folder picker:', err);
    }
  }, [workspaceRoot]);

  const handleSelectTask = (taskId: string) => {
    fetchTaskDetail(taskId);
    setPrimaryView('tasks');
  };

  const handleSelectDashboard = () => {
    setPrimaryView('home');
  };

  const handleCreateTask = async (goal: string) => {
    let projId = activeProject?.id;
    if (!projId) {
      if (projects.length > 0) {
        projId = projects[0].id;
        setActiveProject(projects[0]);
      } else {
        const created = await createProject('Workspace', workspaceRoot);
        projId = created.id;
      }
    }
    if (projId) {
      await createTask(projId, goal);
      setPrimaryView('tasks');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0C0E] font-sans text-neutral-100 antialiased select-none">
      {/* Top Header Bar */}
      <TopBar
        workspaceName={
          primaryView === 'projects'
            ? `Workspace / ${workspaceRoot.split('/').pop() || 'CODE'}`
            : 'Workspace / Growth'
        }
        modelName="Nusa-1 (Latest)"
        isSandboxed={true}
        tokenCount="12.4K tokens"
        cost="$0.03"
        isArtifactsClosed={primaryView === 'projects' ? true : artifactsPanelState === 'closed'}
        onOpenArtifacts={() => setArtifactsPanelState('docked')}
      />

      {/* Main Container */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left Sidebar (Supports Expanded 256px, Compact Activity Rail 48px, or Hidden 0px) */}
        <Sidebar
          connected={connected}
          sidebarMode={sidebarMode}
          onSidebarModeChange={setSidebarMode}
          primaryView={primaryView}
          onSelectPrimaryView={setPrimaryView}
          projects={projects}
          activeProject={activeProject}
          setActiveProject={setActiveProject}
          tasks={tasks}
          activeTaskId={primaryView === 'tasks' ? activeTask?.id || 'demo-task' : null}
          onSelectTask={handleSelectTask}
          onSelectDashboard={handleSelectDashboard}
          onSelectProjects={() => setPrimaryView('projects')}
          onCreateProject={(name, path) => createProject(name, path)}
          onOpenNewTask={() => setPrimaryView('tasks')}
          onOpenSettings={() => setShowSettings(true)}
          onOpenSkills={() => setShowSkills(true)}
          onOpenMcp={() => setShowMcp(true)}
          onOpenBrowser={() => setShowBrowser(true)}
          onOpenMemory={() => setShowMemory(true)}
          onOpenPlugins={() => setShowPlugins(true)}
          onOpenExtensions={() => setShowExtensions(true)}
          onOpenSearch={() => setPrimaryView('projects')}
          onOpenSourceControl={() => setPrimaryView('projects')}
        />

        {/* ------------------------------------------------------------- */}
        {/* CODING-FIRST PROJECTS VIEW: Project Explorer + Source Editor  */}
        {/* (Artifacts and Command Center completely omitted from DOM)    */}
        {/* ------------------------------------------------------------- */}
        {primaryView === 'projects' ? (
          <div className="flex flex-1 min-w-0 h-full overflow-hidden">
            {/* Column 2: Project Explorer (Resizable, lazy loading, real tree) */}
            <ProjectExplorer
              rootPath={workspaceRoot}
              projectName={workspaceRoot.split('/').pop() || 'CODE'}
              activeFilePath={openTabs[activeTabIndex]?.path || null}
              onSelectFile={handleSelectFile}
              onOpenFolderPicker={handleOpenFolderPicker}
              onSelectRecentProject={(path) => setWorkspaceRoot(path)}
              onCloseFolder={() => setWorkspaceRoot('')}
            />

            {/* Column 3: Source Code Editor (Takes all remaining width to right window edge) */}
            <CodeWorkspaceEditor
              tabs={openTabs}
              activeTabIndex={activeTabIndex}
              onSelectTab={setActiveTabIndex}
              onCloseTab={handleCloseTab}
              onUpdateContent={handleUpdateContent}
              onSaveFile={handleSaveFile}
              rootPath={workspaceRoot}
              onOpenFolderPicker={handleOpenFolderPicker}
              className="flex-1 min-w-0"
            />
          </div>
        ) : primaryView === 'home' ? (
          /* Command Center Dashboard View */
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
          /* Tasks & Agent Conversation View with right Artifacts panel */
          <>
            <main className="flex-1 flex flex-col h-full min-w-0 bg-[#0E1013]">
              <ApprovalsInbox
                approvals={approvals}
                onRespond={(apprId, decision) => respondApproval(apprId, decision)}
              />

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

            {/* Right Section: Artifacts & Live Website Preview */}
            <ArtifactPanel
              artifacts={artifacts}
              panelState={artifactsPanelState}
              onPanelStateChange={setArtifactsPanelState}
              lastDockedWidth={lastDockedWidth}
              onDockedWidthChange={setLastDockedWidth}
              reopenButtonRef={reopenButtonRef}
            />
          </>
        )}
      </div>

      {/* Extensions Marketplace Modal */}
      <ExtensionsMarketplace
        isOpen={showExtensions}
        onClose={() => setShowExtensions(false)}
      />

      {/* Other Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showSkills && (
        <ErrorBoundary fallbackTitle="Gagal Membuka Skills Hub" onClose={() => setShowSkills(false)}>
          <SkillsManagerModal onClose={() => setShowSkills(false)} />
        </ErrorBoundary>
      )}
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
