import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkillsManagerModal, SkillItem, SkillDetail } from '../components/SkillsManagerModal';

const mockSkills: SkillItem[] = [
  {
    id: 'task-planning',
    name: 'Task Planning',
    version: '1.0.0',
    description: 'Memecah tujuan kompleks menjadi langkah, dependency, milestone, dan kriteria selesai.',
    tags: ['planning', 'tasks', 'workflow'],
    scope: 'bundled',
    risk_level: 'low',
    enabled: true,
    tools: ['workspace_read', 'memory_read'],
    optional_tools: ['task_state_write'],
    path: '/skills/bundled/task-planning',
    audit: {
      passed: true,
      status: 'passed',
      risk_score: 0,
      findings: [],
      audited_at: '2026-09-15T00:00:00Z',
    },
    dependencies_health: [
      { type: 'tool', name: 'workspace_read', available: true, required: true, details: 'Tool ready' },
    ],
    has_scripts: false,
    has_references: true,
    has_assets: false,
    usage_count: 5,
    last_used_at: '2026-09-15T01:00:00Z',
  },
  {
    id: 'browser-automation',
    name: 'Browser Automation',
    version: '1.0.0',
    description: 'Membuka halaman, berinteraksi dengan DOM, mengisi form, dan mengambil screenshot.',
    tags: ['browser', 'automation', 'e2e'],
    scope: 'bundled',
    risk_level: 'high',
    enabled: false,
    tools: ['browser_open', 'browser_click'],
    optional_tools: [],
    path: '/skills/bundled/browser-automation',
    audit: {
      passed: true,
      status: 'passed',
      risk_score: 10,
      findings: [],
      audited_at: '2026-09-15T00:00:00Z',
    },
    dependencies_health: [
      { type: 'tool', name: 'browser_open', available: true, required: true, details: 'Ready' },
    ],
    has_scripts: true,
    has_references: false,
    has_assets: false,
    usage_count: 1,
    last_used_at: null,
  },
  {
    id: 'quarantined-custom',
    name: 'Quarantined Skill',
    version: '1.0.0',
    description: 'Skill berisiko tinggi yang gagal audit keamanan.',
    tags: ['quarantined', 'danger'],
    scope: 'user',
    risk_level: 'critical',
    enabled: false,
    tools: ['run_command'],
    optional_tools: [],
    path: '/skills/user/quarantined-custom',
    audit: {
      passed: false,
      status: 'failed',
      risk_score: 75,
      findings: [
        { severity: 'CRITICAL', category: 'injection', message: 'Prompt injection detected', line: 12 },
      ],
      audited_at: '2026-09-15T00:00:00Z',
    },
    dependencies_health: [],
    has_scripts: false,
    has_references: false,
    has_assets: false,
    usage_count: 0,
    last_used_at: null,
  },
];

const mockDetail: SkillDetail = {
  manifest: {
    schemaVersion: 1,
    id: 'task-planning',
    name: 'Task Planning',
    version: '1.0.0',
    description: 'Memecah tujuan kompleks menjadi langkah.',
    tags: ['planning', 'tasks'],
    scope: 'bundled',
    entrypoint: 'SKILL.md',
    enabledByDefault: true,
    tools: ['workspace_read'],
    optionalTools: [],
    dependencies: {
      commands: [],
      runtimes: [],
      plugins: [],
      environmentVariables: [],
    },
    permissions: {
      filesystem: 'read',
      network: 'none',
      shell: 'none',
      computerControl: 'none',
    },
    riskLevel: 'low',
    requiresApprovalFor: [],
  },
  instructions: '# Task Planning\n\n## Purpose\nMembuat rencana eksekusi sistematis.\n\n## Trigger Conditions\nTugas baru dimulai.',
  path: '/skills/bundled/task-planning',
  checksum: 'abc123456789',
  instruction_checksum: 'inst123',
  manifest_checksum: 'man123',
  enabled: true,
  audit: {
    passed: true,
    status: 'passed',
    risk_score: 0,
    findings: [],
  },
  dependencies_health: [
    { type: 'tool', name: 'workspace_read', available: true, required: true, details: 'Ready' },
  ],
  has_scripts: false,
  has_references: true,
  has_assets: false,
  usage_count: 5,
  last_used_at: '2026-09-15T01:00:00Z',
};

describe('Skills Hub UI Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn((url: string | URL | Request, _init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/skills/task-planning/traces')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ skill_id: 'task-planning', traces: [] }),
        } as Response);
      }
      if (urlStr.includes('/api/skills/task-planning/disable')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok', enabled: false }),
        } as Response);
      }
      if (urlStr.includes('/api/skills/task-planning/enable')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok', enabled: true }),
        } as Response);
      }
      if (urlStr.includes('/api/skills/task-planning')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDetail),
        } as Response);
      }
      if (urlStr.endsWith('/api/skills')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSkills),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      } as Response);
    });
  });

  it('renders Skills Hub title, subtitle, search input, and action buttons', async () => {
    const handleClose = vi.fn();
    render(<SkillsManagerModal onClose={handleClose} />);

    expect(screen.getByText('Skills Hub')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Cari skill, tag, atau tool…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat Skill/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import Skill/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Task Planning')).toBeInTheDocument();
      expect(screen.getByText('Browser Automation')).toBeInTheDocument();
      expect(screen.getByText('Quarantined Skill')).toBeInTheDocument();
    });
  });

  it('filters skill list when typing in search input', async () => {
    render(<SkillsManagerModal onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Task Planning')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Cari skill, tag, atau tool…');
    fireEvent.change(searchInput, { target: { value: 'browser' } });

    expect(screen.getByText('Browser Automation')).toBeInTheDocument();
    expect(screen.queryByText('Task Planning')).not.toBeInTheDocument();
    expect(screen.queryByText('Quarantined Skill')).not.toBeInTheDocument();
  });

  it('filters by filter chips (Aktif vs Nonaktif vs Butuh perhatian)', async () => {
    render(<SkillsManagerModal onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Task Planning')).toBeInTheDocument();
    });

    // Click "Aktif" chip
    const activeChip = screen.getByRole('button', { name: 'Aktif' });
    fireEvent.click(activeChip);

    expect(screen.getByText('Task Planning')).toBeInTheDocument();
    expect(screen.queryByText('Browser Automation')).not.toBeInTheDocument();

    // Click "Butuh perhatian" chip
    const attentionChip = screen.getByRole('button', { name: 'Butuh perhatian' });
    fireEvent.click(attentionChip);

    expect(screen.getByText('Quarantined Skill')).toBeInTheDocument();
    expect(screen.queryByText('Task Planning')).not.toBeInTheDocument();
  });

  it('opens detail drawer when clicking a skill card and displays tabs', async () => {
    render(<SkillsManagerModal onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Task Planning')).toBeInTheDocument();
    });

    const taskPlanningCard = screen.getByText('Task Planning');
    fireEvent.click(taskPlanningCard);

    // Detail drawer opens
    await waitFor(() => {
      expect(screen.getByText('Integritas & Penyimpanan')).toBeInTheDocument();
    });

    // Tab buttons exist
    expect(screen.getByRole('button', { name: /Instruksi \(SKILL\.md\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tools & Permissions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dependencies/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Audit Keamanan$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Diagnostik Test/i })).toBeInTheDocument();

    // Switch to Instructions tab
    const instTab = screen.getByRole('button', { name: /Instruksi \(SKILL\.md\)/i });
    fireEvent.click(instTab);

    expect(screen.getByText(/Kontrak 10-Bagian Wajib SKILL.md/i)).toBeInTheDocument();
  });

  it('disables toggle switch for failed audit skill to prevent execution', async () => {
    render(<SkillsManagerModal onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Quarantined Skill')).toBeInTheDocument();
    });

    // Quarantined skill has disabled button
    const quarantinedRow = screen.getByText('Quarantined Skill').closest('div[class*="rounded-xl"]');
    expect(quarantinedRow).not.toBeNull();
    const toggleBtn = quarantinedRow?.querySelector('button[disabled]');
    expect(toggleBtn).toBeInTheDocument();
  });

  it('opens Buat Skill modal on button click', async () => {
    render(<SkillsManagerModal onClose={() => {}} />);

    const createBtn = screen.getByRole('button', { name: /Buat Skill/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Buat Skill Baru')).toBeInTheDocument();
    expect(screen.getByLabelText(/Skill ID \(kebab-case\)\*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama UI\*/i)).toBeInTheDocument();
  });

  it('opens Import Skill modal on button click', async () => {
    render(<SkillsManagerModal onClose={() => {}} />);

    const importBtn = screen.getByRole('button', { name: /Import Skill/i });
    fireEvent.click(importBtn);

    expect(screen.getByText('Path Direktori Skill')).toBeInTheDocument();
  });
});
