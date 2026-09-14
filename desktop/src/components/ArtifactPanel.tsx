import React, { useState } from 'react';
import { Artifact } from '../types/protocol';
import { useI18n } from '../i18n';
import { DiffViewer } from './DiffViewer';
import { FileCode, FileCheck2, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ArtifactPanelProps {
  artifacts: Artifact[];
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifacts }) => {
  const { t } = useI18n();
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  const currentArtifact =
    artifacts.find((a) => a.id === selectedArtifactId) || artifacts[0] || null;

  if (artifacts.length === 0) {
    return (
      <div className="w-96 bg-neutral-900 border-l border-neutral-800 p-4 flex flex-col items-center justify-center text-center text-xs text-neutral-500">
        <FileCode className="w-8 h-8 text-neutral-700 mb-2" />
        <p className="font-medium text-neutral-400">{t('artifacts')}</p>
        <p className="text-[11px] text-neutral-600 mt-1">
          Artefak yang dihasilkan (diffs, test reports, plan) akan muncul di sini.
        </p>
      </div>
    );
  }

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded font-medium">
            <CheckCircle2 className="w-3 h-3" /> {t('verification_passed')}
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.5 rounded font-medium">
            <XCircle className="w-3 h-3" /> {t('verification_failed')}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded font-medium">
            <AlertCircle className="w-3 h-3" /> {t('unverified')}
          </span>
        );
    }
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'diff':
        return <FileCode className="w-3.5 h-3.5 text-indigo-400" />;
      case 'test_report':
        return <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col h-screen">
      {/* Panel Header */}
      <div className="p-3 border-b border-neutral-800">
        <h2 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-indigo-400" />
          {t('artifacts')} ({artifacts.length})
        </h2>
      </div>

      {/* Artifact Tabs */}
      <div className="p-2 border-b border-neutral-800/80 flex flex-col gap-1 overflow-y-auto max-h-48">
        {artifacts.map((artifact) => {
          const isSelected = currentArtifact?.id === artifact.id;
          return (
            <button
              key={artifact.id}
              onClick={() => setSelectedArtifactId(artifact.id)}
              className={`text-left p-2 rounded-md text-xs transition-colors flex items-center justify-between border ${
                isSelected
                  ? 'bg-neutral-800 border-indigo-500/50 text-neutral-100'
                  : 'border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                {getArtifactIcon(artifact.type)}
                <span className="font-medium truncate">{artifact.title}</span>
              </div>
              <div>{getVerificationBadge(artifact.verification_status)}</div>
            </button>
          );
        })}
      </div>

      {/* Artifact Content Viewer */}
      <div className="flex-1 p-3 overflow-y-auto">
        {currentArtifact && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-800 text-xs">
              <span className="text-neutral-400 font-mono text-[11px] truncate">
                {currentArtifact.source_path || currentArtifact.type}
              </span>
              <div>{getVerificationBadge(currentArtifact.verification_status)}</div>
            </div>

            {currentArtifact.type === 'diff' ? (
              <DiffViewer diff={currentArtifact.content} />
            ) : (
              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 text-xs font-mono text-neutral-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {currentArtifact.content}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
