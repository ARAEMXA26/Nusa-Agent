import React, { useState } from 'react';
import { TaskDetail } from '../types/protocol';
import { AntigravityEditor } from './AntigravityEditor';
import { 
  ChevronLeft, 
  Users, 
  Clock, 
  Compass, 
  Edit3, 
  Search, 
  Code2, 
  ShieldCheck, 
  Check, 
  RotateCw, 
  Paperclip, 
  Send, 
  FileText, 
  Sparkles, 
  Layers, 
  ChevronDown,
  FileCheck2 
} from 'lucide-react';

interface TaskTimelineProps {
  activeTask: TaskDetail | null;
  onSteer: (message: string) => void;
  onCancel: () => void;
  onCreateTask: (goal: string) => void;
  onBackToDashboard?: () => void;
  isArtifactsClosed?: boolean;
  onOpenArtifacts?: () => void;
  reopenButtonRef?: React.RefObject<HTMLButtonElement>;
}

export const TaskTimeline: React.FC<TaskTimelineProps> = ({
  activeTask,
  onSteer,
  onCancel: _onCancel,
  onCreateTask: _onCreateTask,
  onBackToDashboard,
  isArtifactsClosed = false,
  onOpenArtifacts,
  reopenButtonRef,
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'antigravity' | 'plan' | 'agents' | 'resources'>('conversation');
  const [messageInput, setMessageInput] = useState('');
  const [goalText, setGoalText] = useState(
    activeTask?.goal || 'Create a modern, interactive analytics dashboard for product usage, with real data, clean visualizations, and deployment configuration.'
  );
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // Fallback demo activities matching Gambar 1
  const timelineActivities = [
    {
      time: '10:14',
      agent: 'Researcher',
      color: 'bg-emerald-500',
      description: 'Completed market research and analyzed 12 competitor dashboards',
      action: 'web_search',
      completed: true,
    },
    {
      time: '10:15',
      agent: 'Builder',
      color: 'bg-blue-500',
      description: 'Scaffolding Next.js project with analytics components',
      action: 'create_files',
      completed: true,
    },
    {
      time: '10:16',
      agent: 'Builder',
      color: 'bg-blue-500',
      description: 'Implementing charts and data pipeline',
      action: 'run_command',
      completed: false,
    },
    {
      time: '10:17',
      agent: 'Verifier',
      color: 'bg-blue-500',
      description: 'Running tests and checking accessibility',
      action: 'run_tests',
      completed: false,
    },
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onSteer(messageInput.trim());
      setMessageInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E1013] text-neutral-200 select-none min-w-0 overflow-hidden">
      {/* Center Top Header matching Gambar 1 */}
      <div className="p-5 pb-3 border-b border-neutral-800/80 bg-[#111317]">
        {/* Navigation Breadcrumb & Optional Open Artifacts Button */}
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-white" />
              <span>Tasks</span>
            </button>
            <span>&gt;</span>
            <span className="text-neutral-200 font-medium truncate">
              {activeTask?.title || 'Build Analytics Dashboard'}
            </span>
          </div>

          {isArtifactsClosed && onOpenArtifacts && (
            <button
              ref={reopenButtonRef}
              onClick={onOpenArtifacts}
              title="Buka panel Artifacts (Cmd+Option+A)"
              aria-label="Buka panel Artifacts"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/40 text-[11px] font-semibold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <FileCheck2 className="w-3.5 h-3.5 stroke-white" />
              <span>Buka Artifacts</span>
              <kbd className="text-[9px] bg-blue-950/80 px-1 rounded text-blue-300 ml-1">⌘⌥A</kbd>
            </button>
          )}
        </div>

        {/* Big Mission Title & Progress Metric Ring */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-white tracking-tight truncate">
            {activeTask?.title || 'Build Analytics Dashboard'}
          </h1>

          {/* 68% Progress Ring matching Gambar 1 */}
          <div className="flex items-center gap-4 shrink-0">
            {/* SVG Circular Progress */}
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-neutral-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400"
                  strokeDasharray="68, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-white">68%</span>
            </div>

            {/* Metric counters */}
            <div className="space-y-0.5 text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3 stroke-white" />
                <span>3/3 agents active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 stroke-white" />
                <span>12/18 steps completed</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-500">
                <Clock className="w-3 h-3 stroke-white" />
                <span>Est. 4-6 min remaining</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation matching Gambar 1 & user Antigravity editor request */}
        <div className="flex items-center gap-6 mt-4 border-b border-neutral-800 text-xs font-medium">
          {[
            { id: 'conversation', label: 'Conversation' },
            { id: 'antigravity', label: 'Antigravity Editor' },
            { id: 'plan', label: 'Plan' },
            { id: 'agents', label: 'Agents' },
            { id: 'resources', label: 'Resources' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Center Tab Views */}
      {activeTab === 'antigravity' ? (
        /* Antigravity Editor View directly in center matching Gambar 3 */
        <div className="flex-1 min-h-0">
          <AntigravityEditor />
        </div>
      ) : activeTab === 'plan' ? (
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="p-4 rounded-xl bg-[#14171D] border border-neutral-800">
            <h3 className="text-sm font-semibold text-white mb-2">Execution Plan</h3>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4 stroke-white" />
                <span>Phase 1: Market Analysis & Competitor Benchmarking</span>
              </li>
              <li className="flex items-center gap-2 text-blue-400">
                <RotateCw className="w-4 h-4 stroke-white animate-spin" />
                <span>Phase 2: Scaffolding Next.js Architecture with Chart.js / Recharts</span>
              </li>
              <li className="flex items-center gap-2 text-neutral-400">
                <Clock className="w-4 h-4 stroke-white" />
                <span>Phase 3: Integration Tests, Accessibility Audits & Deployment</span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        /* Main Conversation View matching Gambar 1 */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Goal Card matching Gambar 1 */}
            <div className="p-4 rounded-xl bg-[#13161C] border border-neutral-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#1B202B] text-white shrink-0 mt-0.5">
                <Compass className="w-4 h-4 stroke-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">Goal</span>
                  <button
                    onClick={() => setIsEditingGoal(!isEditingGoal)}
                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-0.5 rounded border border-neutral-700/60 bg-[#161920] transition-colors"
                  >
                    <Edit3 className="w-3 h-3 stroke-white" />
                    <span>Edit Goal</span>
                  </button>
                </div>
                {isEditingGoal ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={goalText}
                      onChange={(e) => setGoalText(e.target.value)}
                      className="w-full bg-[#0E1013] border border-neutral-700 rounded p-2 text-xs text-neutral-200 outline-none focus:border-blue-500"
                      rows={2}
                    />
                    <button
                      onClick={() => setIsEditingGoal(false)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
                    >
                      Save Goal
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {goalText}
                  </p>
                )}
              </div>
            </div>

            {/* Agent Stage Pipeline Cards matching Gambar 1 */}
            <div className="grid grid-cols-3 gap-3 items-center">
              {/* Researcher Card */}
              <div className="p-3.5 rounded-xl bg-[#14171D] border border-neutral-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0F2220] border border-emerald-500/40 flex items-center justify-center text-white shrink-0">
                  <Search className="w-4 h-4 stroke-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">Researcher</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    <span>Completed</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">8/8 steps</div>
                  <div className="w-full bg-neutral-800 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full w-full" />
                  </div>
                </div>
              </div>

              {/* Builder Card */}
              <div className="p-3.5 rounded-xl bg-[#14171D] border border-blue-500/40 shadow-sm shadow-blue-500/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#10213B] border border-blue-500/40 flex items-center justify-center text-white shrink-0">
                  <Code2 className="w-4 h-4 stroke-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">Builder</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block animate-pulse" />
                    <span>Running</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">6/9 steps</div>
                  <div className="w-full bg-neutral-800 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full w-[66%]" />
                  </div>
                </div>
              </div>

              {/* Verifier Card */}
              <div className="p-3.5 rounded-xl bg-[#14171D] border border-neutral-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#142322] border border-teal-500/40 flex items-center justify-center text-white shrink-0">
                  <ShieldCheck className="w-4 h-4 stroke-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">Verifier</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-teal-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                    <span>Running</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">4/6 steps</div>
                  <div className="w-full bg-neutral-800 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-teal-500 h-full w-[66%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Stream matching Gambar 1 */}
            <div className="space-y-2.5 pt-1">
              {timelineActivities.map((act, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-neutral-800/20">
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-500 font-mono text-[11px] w-10">{act.time}</span>
                    <span className={`w-2 h-2 rounded-full ${act.color} shrink-0`} />
                    <span className="font-semibold text-white">{act.agent}</span>
                    <span className="text-neutral-300 truncate">{act.description}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] px-2.5 py-1 rounded bg-[#161A22] border border-neutral-700/60 text-neutral-300 font-mono flex items-center gap-1.5">
                      <span>{act.action}</span>
                      {act.completed ? (
                        <Check className="w-3 h-3 stroke-emerald-400" />
                      ) : (
                        <RotateCw className="w-3 h-3 stroke-blue-400 animate-spin" />
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Conversation History matching Gambar 1 */}
            <div className="space-y-3 pt-2">
              {/* User Bubble */}
              <div className="p-3.5 rounded-xl bg-[#14171E] border border-neutral-800/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                  U
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs text-white">You</span>
                    <span className="text-[10px] text-neutral-500">10:17</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    Make the dashboard focus on weekly active users, retention, and key conversion events. Keep the design clean and minimal.
                  </p>
                </div>
              </div>

              {/* Agent Bubble */}
              <div className="p-3.5 rounded-xl bg-[#13161D] border border-neutral-800/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/30">
                  <Sparkles className="w-3.5 h-3.5 stroke-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">Nusa Agent</span>
                      <span className="text-[10px] text-neutral-500">10:18</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Understood. The agents are updating the implementation with WAU, retention cohorts, and conversion funnels. I'll share a preview shortly.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Message Input Box matching Gambar 1 */}
          <div className="p-4 border-t border-neutral-800/80 bg-[#111317]">
            <form onSubmit={handleSend} className="space-y-2.5">
              {/* Main input */}
              <div className="relative flex items-center bg-[#161920] border border-neutral-700/80 rounded-xl px-3.5 py-2.5 shadow-inner">
                <button type="button" className="text-neutral-400 hover:text-white mr-2" title="Attach file">
                  <Paperclip className="w-4 h-4 stroke-white" />
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Message Nusa Agent..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-neutral-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5 stroke-white" />
                </button>
              </div>

              {/* Action pills matching Gambar 1 */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161920] hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white transition-colors"
                  >
                    <Layers className="w-3 h-3 stroke-white" />
                    <span>Add context</span>
                  </button>

                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161920] hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white transition-colors"
                  >
                    <FileText className="w-3 h-3 stroke-white" />
                    <span>Browse files</span>
                  </button>

                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161920] hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white transition-colors"
                  >
                    <Sparkles className="w-3 h-3 stroke-white" />
                    <span>Use a skill</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#161920] border border-neutral-700/60 text-neutral-300 cursor-pointer">
                  <span>Auto</span>
                  <ChevronDown className="w-3 h-3 stroke-white" />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
