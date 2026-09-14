import React, { useState } from 'react';
import { Project } from '../types/protocol';
import nusaLogo from '../assets/logo.png';
import {
  Sparkles,
  Play,
  Network,
  Globe,
  Brain,
  Package,
  Settings,
  ShieldCheck,
  Cpu,
  Layers,
  Zap,
  ArrowRight,
  FolderGit2,
  ChevronRight,
  Compass,
  FileCode2,
  ListTodo
} from 'lucide-react';

interface CommandCenterDashboardProps {
  connected: boolean;
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (p: Project) => void;
  tasks: any[];
  onSelectTask: (taskId: string) => void;
  onCreateTask: (goal: string) => void;
  onOpenSettings: () => void;
  onOpenSkills: () => void;
  onOpenMcp: () => void;
  onOpenBrowser: () => void;
  onOpenMemory: () => void;
  onOpenPlugins: () => void;
  onOpenNewProjectModal: () => void;
}

export const CommandCenterDashboard: React.FC<CommandCenterDashboardProps> = ({
  connected,
  projects,
  activeProject,
  setActiveProject,
  tasks,
  onSelectTask,
  onCreateTask,
  onOpenSettings,
  onOpenSkills,
  onOpenMcp,
  onOpenBrowser,
  onOpenMemory,
  onOpenPlugins,
  onOpenNewProjectModal,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('Deterministic / Local LLM');

  const templates = [
    {
      title: 'Code Refactor & Architecture',
      desc: 'Audit codebase, decoupling modules, and fix syntax/type errors',
      prompt: 'Analisis dan audit struktur kode, perbaiki lint errors, dan refactor modul agar decoupled dan clean.',
      icon: <FileCode2 className="w-4 h-4 text-indigo-400" />,
      color: 'from-indigo-500/10 to-indigo-500/5 hover:border-indigo-500/40 text-indigo-300',
    },
    {
      title: 'Playwright Browser Automation',
      desc: 'Headless DOM navigation, scraping, and user-flow tests',
      prompt: 'Gunakan browser headless untuk navigasi ke situs target, ambil DOM snapshot, dan ekstrak ringkasan datanya.',
      icon: <Globe className="w-4 h-4 text-sky-400" />,
      color: 'from-sky-500/10 to-sky-500/5 hover:border-sky-500/40 text-sky-300',
    },
    {
      title: 'MCP Protocol Orchestration',
      desc: 'Execute tasks across multi-tool Model Context Protocol servers',
      prompt: 'Hubungkan tool filesystem dan terminal melalui server MCP untuk mengotomasi alur kerja lintas repositori.',
      icon: <Network className="w-4 h-4 text-emerald-400" />,
      color: 'from-emerald-500/10 to-emerald-500/5 hover:border-emerald-500/40 text-emerald-300',
    },
    {
      title: 'Persistent Memory & Cron',
      desc: 'Schedule background recurring agents with semantic memory',
      prompt: 'Jadwalkan cron agent setiap 30 menit untuk memonitor kesehatan service dan catat hasil ke episodic memory.',
      icon: <Brain className="w-4 h-4 text-purple-400" />,
      color: 'from-purple-500/10 to-purple-500/5 hover:border-purple-500/40 text-purple-300',
    },
    {
      title: 'Security & AST Sandbox Audit',
      desc: 'Scan plugins, dependencies, and shell tools for vulnerabilities',
      prompt: 'Pindai seluruh plugin terpasang dan dependency untuk mendeteksi celah keamanan atau instruksi tidak aman.',
      icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
      color: 'from-amber-500/10 to-amber-500/5 hover:border-amber-500/40 text-amber-300',
    },
    {
      title: 'Test Suite & Dual-Model Verification',
      desc: 'Run unit tests and perform second-opinion AI code verification',
      prompt: 'Jalankan unit tests lokal dan verifikasi bahwa seluruh assertions lulus dengan model verifier independen.',
      icon: <Zap className="w-4 h-4 text-rose-400" />,
      color: 'from-rose-500/10 to-rose-500/5 hover:border-rose-500/40 text-rose-300',
    },
  ];

  const systemFeatures = [
    {
      id: 'skills',
      title: 'Skills Hub & Tool Registry',
      badge: 'Hot-Reload Ready',
      desc: 'Kumpulan Python skills berkas lokal dengan validasi AST otomatis dan skema parameter tervalidasi.',
      icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
      action: onOpenSkills,
      actionText: 'Buka Skills Hub',
      borderHover: 'hover:border-indigo-500/50',
      badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/40',
    },
    {
      id: 'mcp',
      title: 'Model Context Protocol (MCP)',
      badge: 'Universal Protocol',
      desc: 'Terhubung langsung ke server MCP untuk integrasi database, Git, terminal tools, dan API eksternal.',
      icon: <Network className="w-5 h-5 text-emerald-400" />,
      action: onOpenMcp,
      actionText: 'Kelola Server MCP',
      borderHover: 'hover:border-emerald-500/50',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40',
    },
    {
      id: 'browser',
      title: 'Browser Automation Sandbox',
      badge: 'Playwright Chromium',
      desc: 'Browser headless terisolasi dengan DOM snapshot engine, domain guardrails, dan inspeksi visual.',
      icon: <Globe className="w-5 h-5 text-sky-400" />,
      action: onOpenBrowser,
      actionText: 'Buka Browser Sandbox',
      borderHover: 'hover:border-sky-500/50',
      badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800/40',
    },
    {
      id: 'memory',
      title: 'Episodic Memory & Cron Scheduler',
      badge: 'ChromaDB + Cron',
      desc: 'Penyimpanan memori jangka panjang berbasis vektor dan penjadwalan cron otomatis di background.',
      icon: <Brain className="w-5 h-5 text-purple-400" />,
      action: onOpenMemory,
      actionText: 'Buka Memory & Cron',
      borderHover: 'hover:border-purple-500/50',
      badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-800/40',
    },
    {
      id: 'plugins',
      title: 'Plugin Marketplace & AST Auditor',
      badge: 'Sandboxed Ecosystem',
      desc: 'Eksplorasi modul komunitas dengan audit AST otomatis sebelum instalasi untuk mencegah celah keamanan.',
      icon: <Package className="w-5 h-5 text-emerald-400" />,
      action: onOpenPlugins,
      actionText: 'Jelajahi Marketplace',
      borderHover: 'hover:border-emerald-500/50',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40',
    },
    {
      id: 'settings',
      title: 'LLM Gateway & Auto-Update',
      badge: 'Multi-Provider',
      desc: 'Konfigurasi Claude, GPT, Gemini, Ollama, serta status rilis dan update otomatis terintegrasi.',
      icon: <Settings className="w-5 h-5 text-neutral-300" />,
      action: onOpenSettings,
      actionText: 'Buka Pengaturan',
      borderHover: 'hover:border-neutral-500/50',
      badgeClass: 'bg-neutral-800 text-neutral-300 border-neutral-700/60',
    },
  ];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptInput.trim()) {
      onCreateTask(promptInput.trim());
      setPromptInput('');
    }
  };

  const handleSelectTemplate = (prompt: string) => {
    setPromptInput(prompt);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-neutral-950 text-neutral-100">
      {/* Top System Status Bar */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-neutral-950/80 border-b border-neutral-800/80 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80' : 'bg-rose-500 animate-pulse'
              }`}
            />
            <span className="text-xs font-semibold text-neutral-200 tracking-tight">
              Gateway: {connected ? '127.0.0.1:4141 (Online)' : 'Connecting...'}
            </span>
          </div>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Orchestrator: Ready</span>
          </div>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400/90">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AST Guardrails: Active</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {projects.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={activeProject?.id || ''}
                onChange={(e) => {
                  const p = projects.find((x) => x.id === e.target.value);
                  if (p) setActiveProject(p);
                }}
                className="bg-transparent text-neutral-200 outline-none cursor-pointer max-w-[180px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-100">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <button
              onClick={onOpenNewProjectModal}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              + Buat Proyek
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900/90 via-neutral-900/60 to-neutral-950 p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-950 to-neutral-900 border border-indigo-500/30 p-2.5 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-950/40">
              <img src={nusaLogo} alt="Nusa Agent" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-neutral-100 tracking-tight">
                  Nusa Agent Command Center
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  v0.1.0 Local-First
                </span>
              </div>
              <p className="text-xs md:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                Pusat komando agen kecerdasan buatan otonom untuk rekayasa perangkat lunak, otomatisasi browser, eksekusi tools multi-agent, dan verifikasi kode secara aman di perangkat lokal Anda.
              </p>
            </div>
          </div>

          {/* Intelligent Mission Prompt Bar */}
          <form onSubmit={handleFormSubmit} className="relative z-10 space-y-3">
            <div className="relative flex flex-col md:flex-row items-stretch gap-2 bg-neutral-950/90 border border-neutral-700/80 rounded-xl p-2 shadow-xl focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <div className="flex items-center pl-2 text-indigo-400 shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>

              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Tuliskan sasaran tugas (misal: 'Bangun endpoint REST baru dan validasi dengan Playwright browser')..."
                className="flex-1 bg-transparent px-2 py-2 text-xs md:text-sm text-neutral-100 placeholder-neutral-500 outline-none"
              />

              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 outline-none cursor-pointer hover:border-neutral-700 transition-colors"
                >
                  <option value="Deterministic / Local LLM">Deterministic / Local</option>
                  <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet</option>
                  <option value="GPT-4o">GPT-4o</option>
                  <option value="Gemini 2.0 Flash">Gemini 2.0 Flash</option>
                  <option value="Ollama Local DeepSeek">Ollama DeepSeek</option>
                </select>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-semibold rounded-lg shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Jalankan Agent</span>
                </button>
              </div>
            </div>

            {/* Template Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-neutral-400">
              <span className="text-neutral-500 font-medium">Contoh Sasaran Cepat:</span>
              {templates.slice(0, 4).map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.prompt)}
                  className="px-2.5 py-1 rounded-md bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-indigo-300 border border-neutral-800/80 transition-colors flex items-center gap-1.5"
                >
                  <span>{tpl.title}</span>
                  <ChevronRight className="w-3 h-3 text-neutral-500" />
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* System Features & Subsystems Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Subsistem & Fitur Utama Nusa Agent</span>
            </h2>
            <span className="text-[11px] text-neutral-500">Semua modul beroperasi secara lokal & terisolasi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {systemFeatures.map((feat) => (
              <div
                key={feat.id}
                className={`group relative rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-4 flex flex-col justify-between transition-all duration-200 hover:bg-neutral-900/80 ${feat.borderHover} hover:shadow-lg`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 group-hover:scale-105 transition-transform">
                      {feat.icon}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${feat.badgeClass}`}>
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="font-semibold text-xs md:text-sm text-neutral-200 group-hover:text-neutral-100 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-neutral-800/60">
                  <button
                    onClick={feat.action}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 text-xs font-medium transition-all group-hover:border group-hover:border-neutral-700"
                  >
                    <span>{feat.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Agent Workforce Topology & Execution DAG */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                Arsitektur Multi-Agent & Alur Verifikasi Ganda
              </h3>
            </div>
            <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
              Dual-Model Consensus
            </span>
          </div>

          {/* Workflow DAG representation */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-400 flex items-center justify-center mb-2">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-neutral-200">1. Planner & AST</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Dekomposisi sasaran & guardrail check</span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-sky-950 border border-sky-700/60 text-sky-400 flex items-center justify-center mb-2">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-neutral-200">2. Execution Worker</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Edit file, terminal & tool invocation</span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-purple-950 border border-purple-700/60 text-purple-400 flex items-center justify-center mb-2">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-neutral-200">3. Independent Verifier</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Jalankan unit tests & pass/fail verdict</span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-neutral-200">4. Human Approvals</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Diff review & final artifact generation</span>
            </div>
          </div>
        </div>

        {/* Mission Templates Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Pilihan Template Tugas Siap Pakai</span>
            </h2>
            <span className="text-[11px] text-neutral-500">Klik template untuk mengisi sasaran secara otomatis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((tpl, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectTemplate(tpl.prompt)}
                className={`text-left p-3.5 rounded-xl border border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900/90 transition-all flex flex-col justify-between group ${tpl.color}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    {tpl.icon}
                    <span className="font-semibold text-xs text-neutral-200 group-hover:text-neutral-100">
                      {tpl.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                    {tpl.desc}
                  </p>
                </div>
                <div className="pt-3 mt-1 flex items-center justify-between text-[10px] text-neutral-500 font-medium">
                  <span>Gunakan template ini</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-neutral-400" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Tasks List if any */}
        {tasks.length > 0 && (
          <div className="space-y-2.5 pb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-indigo-400" />
              <span>Tugas Terakhir di Proyek Ini ({tasks.length})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tasks.slice(0, 6).map((task) => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className="text-left p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-center justify-between group"
                >
                  <div className="truncate pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-neutral-200 truncate">{task.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                        {task.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">{task.goal}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 shrink-0 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
