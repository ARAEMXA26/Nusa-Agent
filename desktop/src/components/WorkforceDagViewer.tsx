import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Ban, 
  Compass, 
  Code2, 
  ShieldCheck, 
  CheckCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GitMerge
} from 'lucide-react';
import { SubtaskStatus, AgentRole, TaskDAGData } from '../types/protocol';

interface WorkforceDagViewerProps {
  taskId: string;
  isGitRepo?: boolean;
}

export const WorkforceDagViewer: React.FC<WorkforceDagViewerProps> = ({ taskId, isGitRepo = true }) => {
  const [dag, setDag] = useState<TaskDAGData | null>(null);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [worktreeBranch, setWorktreeBranch] = useState<string | null>(null);
  const [worktreeMerged] = useState(false);

  const fetchDag = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://127.0.0.1:4141/api/tasks/${taskId}/dag`);
      if (res.ok) {
        const data = await res.json();
        setDag(data);
      }
    } catch (e) {
      console.error('Failed to fetch workforce DAG:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchDag();
    }
  }, [taskId]);

  const launchWorkforceDAG = async () => {
    try {
      setLaunching(true);
      const res = await fetch(`http://127.0.0.1:4141/api/tasks/${taskId}/dag/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_worktree: isGitRepo }),
      });
      if (res.ok) {
        const data = await res.json();
        setDag(data.dag);
        setWorktreeBranch(`nusa-sub-${taskId.substring(0, 8)}`);
      }
    } catch (e) {
      console.error('Failed to launch workforce DAG:', e);
    } finally {
      setLaunching(false);
    }
  };

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const getRoleIcon = (role: AgentRole) => {
    switch (role) {
      case 'planner':
        return <Compass className="w-4 h-4 text-purple-400" />;
      case 'coder':
        return <Code2 className="w-4 h-4 text-blue-400" />;
      case 'reviewer':
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case 'verifier':
        return <CheckCheck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Code2 className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStatusBadge = (status: SubtaskStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Selesai</span>
          </span>
        );
      case 'running':
        return (
          <span className="flex items-center space-x-1 text-blue-400 bg-blue-950/60 border border-blue-800/40 text-[10px] px-2 py-0.5 rounded-full font-medium animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Berjalan</span>
          </span>
        );
      case 'blocked':
        return (
          <span className="flex items-center space-x-1 text-amber-400 bg-amber-950/60 border border-amber-800/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            <Ban className="w-3 h-3" />
            <span>Terblokir</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center space-x-1 text-red-400 bg-red-950/60 border border-red-800/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            <AlertCircle className="w-3 h-3" />
            <span>Gagal</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 text-neutral-400 bg-neutral-900 border border-neutral-800 text-[10px] px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />
            <span>Menunggu</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center space-x-2">
              <span>Multi-Agent Workforce & DAG</span>
              {dag?.nodes && dag.nodes.length > 0 && (
                <span className="text-[10px] font-normal bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                  {dag.nodes.filter(n => n.status === 'completed').length}/{dag.nodes.length} Selesai
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-400">Orkestrasi sub-agent paralel dengan isolasi Git Worktree</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDag}
            disabled={loading}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
            title="Refresh DAG"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {(!dag?.nodes || dag.nodes.length === 0) && (
            <button
              onClick={launchWorkforceDAG}
              disabled={launching}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{launching ? 'Memulai...' : 'Jalankan Workforce Pipeline'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Worktree Isolation Banner */}
      {isGitRepo && (
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-950/80 border border-neutral-800/80 rounded-lg text-xs">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-neutral-300 font-medium">Git Worktree Isolation:</span>
            <span className="font-mono text-neutral-400 text-[11px] bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
              {worktreeBranch || `nusa-sub-${taskId.substring(0, 8)}`}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-emerald-400 text-[11px]">
            <GitMerge className="w-3.5 h-3.5" />
            <span>{worktreeMerged ? 'Merged to main' : 'Auto-merge on Verifier pass'}</span>
          </div>
        </div>
      )}

      {/* DAG Subtasks Pipeline */}
      {dag?.nodes && dag.nodes.length > 0 ? (
        <div className="space-y-2">
          {dag.nodes.map((node, index) => (
            <div
              key={node.id}
              className="border border-neutral-800/80 bg-neutral-950/50 rounded-lg p-3 hover:border-neutral-700/80 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="text-[11px] font-mono text-neutral-500">{index + 1}.</span>
                  <div className="p-1 rounded bg-neutral-900 border border-neutral-800">
                    {getRoleIcon(node.role)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-neutral-200">{node.title}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-neutral-900 text-neutral-400 rounded border border-neutral-800">
                        {node.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-1">{node.goal}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusBadge(node.status)}
                  {node.result_summary && (
                    <button
                      onClick={() => toggleNodeExpand(node.id)}
                      className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition"
                    >
                      {expandedNodes[node.id] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Result Summary */}
              {expandedNodes[node.id] && node.result_summary && (
                <div className="mt-3 pt-2.5 border-t border-neutral-800/80 text-xs text-neutral-300 font-mono bg-neutral-900/60 p-2 rounded">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">
                    Hasil Eksekusi Sub-Agent:
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-neutral-300 leading-relaxed">
                    {node.result_summary}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-neutral-800 rounded-lg text-xs text-neutral-500 space-y-2">
          <p>Belum ada subtask DAG yang aktif untuk tugas ini.</p>
          <p className="text-[11px] text-neutral-600">Klik "Jalankan Workforce Pipeline" untuk membedah tugas ke Planner, Coder, Reviewer, dan Verifier.</p>
        </div>
      )}
    </div>
  );
};
