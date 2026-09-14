import React from 'react';
import { ToolCall } from '../types/protocol';
import { Wrench, Clock } from 'lucide-react';

interface ToolInspectorProps {
  toolCall: ToolCall;
  onClose: () => void;
}

export const ToolInspector: React.FC<ToolInspectorProps> = ({ toolCall, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded bg-indigo-950 border border-indigo-700/50 text-indigo-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-semibold text-neutral-100">{toolCall.tool_name}</h3>
              <p className="text-[10px] text-neutral-400">ID: {toolCall.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {toolCall.duration_ms !== null && toolCall.duration_ms !== undefined && (
              <span className="flex items-center gap-1 text-[11px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                <Clock className="w-3 h-3" /> {toolCall.duration_ms} ms
              </span>
            )}
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                toolCall.status === 'succeeded'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                  : 'bg-rose-950 text-rose-400 border border-rose-800/60'
              }`}
            >
              {toolCall.status}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 py-3 text-xs">
          <div>
            <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Arguments
            </h4>
            <pre className="bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Execution Result
            </h4>
            <pre className="bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {toolCall.result ? JSON.stringify(toolCall.result, null, 2) : 'No result returned'}
            </pre>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium"
          >
            Tutup / Close
          </button>
        </div>
      </div>
    </div>
  );
};
