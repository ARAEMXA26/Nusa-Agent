import React, { useState, useMemo } from 'react';
import { 
  X, 
  Minimize2
} from 'lucide-react';

interface EditorFile {
  name: string;
  path: string;
  language: string;
  content: string;
}

const DEFAULT_FILES: EditorFile[] = [
  {
    name: 'electron-builder.json',
    path: 'desktop > electron-builder.json > mac > [ ] target',
    language: 'json',
    content: `{
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64", "arm64"]
      }
    ],
    "category": "Development",
    "artifactName": "Nusa-Agent-\${version}-linux-\${arch}.\${ext}"
  },
  "appImage": {
    "artifactName": "Nusa-Agent-\${version}-linux-\${arch}.AppImage"
  },
  "deb": {
    "artifactName": "Nusa-Agent-\${version}-linux-\${arch}.deb"
  },
  "publish": {
    "provider": "github",
    "owner": "ARAEMXA26",
    "repo": "Nusa-Agent"
  }
}
`,
  },
  {
    name: 'main.ts',
    path: 'desktop > electron > main.ts',
    language: 'typescript',
    content: `import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    show: false,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (process.env['VITE_DEV_SERVER_URL']) {
    mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
`,
  },
  {
    name: 'TaskTimeline.tsx',
    path: 'desktop > src > components > TaskTimeline.tsx',
    language: 'typescriptreact',
    content: `import React, { useState } from 'react';
import { TaskDetail, ToolCall } from '../types/protocol';
import { ToolInspector } from './ToolInspector';

export const TaskTimeline: React.FC<TaskTimelineProps> = ({
  activeTask,
  onSteer,
  onCancel,
  onCreateTask,
  onBackToDashboard,
}) => {
  const [steerInput, setSteerInput] = useState('');

  const handleSteer = (e: React.FormEvent) => {
    e.preventDefault();
    if (steerInput.trim() && activeTask) {
      onSteer(steerInput.trim());
      setSteerInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950">
      {activeTask.messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}
    </div>
  );
};
`,
  },
  {
    name: 'Sidebar.tsx',
    path: 'desktop > src > components > Sidebar.tsx',
    language: 'typescriptreact',
    content: `import React, { useState } from 'react';
import { Project } from '../types/protocol';
import { useI18n } from '../i18n';

export const Sidebar: React.FC<SidebarProps> = ({
  connected,
  projects,
  activeProject,
  setActiveProject,
  tasks,
  activeTaskId,
  onSelectTask,
  onSelectDashboard,
  onCreateProject,
  onOpenSettings,
}) => {
  const { t, language, setLanguage } = useI18n();
  const [showNewProjModal, setShowNewProjModal] = useState(false);

  return (
    <aside className="w-72 bg-neutral-900/90 border-r border-neutral-800 flex flex-col h-screen">
      <SidebarHeader />
      <ProjectsList projects={projects} />
    </aside>
  );
};
`,
  },
];

// Simple syntax highlighting via tokenizer for JSON and TypeScript
const tokenizeLine = (line: string, language: string): React.ReactNode[] => {
  const tokens: React.ReactNode[] = [];
  let lastIndex = 0;
  
  if (language === 'json') {
    // Match keys, strings, numbers, booleans, braces
    const regex = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}\[\]])/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(<span key={tokens.length} className="text-neutral-200">{line.slice(lastIndex, match.index)}</span>);
      }
      if (match[1]) {
        // JSON string
        if (match[2]) {
          tokens.push(<span key={tokens.length}><span className="text-cyan-300">{match[1]}</span><span className="text-neutral-400">{match[2]}</span></span>);
        } else {
          tokens.push(<span key={tokens.length} className="text-orange-300">{match[1]}</span>);
        }
      } else if (match[3]) {
        tokens.push(<span key={tokens.length} className="text-amber-300">{match[3]}</span>);
      } else if (match[4]) {
        tokens.push(<span key={tokens.length} className="text-purple-300">{match[4]}</span>);
      } else if (match[5]) {
        tokens.push(<span key={tokens.length} className="text-neutral-500">{match[5]}</span>);
      }
      lastIndex = regex.lastIndex;
    }
  } else {
    // TypeScript/TSX: keywords, strings, comments, functions
    const regex = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|var|function|return|if|else|new|class|extends|implements|interface|type|async|await|for|while|switch|case|break|default|try|catch|throw|typeof|as|in|of|this|null|undefined|true|false)\b|\b([A-Z][A-Za-z0-9_]*)\b|\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(<span key={tokens.length} className="text-neutral-200">{line.slice(lastIndex, match.index)}</span>);
      }
      if (match[1] || match[2]) {
        tokens.push(<span key={tokens.length} className="text-neutral-500 italic">{match[0]}</span>);
      } else if (match[3]) {
        tokens.push(<span key={tokens.length} className="text-orange-300">{match[0]}</span>);
      } else if (match[4]) {
        tokens.push(<span key={tokens.length} className="text-purple-400 font-medium">{match[0]}</span>);
      } else if (match[5]) {
        tokens.push(<span key={tokens.length} className="text-cyan-300">{match[0]}</span>);
      } else if (match[6]) {
        tokens.push(<span key={tokens.length} className="text-yellow-200">{match[0]}</span>);
      }
      lastIndex = regex.lastIndex;
    }
  }
  
  if (lastIndex < line.length) {
    tokens.push(<span key={tokens.length} className="text-neutral-200">{line.slice(lastIndex)}</span>);
  }
  return tokens;
};

export const AntigravityEditor: React.FC<{ className?: string }> = ({ className }) => {
  const [openTabs, setOpenTabs] = useState<EditorFile[]>([
    DEFAULT_FILES[0],
    DEFAULT_FILES[1],
    DEFAULT_FILES[2],
    DEFAULT_FILES[3],
  ]);
  const [activeTab, setActiveTab] = useState(0);
  const [cursorLine, setCursorLine] = useState(95);

  const lines = useMemo(
    () => openTabs[activeTab]?.content.split('\n') ?? [],
    [openTabs, activeTab]
  );

  const handleCloseTab = (index: number) => {
    if (openTabs.length <= 1) return;
    const newTabs = openTabs.filter((_, i) => i !== index);
    setOpenTabs(newTabs);
    setActiveTab(Math.min(activeTab, newTabs.length - 1));
  };

  return (
    <div className={`flex flex-col h-full bg-[#1E1E1E] select-none text-neutral-200 ${className ?? ''}`}>
      {/* Tab Bar matching Gambar 3 */}
      <div className="flex items-stretch bg-[#252526] border-b border-black/40 overflow-x-auto">
        {openTabs.map((tab, idx) => (
          <div
            key={tab.name}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs cursor-pointer border-r border-black/40 shrink-0 transition-colors ${
              idx === activeTab
                ? 'bg-[#1E1E1E] text-white border-t border-t-blue-500'
                : 'bg-[#2D2D2D] text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="text-[10px] text-yellow-500 font-mono font-bold">
              {tab.language === 'json' ? '{ }' : 'TS'}
            </span>
            <span className="font-medium text-xs">{tab.name}</span>
            {idx === activeTab && (
              <span className="text-[10px] text-neutral-400 ml-0.5">3</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTab(idx);
              }}
              className="ml-1.5 rounded hover:bg-neutral-700 p-0.5 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3 stroke-white" />
            </button>
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center px-2 text-neutral-400 border-l border-black/40">
          <button className="p-1 hover:text-white" title="Split Editor Right">
            <Minimize2 className="w-3.5 h-3.5 stroke-white" />
          </button>
        </div>
      </div>

      {/* Breadcrumb Bar */}
      <div className="px-4 py-1.5 bg-[#1E1E1E] text-[11px] text-neutral-400 flex items-center gap-1.5 border-b border-black/30 font-mono">
        <span>{openTabs[activeTab]?.path}</span>
      </div>

      {/* Code area with gutter, content and minimap */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Line numbers + code area */}
        <div className="flex-1 overflow-auto pl-0 flex">
          {/* Gutter */}
          <div className="pl-4 pr-3 py-2 text-right text-[11px] leading-[20px] text-neutral-500 select-none font-mono bg-[#1E1E1E] sticky left-0 z-10 border-r border-neutral-800/60">
            {lines.map((_, i) => (
              <div
                key={i}
                className={`cursor-pointer ${
                  i + 93 === cursorLine ? 'text-neutral-200 font-semibold' : ''
                }`}
                onClick={() => setCursorLine(i + 93)}
              >
                {i + 93}
              </div>
            ))}
          </div>

          {/* Code text */}
          <div className="flex-1 py-2 px-3 font-mono text-[12px] leading-[20px]">
            {lines.map((line, i) => (
              <div
                key={i}
                onClick={() => setCursorLine(i + 93)}
                className={`whitespace-pre px-2 rounded-sm cursor-text ${
                  i + 93 === cursorLine ? 'bg-[#2A2D2E]' : ''
                }`}
              >
                {line.length > 0
                  ? tokenizeLine(line, openTabs[activeTab]?.language || 'json')
                  : '\u00A0'}
              </div>
            ))}
          </div>
        </div>

        {/* Minimap matching Gambar 3 */}
        <div className="w-[110px] border-l border-black/40 bg-[#1E1E1E] py-2 px-2 overflow-hidden relative shrink-0">
          {lines.slice(0, 40).map((line, i) => {
            const indent = line.search(/\S/) === -1 ? 0 : line.search(/\S/);
            const len = Math.min(line.trimEnd().length, 36);
            const isComment = line.trim().startsWith('//') || line.trim().startsWith('/*');
            const isKey = /"[^"]+"\s*:/.test(line);
            const isString = /:\s*"/.test(line);
            const colorClass = isComment
              ? 'bg-neutral-600'
              : isKey
              ? 'bg-cyan-400/70'
              : isString
              ? 'bg-orange-400/60'
              : line.includes('{') || line.includes('}')
              ? 'bg-yellow-500/70'
              : 'bg-neutral-500/70';
            return (
              <div key={i} className="h-[2px] mb-[2px] flex items-center">
                <div
                  className={`${colorClass} h-[2px] rounded-full`}
                  style={{
                    width: `${Math.max(len * 2, 8)}px`,
                    marginLeft: `${indent * 2.5}px`,
                  }}
                />
              </div>
            );
          })}
          {/* Viewport indicator */}
          <div
            className="absolute right-1 top-2 w-1.5 bg-yellow-400/80 rounded"
            style={{ height: '60px' }}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-1 bg-[#007ACC] text-white text-[11px] flex items-center justify-between font-mono">
        <span>Ln {cursorLine}, Col 1</span>
        <span>
          Spaces: 2 · UTF-8 ·{' '}
          {openTabs[activeTab]?.language === 'json' ? 'JSON' : 'TypeScript'}
        </span>
      </div>
    </div>
  );
};
