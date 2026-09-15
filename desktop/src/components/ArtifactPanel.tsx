import React, { useState, useEffect, useRef } from 'react';
import { Artifact } from '../types/protocol';
import { WebPreview } from './WebPreview';
import { DiffViewer } from './DiffViewer';
import { 
  Maximize2, 
  Minimize2, 
  X, 
  CheckCircle2, 
  Check, 
  MessageSquare, 
  ChevronDown, 
  FileCode 
} from 'lucide-react';

export type ArtifactsPanelState = 'closed' | 'docked' | 'expanded';

interface ArtifactPanelProps {
  artifacts: Artifact[];
  panelState?: ArtifactsPanelState;
  onPanelStateChange?: (state: ArtifactsPanelState) => void;
  lastDockedWidth?: number;
  onDockedWidthChange?: (width: number) => void;
  reopenButtonRef?: React.RefObject<HTMLButtonElement>;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifacts,
  panelState = 'docked',
  onPanelStateChange,
  lastDockedWidth = 480,
  onDockedWidthChange,
  reopenButtonRef,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'diff' | 'files'>('preview');
  const [isApproved, setIsApproved] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);

  const verificationChecks = [
    { title: 'Build completed successfully', time: '10:17', passed: true },
    { title: 'All tests passing (24/24)', time: '10:17', passed: true },
    { title: 'No accessibility issues found', time: '10:17', passed: true },
    { title: 'Performance within targets', time: '10:18', passed: true },
  ];

  // Handle keyboard shortcut: Escape in expanded state restores to docked
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (panelState === 'expanded' && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onPanelStateChange?.('docked');
        setTimeout(() => expandButtonRef.current?.focus(), 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelState, onPanelStateChange]);

  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    if (panelState !== 'docked') return;
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const minWidth = 340;
      const maxWidth = Math.max(minWidth, window.innerWidth - 280);
      const newWidth = Math.min(maxWidth, Math.max(minWidth, window.innerWidth - e.clientX));
      onDockedWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onDockedWidthChange]);

  const handleToggleExpand = () => {
    if (panelState === 'expanded') {
      onPanelStateChange?.('docked');
    } else {
      onPanelStateChange?.('expanded');
    }
  };

  const handleClose = () => {
    onPanelStateChange?.('closed');
    // Shift focus to reopen button on next tick for accessibility
    setTimeout(() => {
      if (reopenButtonRef?.current) {
        reopenButtonRef.current.focus();
      }
    }, 60);
  };

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

  // If closed, render hidden container to preserve state while taking 0 space
  if (panelState === 'closed') {
    return (
      <aside 
        data-state="closed" 
        className="hidden" 
        aria-hidden="true"
      />
    );
  }

  const isExpanded = panelState === 'expanded';

  return (
    <aside
      data-state={panelState}
      style={
        isExpanded
          ? {
              position: 'fixed',
              top: 'var(--app-topbar-height, 48px)',
              left: 'var(--app-sidebar-width, 256px)',
              right: 0,
              bottom: 0,
              width: 'auto',
              height: 'auto',
              zIndex: 'var(--z-artifacts-expanded, 40)',
            }
          : {
              width: `${lastDockedWidth}px`,
            }
      }
      className={`artifacts-panel ${isResizing ? '' : 'artifacts-panel-transition'} bg-[#0E1014] border-l border-neutral-800/80 flex flex-col select-none text-neutral-200 shadow-2xl ${
        isExpanded ? 'h-[calc(100vh-var(--app-topbar-height,48px))]' : 'h-full shrink-0 relative'
      }`}
    >
      {/* Left-edge resize handle for docked mode */}
      {!isExpanded && (
        <div
          onMouseDown={handleMouseDownResize}
          title="Geser untuk mengatur lebar panel"
          className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-blue-500/60 active:bg-blue-500 transition-colors z-30 group flex items-center justify-center"
        >
          <div className="w-0.5 h-8 bg-neutral-700/60 group-hover:bg-blue-400 rounded-full transition-colors" />
        </div>
      )}

      {/* Sticky Header matching specifications */}
      <div className="p-3.5 px-4 flex items-center justify-between border-b border-neutral-800/80 bg-[#121419] shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-white tracking-wide">Artifacts</h2>
          {isExpanded && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60 font-medium">
              Expanded Preview
            </span>
          )}
        </div>

        {/* Top-Right Action Controls: Expand/Restore and Close */}
        <div className="flex items-center gap-2" role="toolbar" aria-label="Kontrol panel Artifacts">
          {/* 1. Expand / Restore Button */}
          <button
            ref={expandButtonRef}
            onClick={handleToggleExpand}
            title={isExpanded ? 'Kembalikan ukuran preview' : 'Perbesar preview'}
            aria-label={isExpanded ? 'Kembalikan ukuran panel Artifacts' : 'Perbesar panel Artifacts'}
            className="w-8 h-8 min-w-[32px] min-h-[32px] relative before:absolute before:-inset-1 before:content-[''] rounded-lg p-1.5 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-800/90 active:bg-neutral-700/80 disabled:opacity-40 disabled:pointer-events-none border border-transparent hover:border-neutral-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition-all shadow-xs"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 stroke-white" />
            ) : (
              <Maximize2 className="w-4 h-4 stroke-white" />
            )}
          </button>

          {/* 2. Close Button */}
          <button
            onClick={handleClose}
            title="Tutup Artifacts"
            aria-label="Tutup panel Artifacts"
            className="w-8 h-8 min-w-[32px] min-h-[32px] relative before:absolute before:-inset-1 before:content-[''] rounded-lg p-1.5 flex items-center justify-center text-neutral-300 hover:text-rose-300 hover:bg-rose-950/40 active:bg-rose-900/60 disabled:opacity-40 disabled:pointer-events-none border border-transparent hover:border-rose-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition-all shadow-xs"
          >
            <X className="w-4 h-4 stroke-white" />
          </button>
        </div>
      </div>

      {/* Tabs matching Gambar 1: Preview | Diff | Files */}
      <div className="px-4 pt-2.5 pb-2 bg-[#121419] border-b border-neutral-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {[
            { id: 'preview', label: 'Preview' },
            { id: 'diff', label: 'Diff' },
            { id: 'files', label: 'Files' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeTab === tab.id
                  ? 'bg-[#1E232E] text-white border border-neutral-700/80 shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isExpanded && (
          <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline-block">
            Tekan <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 text-[10px]">Esc</kbd> untuk restore
          </span>
        )}
      </div>

      {/* Main Tab Content - preserved across docked & expanded */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {activeTab === 'preview' ? (
          /* Live Website Preview Area matching Gambar 1 */
          <div className="flex-1 flex flex-col min-h-0">
            <WebPreview initialUrl="http://localhost:3000/analytics" />
          </div>
        ) : activeTab === 'diff' ? (
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            {artifacts.filter((a) => a.type === 'diff').length > 0 ? (
              artifacts
                .filter((a) => a.type === 'diff')
                .map((a) => <DiffViewer key={a.id} diff={a.content} />)
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
        <div className="p-4 border-t border-neutral-800/80 bg-[#101216] space-y-2.5 shrink-0">
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
            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800/80 text-[11px] text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <Check className="w-3 h-3 stroke-white" />
              <span>{approvalMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Buttons: Approve / Request changes matching Gambar 1 */}
      <div className="p-4 border-t border-neutral-800/80 bg-[#0C0E12] flex items-center gap-3 shrink-0">
        {/* Primary Approve Button */}
        <button
          onClick={handleApprove}
          className="flex-1 bg-[#107C41] hover:bg-[#138A49] active:bg-[#0E6C38] text-white py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs shadow-md shadow-emerald-950/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Check className="w-4 h-4 stroke-white stroke-[2.5]" />
          <span>{isApproved ? 'Approved' : 'Approve'}</span>
          <ChevronDown className="w-3.5 h-3.5 stroke-white ml-1" />
        </button>

        {/* Request Changes Button */}
        <button
          onClick={handleRequestChanges}
          className="flex-1 bg-[#1A1D24] hover:bg-[#222730] border border-neutral-700/80 text-white py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <MessageSquare className="w-3.5 h-3.5 stroke-white" />
          <span>Request changes</span>
        </button>
      </div>
    </aside>
  );
};
