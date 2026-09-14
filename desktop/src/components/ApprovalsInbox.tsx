import React from 'react';
import { Approval } from '../types/protocol';
import { useI18n } from '../i18n';
import { ShieldAlert, Check, X, Code2 } from 'lucide-react';

interface ApprovalsInboxProps {
  approvals: Approval[];
  onRespond: (approvalId: string, decision: 'approved' | 'rejected') => void;
}

export const ApprovalsInbox: React.FC<ApprovalsInboxProps> = ({ approvals, onRespond }) => {
  const { t } = useI18n();

  if (approvals.length === 0) return null;

  return (
    <div className="bg-amber-950/40 border-b border-amber-800/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
        <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
        <span>{t('approvals_required')} ({approvals.length})</span>
      </div>

      <div className="space-y-2">
        {approvals.map((appr) => (
          <div
            key={appr.id}
            className="bg-neutral-900 border border-amber-700/40 rounded-lg p-3 text-xs shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-mono text-[10px] uppercase font-bold border border-amber-700/50">
                    {appr.action_type}
                  </span>
                  <span className="text-neutral-300 font-medium">{appr.description}</span>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded p-2 text-[11px] font-mono text-neutral-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  <div className="text-neutral-500 text-[10px] mb-1 flex items-center gap-1">
                    <Code2 className="w-3 h-3" /> Preview:
                  </div>
                  {appr.payload_preview}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => onRespond(appr.id, 'approved')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('approve')}</span>
                </button>
                <button
                  onClick={() => onRespond(appr.id, 'rejected')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-rose-900 text-neutral-300 hover:text-rose-200 transition-colors border border-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{t('reject')}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
