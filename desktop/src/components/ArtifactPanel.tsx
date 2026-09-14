import React, { useState } from 'react';
import { Artifact } from '../types/protocol';
import { WebPreview } from './WebPreview';
import { DiffViewer } from './DiffViewer';
import { 
  Maximize2, 
  CheckCircle2, 
  Check, 
  MessageSquare, 
  ChevronDown, 
  FileCode 
} from 'lucide-react';

interface ArtifactPanelProps {
  artifacts: Artifact[];
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifacts }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'diff' | 'files'>('preview');
  const [isApproved, setIsApproved] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  const verificationChecks = [
    { title: 'Build completed successfully', time: '10:17', passed: true },
    { title: 'All tests passing (24/24)', time: '10:17', passed: true },
    { title: 'No accessibility issues found', time: '10:17', passed: true },
    { title: 'Performance within targets', time: '10:18', passed: true },
  ];

  const handleApprove = () => {
    setIsApproved(true);
    setApprovalMessage('Artifacts approved & deployment pipeline triggered!');
    setTimeout(() => setApprovalMessage(null), 4000);
  };

  const handleRequestChanges = () => {
    const feedback = prompt('Masukkan catatan revisi untuk agent:');
    if (feedback) {
      setApprovalMessage(`Revisi dicatat: "${feedback}"`);
      setTimeout(() => setApprovalMessage(null), 4000);
    }
  };

  return (
    <aside className="w-[480px] bg-[#0E1014] border-l border-neutral-800/80 flex flex-col h-screen select-none shrink-0 text-neutral-200">
      {/* Artifacts Header matching Gambar 1 */}
      <div className="p-4 pb-3 flex items-center justify-between border-b border-neutral-800/80 bg-[#121419]">
        <h2 className="text-sm font-bold text-white tracking-wide">Artifacts</h2>
        <button 
          className="p-1 rounded hover:bg-neutral-800 text-white transition-colors"
          title="Expand View"
        >
          <Maximize2 className="w-4 h-4 stroke-white" />
        </button>
      </div>

      {/* Tabs matching Gambar 1: Preview | Diff | Files */}
      <div className="px-4 pt-2.5 pb-2 bg-[#121419] border-b border-neutral-800/80 flex items-center gap-2">
        {[
          { id: 'preview', label: 'Preview' },
          { id: 'diff', label: 'Diff' },
          { id: 'files', label: 'Files' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-[#1E232E] text-white border border-neutral-700/80'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {activeTab === 'preview' ? (
          /* Live Website Preview Area matching Gambar 1 */
          <div className="flex-1 flex flex-col min-h-0">
            <WebPreview initialUrl="http://localhost:3000/analytics" />
          </div>
        ) : activeTab === 'diff' ? (
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            {artifacts.filter(a => a.type === 'diff').length > 0 ? (
              artifacts.filter(a => a.type === 'diff').map(a => (
                <DiffViewer key={a.id} diff={a.content} />
              ))
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] text-neutral-400 font-mono">
                  components/ProductAnalytics.tsx
                </div>
                <div className="p-3 bg-[#111317] border border-neutral-800 rounded text-xs space-y-1">
                  <div className="text-emerald-400">{"+ import { Users, Layers } from 'lucide-react';"}</div>
                  <div className="text-emerald-400">{"+ export const ProductAnalytics = () => {"}</div>
                  <div className="text-emerald-400">{"+   return <AnalyticsDashboard />;"}</div>
                  <div className="text-rose-400">{"- export default LegacyDashboard;"}</div>
                  <div className="text-emerald-400">{"};"}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 p-4 overflow-y-auto text-xs space-y-2">
            <div className="text-neutral-400 font-medium mb-2">Generated Artifact Files:</div>
            {[
              'src/components/ProductAnalytics.tsx',
              'src/components/CohortHeatmap.tsx',
              'src/components/ConversionFunnel.tsx',
              'src/styles/analytics.css',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-[#13161C] border border-neutral-800">
                <FileCode className="w-3.5 h-3.5 stroke-white" />
                <span className="font-mono text-neutral-300 text-[11px]">{f}</span>
              </div>
            ))}
          </div>
        )}

        {/* Verification Checklist Card matching Gambar 1 */}
        <div className="p-4 border-t border-neutral-800/80 bg-[#101216] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <CheckCircle2 className="w-4 h-4 stroke-emerald-400 fill-emerald-950" />
              <span>Verification</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400">
              4/4 checks passed
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-neutral-300">
            {verificationChecks.map((chk, idx) => (
              <div key={idx} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 stroke-emerald-400" />
                  <span className="text-neutral-300 text-[11px]">{chk.title}</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">{chk.time}</span>
              </div>
            ))}
          </div>

          {approvalMessage && (
            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800/80 text-[11px] text-emerald-300 flex items-center gap-2">
              <Check className="w-3 h-3 stroke-white" />
              <span>{approvalMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Buttons: Approve / Request changes matching Gambar 1 */}
      <div className="p-4 border-t border-neutral-800/80 bg-[#0C0E12] flex items-center gap-3">
        {/* Primary Approve Button */}
        <button
          onClick={handleApprove}
          className="flex-1 bg-[#107C41] hover:bg-[#138A49] active:bg-[#0E6C38] text-white py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs shadow-md shadow-emerald-950/40 transition-colors"
        >
          <Check className="w-4 h-4 stroke-white stroke-[2.5]" />
          <span>{isApproved ? 'Approved' : 'Approve'}</span>
          <ChevronDown className="w-3.5 h-3.5 stroke-white ml-1" />
        </button>

        {/* Request Changes Button */}
        <button
          onClick={handleRequestChanges}
          className="flex-1 bg-[#1A1D24] hover:bg-[#222730] border border-neutral-700/80 text-white py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 stroke-white" />
          <span>Request changes</span>
        </button>
      </div>
    </aside>
  );
};
