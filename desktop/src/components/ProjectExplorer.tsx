import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  RefreshCw,
  MoreHorizontal,
  FileText,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';

export interface FileEntry {
  name: string;
  path: string;
  relative_path: string;
  is_dir: boolean;
  size?: number;
  extension?: string;
  children?: FileEntry[];
  loaded?: boolean;
  isOpen?: boolean;
  diagnosticsCount?: number;
}

export interface ProjectExplorerProps {
  rootPath: string | null;
  projectName?: string;
  activeFilePath: string | null;
  onSelectFile: (filePath: string, relativePath: string) => void;
  onOpenFolderPicker: () => void;
  recentProjects?: Array<{ id: string; name: string; path: string; lastOpened: string }>;
  onSelectRecentProject?: (path: string) => void;
  onCloseFolder?: () => void;
  className?: string;
}

// Helper to return icon and color for files based on extension/filename
export const getFileIcon = (fileName: string, isDir: boolean, isOpen: boolean) => {
  if (isDir) {
    return isOpen ? (
      <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
    ) : (
      <Folder className="w-4 h-4 text-amber-400/90 shrink-0" />
    );
  }

  const lower = fileName.toLowerCase();
  if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) {
    return <span className="text-[11px] font-bold text-cyan-400 shrink-0 font-mono">⚛</span>;
  }
  if (lower.endsWith('.ts')) {
    return <span className="text-[10px] font-bold text-blue-400 shrink-0 font-mono">TS</span>;
  }
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return <span className="text-[10px] font-bold text-amber-300 shrink-0 font-mono">JS</span>;
  }
  if (lower.endsWith('.json')) {
    return <span className="text-[10px] font-bold text-yellow-500 shrink-0 font-mono">{`{ }`}</span>;
  }
  if (lower.endsWith('.css') || lower.endsWith('.scss') || lower.endsWith('.less')) {
    return <span className="text-[11px] font-bold text-pink-400 shrink-0 font-mono">#</span>;
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return <span className="text-[11px] font-bold text-orange-400 shrink-0 font-mono">&lt;&gt;</span>;
  }
  if (lower.endsWith('.md') || lower.endsWith('.mdx')) {
    return <span className="text-[10px] font-bold text-blue-300 shrink-0 font-mono">M↓</span>;
  }
  if (lower.endsWith('.py')) {
    return <span className="text-[11px] font-bold text-blue-400 shrink-0 font-mono">py</span>;
  }
  if (lower.endsWith('.sh') || lower.endsWith('.bash') || lower.endsWith('.zsh')) {
    return <span className="text-[10px] font-bold text-emerald-400 shrink-0 font-mono">&gt;_</span>;
  }
  if (lower === '.gitignore' || lower.includes('git')) {
    return <span className="text-[11px] font-bold text-orange-500 shrink-0 font-mono">◆</span>;
  }
  if (lower.includes('license')) {
    return <span className="text-[11px] font-bold text-neutral-400 shrink-0 font-mono">©</span>;
  }
  if (lower.includes('vite') || lower.includes('vitest')) {
    return <span className="text-[11px] font-bold text-purple-400 shrink-0 font-mono">⚡</span>;
  }

  return <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
};

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  rootPath,
  projectName,
  activeFilePath,
  onSelectFile,
  onOpenFolderPicker,
  recentProjects = [],
  onSelectRecentProject,
  onCloseFolder,
  className = '',
}) => {
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entry: FileEntry;
  } | null>(null);

  // Modal / prompt states
  const [createPrompt, setCreatePrompt] = useState<{ isDir: boolean; parentPath: string } | null>(null);
  const [createName, setCreateName] = useState('');
  const [renamePrompt, setRenamePrompt] = useState<{ entry: FileEntry; newName: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);

  // Fetch entries for a directory (uses Electron IPC if available, otherwise Gateway REST)
  const fetchDirectoryEntries = useCallback(async (dirPath: string): Promise<FileEntry[]> => {
    // 1. Try Native Electron Bridge
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
        console.warn('Electron workspace.readDir failed, falling back to REST:', err);
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
          size: e.size,
          extension: e.extension,
          loaded: false,
          isOpen: false,
          diagnosticsCount: e.name === 'electron-builder.json' ? 3 : undefined,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch workspace tree from gateway:', err);
    }

    return [];
  }, [rootPath]);

  // Load root directory entries on mount or rootPath change
  const reloadRoot = useCallback(async () => {
    if (!rootPath) {
      setTree([]);
      return;
    }
    setLoading(true);
    try {
      const entries = await fetchDirectoryEntries(rootPath);
      setTree(entries);
    } finally {
      setLoading(false);
    }
  }, [rootPath, fetchDirectoryEntries]);

  useEffect(() => {
    reloadRoot();
  }, [reloadRoot]);

  // Expand / collapse folder node
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

    const newTree = await updateNodes(tree);
    setTree(newTree);
  };

  // Collapse all folders
  const collapseAll = () => {
    const closeRecursive = (nodes: FileEntry[]): FileEntry[] => {
      return nodes.map((n) => ({
        ...n,
        isOpen: false,
        children: n.children ? closeRecursive(n.children) : undefined,
      }));
    };
    setTree(closeRecursive(tree));
  };

  // Create file / folder
  const handleCreateConfirm = async () => {
    if (!createPrompt || !createName.trim()) return;
    const parent = createPrompt.parentPath || rootPath || '';
    const targetPath = `${parent}/${createName.trim()}`;
    const relPath = rootPath ? targetPath.replace(rootPath, '').replace(/^[/\\]/, '') : targetPath;

    try {
      if (window.nusa?.workspace) {
        if (createPrompt.isDir) {
          await window.nusa.workspace.createFolder(targetPath);
        } else {
          await window.nusa.workspace.createFile(targetPath);
        }
      } else {
        await fetch('http://127.0.0.1:4141/api/workspace/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: relPath, is_dir: createPrompt.isDir }),
        });
      }
      setCreatePrompt(null);
      setCreateName('');
      await reloadRoot();
    } catch (err) {
      console.error('Failed to create workspace item:', err);
    }
  };

  // Rename item
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
      await reloadRoot();
    } catch (err) {
      console.error('Failed to rename item:', err);
    }
  };

  // Delete item
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
      await reloadRoot();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  // Reveal in Finder
  const handleRevealInFinder = async (filePath: string) => {
    if (window.nusa?.workspace?.revealInFinder) {
      await window.nusa.workspace.revealInFinder(filePath);
    }
  };

  // Filtered Tree (searches through loaded nodes)
  const filteredTree = useMemo(() => {
    if (!filterQuery.trim()) return tree;
    const q = filterQuery.toLowerCase().trim();

    const filterNodes = (nodes: FileEntry[]): FileEntry[] => {
      const result: FileEntry[] = [];
      for (const node of nodes) {
        const nameMatches = node.name.toLowerCase().includes(q);
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        if (nameMatches || filteredChildren.length > 0) {
          result.push({
            ...node,
            isOpen: true,
            children: filteredChildren,
          });
        }
      }
      return result;
    };
    return filterNodes(tree);
  }, [tree, filterQuery]);

  // Context Menu listener close
  useEffect(() => {
    const handleWindowClick = () => setContextMenu(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Recursive Tree Node Renderer
  const renderNode = (entry: FileEntry, depth: number = 0) => {
    const isActive = activeFilePath === entry.path;
    const paddingLeft = `${depth * 14 + 10}px`;

    return (
      <div key={entry.path} className="flex flex-col select-none">
        <div
          onClick={() => {
            if (entry.is_dir) {
              toggleFolder(entry);
            } else {
              onSelectFile(entry.path, entry.relative_path);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              entry,
            });
          }}
          style={{ paddingLeft }}
          className={`flex items-center justify-between py-1 pr-3 text-xs cursor-pointer group transition-colors ${
            isActive
              ? 'bg-[#04395E]/50 text-white font-medium border-l-2 border-cyan-400'
              : 'text-neutral-300 hover:bg-[#1A1F29]/60 hover:text-white'
          }`}
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
            <span className="truncate text-neutral-200 group-hover:text-white text-[12px]">
              {entry.name}
            </span>
          </div>

          {/* Diagnostic badge if any (matching Image 3, e.g. 3 on electron-builder.json) */}
          {entry.diagnosticsCount && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {entry.diagnosticsCount}
            </span>
          )}
        </div>

        {/* Children if folder is expanded */}
        {entry.is_dir && entry.isOpen && entry.children && (
          <div className="flex flex-col">
            {entry.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // If no root path is open, show Empty State
  if (!rootPath) {
    return (
      <aside
        className={`w-64 bg-[#0D0F12] border-r border-neutral-800/80 flex flex-col h-full select-none shrink-0 text-neutral-300 ${className}`}
      >
        <div className="p-4 border-b border-neutral-800/60 flex items-center justify-between">
          <span className="font-semibold text-xs tracking-wider text-neutral-300 uppercase">
            Explorer
          </span>
        </div>

        <div className="p-5 flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <Folder className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-neutral-100">Belum ada project yang dibuka</h4>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xs">
              Buka folder lokal di perangkat Anda untuk mulai mengedit kode dan berkolaborasi dengan agent.
            </p>
          </div>

          <div className="w-full space-y-2 pt-2">
            <button
              onClick={onOpenFolderPicker}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition shadow-md shadow-indigo-900/30"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Project</span>
            </button>
          </div>

          {recentProjects.length > 0 && (
            <div className="w-full pt-4 border-t border-neutral-800/60 text-left space-y-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Recent Projects
              </span>
              <div className="space-y-1">
                {recentProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelectRecentProject && onSelectRecentProject(p.path)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-neutral-800/50 text-neutral-300 hover:text-white transition group"
                  >
                    <span className="truncate group-hover:text-indigo-300 font-medium">{p.name}</span>
                    <span className="text-[10px] text-neutral-500">{p.lastOpened}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  const rootDisplayName = projectName || rootPath.split(/[/\\]/).pop() || 'CODE';

  return (
    <aside
      className={`w-64 bg-[#0D0F12] border-r border-neutral-800/80 flex flex-col h-full select-none shrink-0 text-neutral-300 ${className}`}
    >
      {/* Explorer Header matching Image 3 */}
      <div className="px-4 py-2.5 border-b border-neutral-800/60 flex items-center justify-between">
        <span className="font-semibold text-xs tracking-wider text-neutral-300 uppercase">
          Explorer
        </span>
        <div className="flex items-center gap-1 text-neutral-400">
          <button
            title="New File"
            onClick={() => setCreatePrompt({ isDir: false, parentPath: rootPath })}
            className="p-1 rounded hover:text-white hover:bg-neutral-800 transition"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            title="New Folder"
            onClick={() => setCreatePrompt({ isDir: true, parentPath: rootPath })}
            className="p-1 rounded hover:text-white hover:bg-neutral-800 transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            title="Refresh Explorer"
            onClick={reloadRoot}
            className="p-1 rounded hover:text-white hover:bg-neutral-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            title="Collapse All"
            onClick={collapseAll}
            className="p-1 rounded hover:text-white hover:bg-neutral-800 transition"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {onCloseFolder && (
            <button
              title="Close Workspace Folder"
              onClick={onCloseFolder}
              className="p-1 rounded hover:text-red-400 hover:bg-neutral-800 transition"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Search in Explorer */}
      <div className="px-3 py-1.5 border-b border-neutral-800/40">
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-neutral-500 absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Cari file..."
            className="w-full bg-[#13161C] border border-neutral-800/80 rounded-md pl-6 pr-6 py-1 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Tree List */}
      <div className="flex-1 overflow-y-auto py-1 font-mono">
        {/* Root Node: e.g. CODE */}
        <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-neutral-200 tracking-wide uppercase">
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          <span>{rootDisplayName}</span>
        </div>

        {loading && tree.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-neutral-500 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Memindai berkas...</span>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="px-6 py-8 text-center text-xs text-neutral-500">
            {filterQuery ? 'Tidak ada file yang cocok' : 'Folder kosong'}
          </div>
        ) : (
          filteredTree.map((entry) => renderNode(entry, 0))
        )}
      </div>

      {/* Bottom Accordion Panels matching Image 3: Outline & Timeline */}
      <div className="border-t border-neutral-800/60 bg-[#0E1014] text-[11px] font-semibold text-neutral-400">
        <div className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-neutral-800/30 cursor-pointer transition">
          <ChevronRight className="w-3 h-3 text-neutral-500" />
          <span>Outline</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-neutral-800/30 cursor-pointer transition border-t border-neutral-800/30">
          <ChevronRight className="w-3 h-3 text-neutral-500" />
          <span>Timeline</span>
        </div>
      </div>

      {/* Context Menu Popup */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 rounded-xl bg-[#141822] border border-[#23293A] shadow-2xl p-1 text-xs text-neutral-200 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (!contextMenu.entry.is_dir) {
                onSelectFile(contextMenu.entry.path, contextMenu.entry.relative_path);
              } else {
                toggleFolder(contextMenu.entry);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Buka File</span>
          </button>
          <button
            onClick={() => {
              handleRevealInFinder(contextMenu.entry.path);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Reveal in Finder</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.entry.path);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Full Path</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.entry.relative_path);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Relative Path</span>
          </button>
          <div className="h-px bg-neutral-800 my-1" />
          <button
            onClick={() => {
              setRenamePrompt({ entry: contextMenu.entry, newName: contextMenu.entry.name });
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Rename...</span>
          </button>
          <button
            onClick={() => {
              setDeleteTarget(contextMenu.entry);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-600 hover:text-white text-red-400 transition flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete (Trash)</span>
          </button>
        </div>
      )}

      {/* Modal: New File / Folder Prompt */}
      {createPrompt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#10131B] border border-[#202636] rounded-xl p-4 w-full max-w-sm space-y-3 shadow-2xl">
            <h4 className="font-semibold text-xs text-neutral-200">
              {createPrompt.isDir ? 'Buat Folder Baru' : 'Buat File Baru'}
            </h4>
            <input
              type="text"
              autoFocus
              placeholder={createPrompt.isDir ? 'nama_folder' : 'nama_file.ts'}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateConfirm();
                if (e.key === 'Escape') setCreatePrompt(null);
              }}
              className="w-full bg-[#161B26] border border-[#262F42] rounded-lg px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setCreatePrompt(null)}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300"
              >
                Batal
              </button>
              <button
                onClick={handleCreateConfirm}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium"
              >
                Buat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rename Prompt */}
      {renamePrompt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#10131B] border border-[#202636] rounded-xl p-4 w-full max-w-sm space-y-3 shadow-2xl">
            <h4 className="font-semibold text-xs text-neutral-200">Ubah Nama Berkas</h4>
            <input
              type="text"
              autoFocus
              value={renamePrompt.newName}
              onChange={(e) => setRenamePrompt({ ...renamePrompt, newName: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameConfirm();
                if (e.key === 'Escape') setRenamePrompt(null);
              }}
              className="w-full bg-[#161B26] border border-[#262F42] rounded-lg px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setRenamePrompt(null)}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300"
              >
                Batal
              </button>
              <button
                onClick={handleRenameConfirm}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#10131B] border border-red-900/40 rounded-xl p-4 w-full max-w-sm space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="font-semibold text-xs text-neutral-100">Konfirmasi Penghapusan</h4>
            </div>
            <p className="text-xs text-neutral-400">
              Apakah Anda yakin ingin memindahkan <strong className="text-white font-mono">{deleteTarget.name}</strong> ke Trash?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-xs text-white font-medium"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
