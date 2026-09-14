import React, { useState } from 'react';
import { TaskDetail, ToolCall } from '../types/protocol';
import { useI18n } from '../i18n';
import nusaLogo from '../assets/logo.png';
import { ToolInspector } from './ToolInspector';
import { WorkforceDagViewer } from './WorkforceDagViewer';
import { 
  Send, 
  User, 
  Wrench, 
  CornerDownRight, 
  Play, 
  StopCircle,
  Clock,
  Compass,
  ArrowLeft
} from 'lucide-react';

interface TaskTimelineProps {
  activeTask: TaskDetail | null;
  onSteer: (message: string) => void;
  onCancel: () => void;
  onCreateTask: (goal: string) => void;
  onBackToDashboard?: () => void;
}

export const TaskTimeline: React.FC<TaskTimelineProps> = ({
  activeTask,
  onSteer,
  onCancel,
  onCreateTask,
  onBackToDashboard,
}) => {
  const { t } = useI18n();
  const [steerInput, setSteerInput] = useState('');
  const [newGoalInput, setNewGoalInput] = useState('');
  const [inspectedTool, setInspectedTool] = useState<ToolCall | null>(null);

  const handleSteer = (e: React.FormEvent) => {
    e.preventDefault();
    if (steerInput.trim() && activeTask) {
      onSteer(steerInput.trim());
      setSteerInput('');
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoalInput.trim()) {
      onCreateTask(newGoalInput.trim());
      setNewGoalInput('');
    }
  };

  if (!activeTask) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-950">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 p-2.5 flex items-center justify-center mb-4 shadow-xl shadow-indigo-950/30">
          <img src={nusaLogo} alt="Nusa Agent Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-base font-semibold text-neutral-200">{t('no_task_selected')}</h2>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm">
          Mulai pekerjaan dengan memasukkan sasaran agent di bawah ini.
        </p>

        <form onSubmit={handleCreateNew} className="w-full max-w-lg mt-6 flex gap-2">
          <input
            type="text"
            value={newGoalInput}
            onChange={(e) => setNewGoalInput(e.target.value)}
            placeholder={t('task_goal_placeholder')}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            {t('create_task')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950">
      {/* Active Task Navigation Header */}
      <div className="bg-neutral-900/90 border-b border-neutral-800 px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-indigo-300 transition-colors px-2.5 py-1 rounded-md bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-neutral-200">Misi Aktif</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
              #{activeTask.id.slice(0, 8)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">
            {activeTask.status}
          </span>
        </div>
      </div>

      {/* Messages & Tool Activity Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Goal Card */}
        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/40">
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-200 text-xs">Sasaran / Goal</span>
              <span className="text-[10px] text-neutral-500">{activeTask.created_at}</span>
            </div>
            <p className="text-neutral-300 mt-1 leading-relaxed">{activeTask.goal}</p>
          </div>
        </div>

        {/* Phase 3 Workforce DAG & Subtasks Viewer */}
        <WorkforceDagViewer taskId={activeTask.id} />

        {/* Message Items */}
        {activeTask.messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 text-xs ${
                isUser ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isUser
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'bg-neutral-900 border border-neutral-800 p-1 text-indigo-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <img src={nusaLogo} alt="Nusa Agent" className="w-full h-full object-contain" />}
              </div>

              <div
                className={`max-w-xl rounded-xl p-3.5 shadow-sm leading-relaxed ${
                  isUser
                    ? 'bg-neutral-800/90 text-neutral-200 border border-neutral-700/60'
                    : 'bg-neutral-900/90 text-neutral-200 border border-neutral-800'
                }`}
              >
                <div className="text-[10px] font-medium text-neutral-500 mb-1 capitalize">
                  {msg.role}
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          );
        })}

        {/* Tool Call Cards */}
        {activeTask.tool_calls.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-neutral-800/80">
            <div className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider flex items-center gap-1.5">
              <Wrench className="w-3 h-3 text-indigo-400" />
              Tool Calls ({activeTask.tool_calls.length})
            </div>

            <div className="grid grid-cols-1 gap-2">
              {activeTask.tool_calls.map((tc) => (
                <div
                  key={tc.id}
                  className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-2.5 text-xs flex items-center justify-between hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className="p-1 rounded bg-neutral-800 text-neutral-400">
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-mono text-neutral-200 font-semibold">{tc.tool_name}</span>
                    <span className="text-[11px] text-neutral-400 font-mono truncate max-w-xs">
                      {JSON.stringify(tc.arguments)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {tc.duration_ms !== null && tc.duration_ms !== undefined && (
                      <span className="flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-800/80 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" /> {tc.duration_ms}ms
                      </span>
                    )}
                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                        tc.status === 'succeeded'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                          : tc.status === 'rejected'
                          ? 'bg-neutral-800 text-neutral-400'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/40'
                      }`}
                    >
                      {tc.status}
                    </span>
                    <button
                      onClick={() => setInspectedTool(tc)}
                      className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mid-turn Steering & Control Footer */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900/80">
        <form onSubmit={handleSteer} className="flex items-center gap-2">
          <input
            type="text"
            value={steerInput}
            onChange={(e) => setSteerInput(e.target.value)}
            disabled={activeTask.status === 'completed' || activeTask.status === 'failed'}
            placeholder={t('mid_turn_steer_placeholder')}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!steerInput.trim() || activeTask.status === 'completed'}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white disabled:text-neutral-500 text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('steer_btn')}</span>
          </button>
          {activeTask.status !== 'completed' && activeTask.status !== 'failed' && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 border border-neutral-700 hover:border-rose-800 transition-colors"
              title={t('cancel_task')}
            >
              <StopCircle className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Tool Inspector Modal */}
      {inspectedTool && (
        <ToolInspector
          toolCall={inspectedTool}
          onClose={() => setInspectedTool(null)}
        />
      )}
    </div>
  );
};
