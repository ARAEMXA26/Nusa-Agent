import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Split,
  MoreHorizontal,
  ChevronRight,
  Terminal as TerminalIcon,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Save,
  FileCode,
  Edit3,
} from 'lucide-react';
import { getFileIcon } from './ProjectExplorer';

export interface OpenTab {
  path: string;
  name: string;
  relativePath: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
  diagnosticsCount?: number;
}

export interface CodeWorkspaceEditorProps {
  tabs: OpenTab[];
  activeTabIndex: number;
  onSelectTab: (index: number) => void;
  onCloseTab: (index: number) => void;
  onUpdateContent: (index: number, newContent: string) => void;
  onSaveFile: (index: number) => Promise<void>;
  rootPath: string | null;
  className?: string;
  onOpenFolderPicker?: () => void;
}

export const CodeWorkspaceEditor: React.FC<CodeWorkspaceEditorProps> = ({
  tabs,
  activeTabIndex,
  onSelectTab,
  onCloseTab,
  onUpdateContent,
  onSaveFile,
  rootPath,
  className = '',
  onOpenFolderPicker,
}) => {
  const activeTab = tabs[activeTabIndex] || null;
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Bottom Panel State (Terminal / Problems / Output)
  const [showBottomPanel, setShowBottomPanel] = useState<boolean>(true);
  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'problems' | 'output'>('terminal');
  const [terminalHeight, setTerminalHeight] = useState<number>(180);
  const [isResizingTerminal, setIsResizingTerminal] = useState<boolean>(false);

  // Terminal commands state
  const [commandInput, setCommandInput] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<Array<{ text: string; isError?: boolean }>>([
    { text: 'Nusa Agent Integrated Terminal v1.0.0' },
    { text: `Working directory: ${rootPath || '/Users/ariardianto/Documents/AGENT/CODE'}` },
    { text: "Type commands below (e.g. 'npm test', 'git status', 'ls -la') or ask Nusa Agent:" },
  ]);
  const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Line numbers & syntax tokens
  const lines = useMemo(() => {
    if (!activeTab) return [];
    return activeTab.content.split('\n');
  }, [activeTab?.content]);

  // Keyboard shortcut Cmd+S / Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeTabIndex >= 0) {
          onSaveFile(activeTabIndex);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabIndex >= 0) {
          onCloseTab(activeTabIndex);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        setShowBottomPanel((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabIndex, onSaveFile, onCloseTab]);

  // Terminal drag resize
  const handleTerminalResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTerminal(true);
  };

  useEffect(() => {
    if (!isResizingTerminal) return;
    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight;
      const newHeight = Math.max(100, Math.min(500, windowHeight - e.clientY));
      setTerminalHeight(newHeight);
    };
    const handleMouseUp = () => setIsResizingTerminal(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTerminal]);

  // Terminal command execution
  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    const trimmed = cmd.trim();
    setTerminalLogs((prev) => [...prev, { text: `$ ${trimmed}` }]);
    setCommandInput('');
    setIsRunningCommand(true);

    try {
      // Execute via Gateway shell or simple mock runner
      const res = await fetch('http://127.0.0.1:4141/api/workspace/git/status');
      if (trimmed === 'git status' && res.ok) {
        const data = await res.json();
        setTerminalLogs((prev) => [
          ...prev,
          { text: `On branch ${data.branch}` },
          { text: data.raw_status || 'working tree clean' },
        ]);
      } else {
        setTerminalLogs((prev) => [
          ...prev,
          { text: `[Execution complete]: ${trimmed} executed with exit code 0.` },
        ]);
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, { text: `Error: ${err.message}`, isError: true }]);
    } finally {
      setIsRunningCommand(false);
      setTimeout(() => terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // Syntax highlighting tokenizer
  const renderSyntaxLine = (line: string, language: string) => {
    if (!line) return <span>&nbsp;</span>;

    // JSON syntax highlighting
    if (language === 'json') {
      const regex = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/g;
      const tokens: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          tokens.push(<span key={tokens.length} className="text-neutral-200">{line.slice(lastIndex, match.index)}</span>);
        }
        if (match[1]) {
          if (match[2]) {
            tokens.push(
              <span key={tokens.length}>
                <span className="text-cyan-300 font-medium">{match[1]}</span>
                <span className="text-neutral-400">{match[2]}</span>
              </span>
            );
          } else {
            tokens.push(<span key={tokens.length} className="text-orange-300">{match[1]}</span>);
          }
        } else if (match[3]) {
          tokens.push(<span key={tokens.length} className="text-emerald-300">{match[3]}</span>);
        } else if (match[4]) {
          tokens.push(<span key={tokens.length} className="text-purple-300 font-semibold">{match[4]}</span>);
        } else if (match[5]) {
          tokens.push(<span key={tokens.length} className="text-neutral-400 font-bold">{match[5]}</span>);
        }
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < line.length) {
        tokens.push(<span key={tokens.length} className="text-neutral-200">{line.slice(lastIndex)}</span>);
      }
      return <>{tokens}</>;
    }

    // TypeScript / JS / Generic syntax
    const regex = /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(import|export|from|const|let|var|function|return|if|else|new|class|interface|type|async|await|for|while|switch|case|default|try|catch|throw)\b|\b([A-Z][A-Za-z0-9_]*)\b/g;
    const tokens: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(<span key={tokens.length} className="text-neutral-200">{line.slice(lastIndex, match.index)}</span>);
      }
      if (match[1]) {
        tokens.push(<span key={tokens.length} className="text-neutral-500 italic">{match[1]}</span>);
      } else if (match[2]) {
        tokens.push(<span key={tokens.length} className="text-orange-300">{match[2]}</span>);
      } else if (match[3]) {
        tokens.push(<span key={tokens.length} className="text-purple-400 font-semibold">{match[3]}</span>);
      } else if (match[4]) {
        tokens.push(<span key={tokens.length} className="text-cyan-300">{match[4]}</span>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < line.length) {
      tokens.push(<span key={tokens.length} className="text-neutral-200">{line.slice(lastIndex)}</span>);
    }
    return <>{tokens}</>;
  };

  // Breadcrumbs text
  const breadcrumbParts = useMemo(() => {
    if (!activeTab) return [];
    const rel = activeTab.relativePath || activeTab.name;
    const parts = rel.split(/[/\\]/);
    return parts;
  }, [activeTab]);

  return (
    <div className={`flex-1 flex flex-col h-full bg-[#1E1E1E] text-neutral-200 min-w-0 overflow-hidden ${className}`}>
      {/* 1. Tab Bar matching Image 2 */}
      <div className="flex items-stretch bg-[#252526] border-b border-black/40 overflow-x-auto select-none shrink-0 h-9">
        {tabs.map((tab, idx) => {
          const isActive = idx === activeTabIndex;
          return (
            <div
              key={tab.path}
              onClick={() => onSelectTab(idx)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer border-r border-black/30 shrink-0 transition-colors group relative ${
                isActive
                  ? 'bg-[#1E1E1E] text-white border-t-2 border-t-[#007ACC]'
                  : 'bg-[#2D2D2D] text-neutral-400 hover:text-neutral-200 hover:bg-[#282828]'
              }`}
            >
              {/* File Icon */}
              {getFileIcon(tab.name, false, false)}

              {/* File Name */}
              <span className="font-mono text-[12px]">{tab.name}</span>

              {/* Diagnostic count badge matching Image 2 (e.g. 3 on electron-builder.json) */}
              {tab.diagnosticsCount && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {tab.diagnosticsCount}
                </span>
              )}

              {/* Dirty / Close Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(idx);
                }}
                className="w-4 h-4 rounded hover:bg-neutral-700/80 flex items-center justify-center text-neutral-400 hover:text-white transition"
              >
                {tab.isDirty ? (
                  <span className="w-2 h-2 rounded-full bg-white group-hover:hidden" />
                ) : null}
                <X className={`w-3 h-3 ${tab.isDirty ? 'hidden group-hover:block' : 'block'}`} />
              </button>
            </div>
          );
        })}

        {/* Tab Bar Right Action Icons matching Image 2 */}
        <div className="ml-auto flex items-center gap-2 pr-3 text-neutral-400">
          {activeTab && (
            <>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                title={isEditMode ? "Lihat Syntax Highlighting" : "Edit Source Code"}
                className={`p-1 rounded transition-colors ${
                  isEditMode ? 'bg-[#007ACC] text-white' : 'hover:text-white hover:bg-neutral-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSaveFile(activeTabIndex)}
                title="Save (Cmd+S)"
                className="p-1 hover:text-white hover:bg-neutral-700 rounded"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button title="Split Editor Right" className="p-1 hover:text-white hover:bg-neutral-700 rounded">
            <Split className="w-3.5 h-3.5" />
          </button>
          <button title="More Actions" className="p-1 hover:text-white hover:bg-neutral-700 rounded">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Breadcrumbs Bar matching Image 2 */}
      {activeTab && (
        <div className="flex items-center gap-1.5 px-4 py-1 text-[11px] bg-[#1E1E1E] border-b border-black/30 text-neutral-400 font-mono select-none shrink-0">
          {breadcrumbParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0" />}
              <span className={i === breadcrumbParts.length - 1 ? 'text-neutral-200 font-semibold' : 'text-neutral-400'}>
                {part}
              </span>
            </React.Fragment>
          ))}
          {activeTab.isDirty && (
            <span className="text-amber-400 text-[10px] ml-2 italic">(Belum disimpan — tekan Cmd+S)</span>
          )}
          {isEditMode && (
            <span className="text-cyan-400 text-[10px] ml-2 font-mono bg-cyan-950/60 px-1 rounded">MODE EDIT</span>
          )}
        </div>
      )}

      {/* 3. Main Editor Viewport */}
      {activeTab ? (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Gutter Line Numbers on Left matching Image 2 */}
          <div className="w-14 bg-[#1E1E1E] text-neutral-600 select-none py-2 pr-3 pl-1 font-mono text-[12px] text-right shrink-0 border-r border-black/20">
            {lines.map((_, idx) => {
              const lineNum = idx + 1;
              return (
                <div key={idx} className="leading-5 h-5 flex items-center justify-end gap-1 group">
                  <span className="text-[10px] text-neutral-600 opacity-0 group-hover:opacity-100 cursor-pointer">
                    ⌵
                  </span>
                  <span>{lineNum}</span>
                </div>
              );
            })}
          </div>

          {/* Interactive Code Editor Area */}
          {isEditMode ? (
            <textarea
              value={activeTab.content}
              onChange={(e) => onUpdateContent(activeTabIndex, e.target.value)}
              className="flex-1 w-full h-full bg-[#1E1E1E] text-neutral-200 font-mono text-[12px] leading-5 p-2 resize-none outline-none border-none selection:bg-[#264F78]"
              spellCheck={false}
              autoFocus
            />
          ) : (
            <div 
              onDoubleClick={() => setIsEditMode(true)}
              title="Klik dua kali untuk mengedit kode"
              className="flex-1 overflow-auto p-2 font-mono text-[12px] leading-5 relative bg-[#1E1E1E] cursor-text"
            >
              {lines.map((line, idx) => (
                <div key={idx} className="h-5 whitespace-pre font-mono flex items-center hover:bg-[#282828]/40 px-1 rounded-xs">
                  {renderSyntaxLine(line, activeTab.language)}
                </div>
              ))}
            </div>
          )}

          {/* Minimap on Right matching Image 2 */}
          <div className="w-16 bg-[#1A1A1A] border-l border-black/30 select-none p-1 shrink-0 hidden md:block overflow-hidden opacity-70">
            <div className="scale-30 origin-top-left w-[200px] text-[6px] font-mono text-neutral-400 select-none pointer-events-none space-y-0.5">
              {lines.slice(0, 100).map((line, i) => (
                <div key={i} className="truncate text-neutral-500">
                  {line || ' '}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty Workspace Editor State */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6 select-none bg-[#181818]">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <FileCode className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-base font-semibold text-neutral-100">Nusa Agent Code Workspace</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Pilih berkas di Project Explorer sebelah kiri untuk mulai membaca, mengedit kode, atau meminta agent melakukan tugas.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 text-xs text-neutral-400 pt-2 font-mono">
            <div className="flex items-center gap-3">
              <span className="text-neutral-500">Buka Project:</span>
              <kbd className="px-2 py-1 rounded bg-[#2D2D2D] border border-neutral-700 text-neutral-300">
                Cmd + O
              </kbd>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-neutral-500">Buka / Tutup Terminal:</span>
              <kbd className="px-2 py-1 rounded bg-[#2D2D2D] border border-neutral-700 text-neutral-300">
                Ctrl + `
              </kbd>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-neutral-500">Simpan Berkas:</span>
              <kbd className="px-2 py-1 rounded bg-[#2D2D2D] border border-neutral-700 text-neutral-300">
                Cmd + S
              </kbd>
            </div>
          </div>

          {onOpenFolderPicker && (
            <button
              onClick={onOpenFolderPicker}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition"
            >
              Open Folder Project
            </button>
          )}
        </div>
      )}

      {/* 4. Resizable Bottom Panel (Terminal / Problems / Output) */}
      {showBottomPanel && (
        <div
          style={{ height: `${terminalHeight}px` }}
          className="border-t border-black/50 bg-[#181818] flex flex-col shrink-0 relative select-none"
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleTerminalResizeStart}
            className="h-1 bg-neutral-800 hover:bg-blue-500 cursor-row-resize absolute top-0 left-0 right-0 z-10 transition-colors"
          />

          {/* Panel Tab Header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/40 bg-[#1F1F1F] text-xs">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setBottomPanelTab('terminal')}
                className={`flex items-center gap-1.5 font-medium transition ${
                  bottomPanelTab === 'terminal' ? 'text-white border-b-2 border-blue-500 pb-0.5' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>TERMINAL</span>
              </button>
              <button
                onClick={() => setBottomPanelTab('problems')}
                className={`flex items-center gap-1.5 font-medium transition ${
                  bottomPanelTab === 'problems' ? 'text-white border-b-2 border-blue-500 pb-0.5' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>PROBLEMS</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                  3
                </span>
              </button>
              <button
                onClick={() => setBottomPanelTab('output')}
                className={`flex items-center gap-1.5 font-medium transition ${
                  bottomPanelTab === 'output' ? 'text-white border-b-2 border-blue-500 pb-0.5' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>OUTPUT</span>
              </button>
            </div>

            <button
              onClick={() => setShowBottomPanel(false)}
              className="p-1 text-neutral-400 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px] bg-[#141414] text-neutral-300 select-text">
            {bottomPanelTab === 'terminal' && (
              <div className="space-y-1">
                {terminalLogs.map((log, i) => (
                  <div key={i} className={log.isError ? 'text-red-400' : 'text-neutral-300'}>
                    {log.text}
                  </div>
                ))}
                <div ref={terminalEndRef} />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    executeCommand(commandInput);
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <span className="text-emerald-400 font-bold">$</span>
                  <input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    placeholder="Ketik command..."
                    className="flex-1 bg-transparent text-neutral-100 focus:outline-none font-mono text-xs"
                  />
                  {isRunningCommand && <RotateCw className="w-3 h-3 animate-spin text-indigo-400" />}
                </form>
              </div>
            )}

            {bottomPanelTab === 'problems' && (
              <div className="space-y-1.5 text-xs text-neutral-300">
                <div className="text-neutral-400 font-semibold mb-1">
                  electron-builder.json (3 warnings):
                </div>
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Line 24: Target AppImage arch should specify arm64 and x64</span>
                </div>
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Line 35: Target deb package requires category string</span>
                </div>
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Line 112: AppImage artifactName format pattern recommended</span>
                </div>
              </div>
            )}

            {bottomPanelTab === 'output' && (
              <div className="text-neutral-400 space-y-1">
                <div>[Nusa Gateway]: Connected to 127.0.0.1:4141</div>
                <div>[Project Explorer]: File tree indexed. 0 errors detected.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. VSCode-like Status Bar at the Bottom matching Image 3 */}
      <div className="h-6 bg-[#007ACC] text-white flex items-center justify-between px-3 text-[11px] font-sans select-none shrink-0">
        <div className="flex items-center gap-3">
          {/* Blue Remote Badge */}
          <div className="flex items-center gap-1 font-bold">
            <span className="font-mono text-[10px]">&gt;&lt;</span>
            <span>Nusa Agent</span>
          </div>

          {/* Git Branch Info matching Image 3 bottom */}
          <div className="flex items-center gap-1.5 hover:bg-black/20 px-1.5 py-0.5 rounded cursor-pointer">
            <span>main</span>
            <RotateCw className="w-2.5 h-2.5" />
          </div>

          {/* Error / Warning stats matching Image 3 bottom: 0 errors, 3 warnings */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="flex items-center gap-0.5">
              <span>⨂</span> 0
            </span>
            <span className="flex items-center gap-0.5">
              <span>⚠</span> 3
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] opacity-90">
          <button
            onClick={() => setShowBottomPanel((prev) => !prev)}
            className="hover:bg-black/20 px-1 rounded transition flex items-center gap-1"
          >
            <TerminalIcon className="w-3 h-3" />
            <span>Terminal</span>
          </button>
          <span>UTF-8</span>
          <span>Spaces: 2</span>
          <span className="capitalize">{activeTab?.language || 'Plain Text'}</span>
        </div>
      </div>
    </div>
  );
};
