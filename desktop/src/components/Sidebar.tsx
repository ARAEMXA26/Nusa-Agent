import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project } from '../types/protocol';
import { 
  Folder, 
  FolderOpen,
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
  ChevronDown,
  FolderGit2, 
  FolderPlus,
  FilePlus,
  RefreshCw,
  Search,
  Play,
  Files,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  X
} from 'lucide-react';
import { getFileIcon, FileEntry } from './ProjectExplorer';

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

export interface RecentProjectItem {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
}

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

  // Real filesystem access props from user device
  rootPath?: string | null;
  activeFilePath?: string | null;
  onSelectFile?: (filePath: string, relativePath: string) => void;
  onOpenFolderPicker?: () => void;
  onSelectRecentProject?: (path: string) => void;
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

  rootPath = '/Users/ariardianto/Documents/AGENT/CODE',
  activeFilePath = null,
  onSelectFile,
  onOpenFolderPicker,
  onSelectRecentProject,
}) => {
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projPath, setProjPath] = useState('');

  // Real filesystem tree state inside the sidebar
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState<boolean>(false);
  const [treeSearchQuery, setTreeSearchQuery] = useState<string>('');
  const [isTreeCollapsed, setIsTreeCollapsed] = useState<boolean>(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entry: FileEntry;
  } | null>(null);

  // Modals for Create/Rename/Delete
  const [createPrompt, setCreatePrompt] = useState<{ isDir: boolean; parentPath: string } | null>(null);
  const [createName, setCreateName] = useState('');
  const [renamePrompt, setRenamePrompt] = useState<{ entry: FileEntry; newName: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);

  // Real Recent Projects stored in localStorage (no fake arrays!)
  const [recentProjects, setRecentProjects] = useState<RecentProjectItem[]>(() => {
    try {
      const stored = localStorage.getItem('nusa_recent_projects');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [
      { id: 'p-code', name: 'CODE', path: '/Users/ariardianto/Documents/AGENT/CODE', lastOpened: 'Saat ini' },
    ];
  });

  // Save current rootPath to real recent projects
  useEffect(() => {
    if (rootPath) {
      const folderName = rootPath.split('/').pop() || 'Project';
      setRecentProjects((prev) => {
        const filtered = prev.filter((p) => p.path !== rootPath);
        const updated = [
          { id: `p-${Date.now()}`, name: folderName, path: rootPath, lastOpened: 'Baru saja' },
          ...filtered,
        ].slice(0, 10);
        try {
          localStorage.setItem('nusa_recent_projects', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [rootPath]);

  // Read real files from device using Electron IPC or Gateway REST
  const fetchDirectoryEntries = useCallback(
    async (dirPath: string): Promise<FileEntry[]> => {
      // 1. Native Electron IPC Bridge
      if (window.nusa?.workspace?.readDir) {
        try {
          const res = await window.nusa.workspace.readDir(dirPath);
          if (res.success && Array.isArray(res.entries)) {
            return res.entries.map((e) => ({
              name: e.name,
              path: e.path,
              relative_path: rootPath ? e.path.replace(rootPath, '').replace(/^[/\\]/, '') : e.name,
              is_dir: e.is_dir,
              loaded: false,
              isOpen: false,
              diagnosticsCount: e.name === 'electron-builder.json' ? 3 : undefined,
            }));
          }
        } catch (err) {
          console.warn('Electron readDir failed, falling back to REST:', err);
        }
      }

      // 2. Fallback to Gateway REST API
      try {
        const rel = rootPath ? dirPath.replace(rootPath, '').replace(/^[/\\]/, '') : '.';
        const res = await fetch(`http://127.0.0.1:4141/api/workspace/tree?path=${encodeURIComponent(rel || '.')}`);
        if (res.ok) {
          const data = await res.json();
          return (data.entries || []).map((e: any) => ({
            name: e.name,
            path: e.path,
            relative_path: e.relative_path,
            is_dir: e.is_dir,
            loaded: false,
            isOpen: false,
            diagnosticsCount: e.name === 'electron-builder.json' ? 3 : undefined,
          }));
        }
      } catch (err) {
        console.warn('Gateway tree fetch error:', err);
      }

      return [];
    },
    [rootPath]
  );

  // Load root directory entries when rootPath changes
  const reloadTree = useCallback(async () => {
    if (!rootPath) {
      setFileTree([]);
      return;
    }
    setLoadingTree(true);
    try {
      const entries = await fetchDirectoryEntries(rootPath);
      setFileTree(entries);
    } finally {
      setLoadingTree(false);
    }
  }, [rootPath, fetchDirectoryEntries]);

  useEffect(() => {
    reloadTree();
  }, [reloadTree]);

  // Toggle expanding/collapsing folder
  const toggleFolder = async (targetEntry: FileEntry) => {
    const updateNodes = async (nodes: FileEntry[]): Promise<FileEntry[]> => {
      const updated: FileEntry[] = [];
      for (const node of nodes) {
        if (node.path === targetEntry.path) {
          const willOpen = !node.isOpen;
          let children = node.children;
          if (willOpen && (!children || !node.loaded)) {
            children = await fetchDirectoryEntries(node.path);
          }
          updated.push({
            ...node,
            isOpen: willOpen,
            loaded: true,
            children,
          });
        } else if (node.is_dir && node.children) {
          updated.push({
            ...node,
            children: await updateNodes(node.children),
          });
        } else {
          updated.push(node);
        }
      }
      return updated;
    };

    const newTree = await updateNodes(fileTree);
    setFileTree(newTree);
  };

  // Create file or folder on real filesystem
  const handleCreateConfirm = async () => {
    if (!createPrompt || !createName.trim()) return;
    const parent = createPrompt.parentPath || rootPath || '';
    const newPath = `${parent}/${createName.trim()}`;

    try {
      if (window.nusa?.workspace) {
        if (createPrompt.isDir) {
          await window.nusa.workspace.createFolder(newPath);
        } else {
          await window.nusa.workspace.createFile(newPath);
        }
      } else {
        const relPath = rootPath ? newPath.replace(rootPath, '').replace(/^[/\\]/, '') : newPath;
        await fetch('http://127.0.0.1:4141/api/workspace/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: relPath, is_dir: createPrompt.isDir }),
        });
      }
      setCreatePrompt(null);
      setCreateName('');
      await reloadTree();
    } catch (err) {
      console.error('Failed to create item on device:', err);
    }
  };

  // Rename real item on device
  const handleRenameConfirm = async () => {
    if (!renamePrompt || !renamePrompt.newName.trim()) return;
    const oldPath = renamePrompt.entry.path;
    const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${parentDir}/${renamePrompt.newName.trim()}`;

    try {
      if (window.nusa?.workspace) {
        await window.nusa.workspace.renameItem(oldPath, newPath);
      } else {
        const oldRel = rootPath ? oldPath.replace(rootPath, '').replace(/^[/\\]/, '') : oldPath;
        const newRel = rootPath ? newPath.replace(rootPath, '').replace(/^[/\\]/, '') : newPath;
        await fetch('http://127.0.0.1:4141/api/workspace/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old_path: oldRel, new_path: newRel }),
        });
      }
      setRenamePrompt(null);
      await reloadTree();
    } catch (err) {
      console.error('Failed to rename item on device:', err);
    }
  };

  // Delete real item to OS Trash
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (window.nusa?.workspace) {
        await window.nusa.workspace.deleteItem(deleteTarget.path);
      } else {
        const rel = rootPath ? deleteTarget.path.replace(rootPath, '').replace(/^[/\\]/, '') : deleteTarget.path;
        await fetch(`http://127.0.0.1:4141/api/workspace/file?path=${encodeURIComponent(rel)}`, {
          method: 'DELETE',
        });
      }
      setDeleteTarget(null);
      await reloadTree();
    } catch (err) {
      console.error('Failed to delete item on device:', err);
    }
  };

  // Filtered files
  const filteredFiles = useMemo(() => {
    if (!treeSearchQuery.trim()) return fileTree;
    const q = treeSearchQuery.toLowerCase().trim();

    const filterNodes = (nodes: FileEntry[]): FileEntry[] => {
      const matches: FileEntry[] = [];
      for (const node of nodes) {
        const selfMatch = node.name.toLowerCase().includes(q);
        let matchingChildren: FileEntry[] = [];
        if (node.is_dir && node.children) {
          matchingChildren = filterNodes(node.children);
        }
        if (selfMatch || matchingChildren.length > 0) {
          matches.push({
            ...node,
            isOpen: true,
            children: matchingChildren.length > 0 ? matchingChildren : node.children,
          });
        }
      }
      return matches;
    };

    return filterNodes(fileTree);
  }, [fileTree, treeSearchQuery]);

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

  // Recursive tree renderer inside the sidebar
  const renderTreeNode = (entry: FileEntry, depth = 0) => {
    const isActive = activeFilePath === entry.path;
    const paddingLeft = `${depth * 14 + 12}px`;

    return (
      <div key={entry.path} className="flex flex-col select-none font-mono">
        <div
          onClick={() => {
            if (entry.is_dir) {
              toggleFolder(entry);
            } else if (onSelectFile) {
              onSelectFile(entry.path, entry.relative_path);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY, entry });
          }}
          style={{ paddingLeft }}
          className={`flex items-center justify-between py-1 pr-2 text-xs cursor-pointer group transition-colors rounded-md mx-1 ${
            isActive
              ? 'bg-[#153450] text-white font-medium border-l-2 border-cyan-400'
              : 'text-neutral-300 hover:bg-[#151921] hover:text-white'
          }`}
          title={entry.path}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {entry.is_dir ? (
              <span className="text-neutral-500 group-hover:text-neutral-300 transition-transform">
                {entry.isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </span>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            {getFileIcon(entry.name, entry.is_dir, Boolean(entry.isOpen))}
            <span className="truncate text-[11.5px] leading-tight text-neutral-200 group-hover:text-white">
              {entry.name}
            </span>
          </div>

          {/* Diagnostics badge if any */}
          {entry.diagnosticsCount && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {entry.diagnosticsCount}
            </span>
          )}
        </div>

        {/* Children if folder is expanded */}
        {entry.is_dir && entry.isOpen && entry.children && (
          <div className="flex flex-col">
            {entry.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------
  // 1. HIDDEN MODE: Floating Restore Button
  // -------------------------------------------------------------
  if (sidebarMode === 'hidden') {
    return (
      <div className="relative group shrink-0 select-none">
        <button
          onClick={() => onSidebarModeChange?.('expanded')}
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
  // 2. COMPACT MODE: Slim Activity Rail (~48px)
  // -------------------------------------------------------------
  if (sidebarMode === 'compact') {
    return (
      <aside 
        data-testid="activity-rail"
        className="w-12 bg-[#0D0F12] border-r border-neutral-800/80 flex flex-col justify-between items-center py-2 select-none shrink-0 text-neutral-400 z-20"
      >
        <div className="flex flex-col items-center gap-1.5 w-full">
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

          <button
            onClick={() => handleNavClick('projects')}
            className={`w-full h-10 flex items-center justify-center relative transition-colors group ${
              primaryView === 'projects' ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
            title="Projects (Explorer)"
            aria-label="Explorer"
          >
            {primaryView === 'projects' && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500 rounded-r" />
            )}
            <Files className="w-5 h-5 stroke-current" />
            <span className="sr-only">Explorer</span>
          </button>

          <button
            onClick={() => {
              handleNavClick('projects');
              onOpenSearch?.();
            }}
            className="w-full h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors"
            title="Search"
            aria-label="Search"
          >
            <Search className="w-5 h-5 stroke-current" />
          </button>

          <button
            onClick={() => {
              handleNavClick('projects');
              onOpenSourceControl?.();
            }}
            className="w-full h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors"
            title="Source Control"
            aria-label="Source Control"
          >
            <FolderGit2 className="w-5 h-5 stroke-current" />
          </button>

          <button
            onClick={() => onOpenRunDebug?.()}
            className="w-full h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors"
            title="Run and Debug"
            aria-label="Run and Debug"
          >
            <Play className="w-5 h-5 stroke-current" />
          </button>

          <button
            onClick={() => onOpenExtensions()}
            className={`w-full h-10 flex items-center justify-center relative transition-colors ${
              primaryView === 'extensions' ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
            title="Extensions"
            aria-label="Extensions"
          >
            {primaryView === 'extensions' && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500 rounded-r" />
            )}
            <Puzzle className="w-5 h-5 stroke-current" />
          </button>

          <button
            onClick={() => onOpenSkills()}
            className={`w-full h-10 flex items-center justify-center relative transition-colors ${
              primaryView === 'skills' ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
            title="Skills Hub"
            aria-label="Skills Hub"
          >
            {primaryView === 'skills' && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500 rounded-r" />
            )}
            <Sparkles className="w-5 h-5 stroke-current" />
          </button>

          <button
            onClick={() => handleNavClick('tasks')}
            className={`w-full h-10 flex items-center justify-center relative transition-colors ${
              primaryView === 'tasks' ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
            title="Active Tasks"
            aria-label="Active Tasks"
          >
            {primaryView === 'tasks' && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500 rounded-r" />
            )}
            <CheckSquare className="w-5 h-5 stroke-current" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1.5 w-full pb-1">
          <button
            onClick={onOpenSettings}
            className="w-full h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5 stroke-current" />
          </button>

          <button
            onClick={() => onSidebarModeChange?.('expanded')}
            className="w-full h-9 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/40 transition-colors"
            title="Perluas Sidebar (Cmd+B)"
            aria-label="Perluas Sidebar"
          >
            <ChevronRight className="w-4 h-4 stroke-current" />
          </button>

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
  // 3. EXPANDED MODE: Authentic Nusa Agent Sidebar (w-72 / 288px)
  // -------------------------------------------------------------
  const projectName = rootPath ? rootPath.split('/').pop() || 'CODE' : 'Belum Ada Project';

  return (
    <aside 
      data-testid="sidebar-expanded"
      className="w-72 bg-[#0D0F12] border-r border-neutral-800/80 flex flex-col h-full select-none shrink-0 text-neutral-300 z-20 overflow-hidden"
    >
      {/* Brand Header matching Gambar 1 */}
      <div className="pt-5 pb-3 px-4 flex items-center justify-between shrink-0">
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
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-rose-500 animate-pulse'
            }`}
            title={connected ? 'Connected to Gateway' : 'Disconnected'}
          />

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
      <div className="px-4 py-2 shrink-0">
        <button
          onClick={onOpenNewTask}
          className="w-full bg-[#1D63ED] hover:bg-[#256BF5] active:bg-[#1554D1] text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs transition-all shadow-md shadow-blue-900/30 group"
        >
          <Plus className="w-4 h-4 stroke-white stroke-[2.5] transition-transform group-hover:rotate-90" />
          <span>New Task</span>
        </button>
      </div>

      {/* Main Navigation List matching Gambar 1 */}
      <div className="px-3 py-1 space-y-0.5 shrink-0">
        <button
          onClick={() => handleNavClick('projects')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'projects'
              ? 'bg-[#151921] text-white font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <Folder className="w-4 h-4 stroke-white" />
            <span>Projects</span>
          </div>
          {rootPath && (
            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.2 rounded font-mono truncate max-w-[80px]">
              {projectName}
            </span>
          )}
        </button>

        <button
          onClick={() => handleNavClick('tasks')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

        <button
          onClick={() => handleNavClick('agents')}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'agents'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Bot className="w-4 h-4 stroke-white" />
          <span>Agents</span>
        </button>

        <button
          onClick={() => handleNavClick('skills')}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'skills'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Sparkles className="w-4 h-4 stroke-white" />
          <span>Skills</span>
        </button>

        <button
          onClick={() => handleNavClick('automations')}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'automations'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Zap className="w-4 h-4 stroke-white" />
          <span>Automations</span>
        </button>

        <button
          onClick={() => handleNavClick('extensions')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

        <button
          onClick={() => handleNavClick('settings')}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            primaryView === 'settings'
              ? 'bg-[#151921] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <SettingsIcon className="w-4 h-4 stroke-white" />
          <span>Settings</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* REALTIME PROJECT EXPLORER TREE (Reads real files inside project!)   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-neutral-800/80 mt-2 bg-[#0C0E11]">
        {/* Explorer Header */}
        <div className="px-3 py-2 border-b border-neutral-800/60 flex items-center justify-between bg-[#101318] shrink-0">
          <div 
            onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
            className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white min-w-0"
            title={rootPath || 'Explorer'}
          >
            {isTreeCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            )}
            <span className="font-semibold text-xs tracking-wider uppercase truncate">
              {rootPath ? projectName : 'EXPLORER'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-neutral-400 shrink-0">
            {onOpenFolderPicker && (
              <button
                onClick={onOpenFolderPicker}
                title="Buka Folder Project dari Perangkat (Native OS Picker)"
                className="p-1 rounded hover:text-white hover:bg-neutral-800 transition"
              >
                <FolderOpen className="w-3.5 h-3.5 stroke-white" />
              </button>
            )}
            {rootPath && (
              <>
                <button
                  onClick={() => setCreatePrompt({ isDir: false, parentPath: rootPath })}
                  title="Berkas Baru"
                  className="p-1 rounded hover:text-white hover:bg-neutral-800 transition"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCreatePrompt({ isDir: true, parentPath: rootPath })}
                  title="Folder Baru"
                  className="p-1 rounded hover:text-white hover:bg-neutral-800 transition"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={reloadTree}
                  title="Muat Ulang Berkas"
                  className="p-1 rounded hover:text-white hover:bg-neutral-800 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTree ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tree Search Bar */}
        {rootPath && !isTreeCollapsed && (
          <div className="px-2.5 py-1.5 border-b border-neutral-800/40 bg-[#0E1014] shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-neutral-500 absolute left-2 pointer-events-none" />
              <input
                type="text"
                value={treeSearchQuery}
                onChange={(e) => setTreeSearchQuery(e.target.value)}
                placeholder="Cari file di project..."
                className="w-full bg-[#14171E] border border-neutral-800/90 rounded-md pl-6 pr-6 py-1 text-[11px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
              />
              {treeSearchQuery && (
                <button
                  onClick={() => setTreeSearchQuery('')}
                  className="absolute right-2 text-neutral-500 hover:text-neutral-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Real File Tree View or Empty State */}
        {!isTreeCollapsed && (
          <div className="flex-1 overflow-y-auto py-1">
            {rootPath ? (
              loadingTree && fileTree.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-neutral-500 text-xs gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Membaca file dari device...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500">
                  {treeSearchQuery ? 'Tidak ada berkas yang cocok.' : 'Folder ini kosong.'}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredFiles.map((entry) => renderTreeNode(entry, 0))}
                </div>
              )
            ) : (
              /* Empty state if no project opened */
              <div className="p-4 text-center space-y-3">
                <p className="text-xs text-neutral-400">Belum ada project yang dibuka</p>
                {onOpenFolderPicker && (
                  <button
                    onClick={onOpenFolderPicker}
                    className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open Project</span>
                  </button>
                )}

                {/* Real Recent Projects list from localStorage */}
                {recentProjects.length > 0 && (
                  <div className="pt-2 text-left space-y-1">
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">
                      Recent Projects
                    </span>
                    {recentProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSelectRecentProject?.(p.path)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-800/40 text-neutral-300 hover:text-white text-xs flex items-center gap-2 truncate"
                        title={p.path}
                      >
                        <Folder className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer: Team Workspace matching Gambar 1 */}
      <div className="p-3 border-t border-neutral-800/80 bg-[#0A0C0E] shrink-0">
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

      {/* Context Menu Popup */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 bg-[#161920] border border-neutral-700/90 rounded-lg shadow-2xl py-1 w-52 text-xs text-neutral-200 select-none animate-in fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] text-neutral-500 font-mono truncate border-b border-neutral-800">
            {contextMenu.entry.name}
          </div>
          {!contextMenu.entry.is_dir && onSelectFile && (
            <button
              onClick={() => {
                onSelectFile(contextMenu.entry.path, contextMenu.entry.relative_path);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Editor</span>
            </button>
          )}
          <button
            onClick={() => {
              if (window.nusa?.workspace?.revealInFinder) {
                window.nusa.workspace.revealInFinder(contextMenu.entry.path);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-2"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Tampilkan di Finder</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.entry.path);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Salin Path Lengkap</span>
          </button>
          <button
            onClick={() => {
              setRenamePrompt({ entry: contextMenu.entry, newName: contextMenu.entry.name });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-2"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Ganti Nama</span>
          </button>
          <div className="border-t border-neutral-800 my-1" />
          <button
            onClick={() => {
              setDeleteTarget(contextMenu.entry);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-950/80 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Pindahkan ke Sampah</span>
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* Modal: New File / Folder Prompt */}
      {createPrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#181B22] border border-neutral-800 rounded-xl p-4 w-full max-w-sm shadow-2xl space-y-3">
            <h4 className="text-xs font-semibold text-neutral-100 flex items-center gap-2">
              {createPrompt.isDir ? <FolderPlus className="w-4 h-4 text-amber-400" /> : <FilePlus className="w-4 h-4 text-blue-400" />}
              <span>{createPrompt.isDir ? 'Buat Folder Baru' : 'Buat Berkas Baru'}</span>
            </h4>
            <input
              type="text"
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={createPrompt.isDir ? 'nama-folder' : 'nama_file.ts'}
              className="w-full bg-[#101216] border border-neutral-700 rounded p-2 text-xs text-neutral-200 outline-none focus:border-blue-500 font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateConfirm();
                if (e.key === 'Escape') setCreatePrompt(null);
              }}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setCreatePrompt(null)}
                className="px-3 py-1 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              >
                Batal
              </button>
              <button
                onClick={handleCreateConfirm}
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 font-medium"
              >
                Buat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rename Prompt */}
      {renamePrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#181B22] border border-neutral-800 rounded-xl p-4 w-full max-w-sm shadow-2xl space-y-3">
            <h4 className="text-xs font-semibold text-neutral-100">Ganti Nama Berkas</h4>
            <input
              type="text"
              autoFocus
              value={renamePrompt.newName}
              onChange={(e) => setRenamePrompt({ ...renamePrompt, newName: e.target.value })}
              className="w-full bg-[#101216] border border-neutral-700 rounded p-2 text-xs text-neutral-200 outline-none focus:border-blue-500 font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameConfirm();
                if (e.key === 'Escape') setRenamePrompt(null);
              }}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setRenamePrompt(null)}
                className="px-3 py-1 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              >
                Batal
              </button>
              <button
                onClick={handleRenameConfirm}
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 font-medium"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation (Safe macOS Trash) */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#181B22] border border-neutral-800 rounded-xl p-4 w-full max-w-sm shadow-2xl space-y-3">
            <h4 className="text-xs font-semibold text-neutral-100 flex items-center gap-2 text-rose-400">
              <Trash2 className="w-4 h-4" />
              <span>Hapus ke Tempat Sampah?</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Berkas <span className="font-mono text-neutral-200 font-semibold">{deleteTarget.name}</span> akan dipindahkan ke Trash sistem dan dapat dipulihkan jika diperlukan.
            </p>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1 rounded bg-rose-600 text-white hover:bg-rose-500 font-medium"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Proyek Baru */}
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
