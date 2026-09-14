import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { Sparkles, ShieldCheck, ShieldAlert, X, Tag, Wrench, AlertTriangle } from 'lucide-react';

interface SkillItem {
  name: string;
  description: string;
  version: string;
  scope: string;
  allowed_tools: string[];
  tags: string[];
  enabled: boolean;
  path: string;
  checksum: string;
  scan_result: {
    passed: boolean;
    risk_score: number;
    findings: Array<{
      severity: string;
      category: string;
      message: string;
      line?: number;
    }>;
  };
}

interface SkillsManagerModalProps {
  onClose: () => void;
}

export const SkillsManagerModal: React.FC<SkillsManagerModalProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSkills = async () => {
    try {
      const res = await fetch('http://127.0.0.1:4141/api/skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const toggleSkill = async (name: string, currentEnabled: boolean) => {
    try {
      const res = await fetch('http://127.0.0.1:4141/api/skills/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setSkills((prev) =>
          prev.map((s) => (s.name === name ? { ...s, enabled: !currentEnabled } : s))
        );
      }
    } catch (err) {
      console.error('Failed to toggle skill:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-neutral-100">{t('skills_hub')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-xs text-neutral-400 leading-relaxed">
            Standard Agent Skills dengan <span className="text-indigo-300 font-medium">progressive disclosure</span>.
            Instruksi skill hanya dimuat ke dalam memori model ketika tugas yang sesuai diaktifkan.
          </p>

          {loading ? (
            <div className="text-center py-10 text-neutral-500 text-sm">Memuat skills...</div>
          ) : skills.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-sm">Tidak ada skill yang ditemukan.</div>
          ) : (
            skills.map((skill) => {
              const isPassed = skill.scan_result.passed;

              return (
                <div
                  key={skill.name}
                  className={`p-4 rounded-xl border transition ${
                    isPassed
                      ? 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                      : 'border-red-900/40 bg-red-950/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-neutral-100">{skill.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                          v{skill.version}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                          {skill.scope}
                        </span>

                        {isPassed ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {t('security_pass')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-red-400 font-medium bg-red-950/30 px-2 py-0.5 rounded border border-red-800/40">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {t('security_quarantined')}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-300 mt-1">{skill.description}</p>

                      {/* Tags & Allowed tools */}
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-neutral-400">
                        {skill.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-neutral-500" />
                            {skill.tags.join(', ')}
                          </div>
                        )}
                        {skill.allowed_tools.length > 0 && (
                          <div className="flex items-center gap-1 text-neutral-400">
                            <Wrench className="w-3 h-3 text-neutral-500" />
                            <span>Tools: {skill.allowed_tools.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Security Findings if any */}
                      {!isPassed && skill.scan_result.findings.length > 0 && (
                        <div className="mt-3 p-2.5 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-300 space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-red-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            Temuan Scanner Keamanan:
                          </div>
                          {skill.scan_result.findings.map((f, i) => (
                            <div key={i} className="pl-5 text-[11px]">
                              • [{f.severity}] {f.message} (baris {f.line})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Toggle Button */}
                    <button
                      disabled={!isPassed}
                      onClick={() => toggleSkill(skill.name, skill.enabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        skill.enabled && isPassed ? 'bg-indigo-600' : 'bg-neutral-800'
                      } ${!isPassed ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          skill.enabled && isPassed ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
