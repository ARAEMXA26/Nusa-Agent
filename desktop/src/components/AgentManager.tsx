import React from 'react';
import { TaskDetail, TaskState } from '../types/protocol';
import { Bot, PlayCircle, CheckCircle2, AlertCircle, Clock, PauseCircle, ShieldAlert } from 'lucide-react';

interface AgentManagerProps {
  activeTask: TaskDetail | null;
  onCancelTask?: () => void;
}

const STATES_FLOW: TaskState[] = [
  'queued',
  'planning',
  'executing',
  'awaiting_approval',
  'verifying',
  'completed',
];

export const AgentManager: React.FC<AgentManagerProps> = ({ activeTask }) => {
  if (!activeTask) return null;

  const getStepIcon = (step: TaskState) => {
    switch (step) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'executing':
      case 'planning':
        return <PlayCircle className="w-3.5 h-3.5 text-indigo-400 animate-spin" />;
      case 'awaiting_approval':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-bounce" />;
      case 'verifying':
        return <Clock className="w-3.5 h-3.5 text-sky-400" />;
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <PauseCircle className="w-3.5 h-3.5 text-neutral-500" />;
    }
  };

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-5 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-neutral-200">Main Orchestrator</span>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                Task ID: {activeTask.id.slice(0, 8)}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-md">{activeTask.title}</p>
          </div>
        </div>

        {/* State Machine Steps */}
        <div className="flex items-center space-x-1.5 text-[11px]">
          {STATES_FLOW.map((step, idx) => {
            const isCurrent = activeTask.status === step;
            return (
              <React.Fragment key={step}>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    isCurrent
                      ? 'bg-indigo-900/60 border border-indigo-500/50 text-indigo-200 font-semibold shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {isCurrent && getStepIcon(step)}
                  <span className="capitalize">{step.replace('_', ' ')}</span>
                </div>
                {idx < STATES_FLOW.length - 1 && (
                  <span className="text-neutral-600 text-xs">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
