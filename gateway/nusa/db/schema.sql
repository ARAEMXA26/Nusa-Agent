-- Nusa Agent Core SQLite Schema

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL UNIQUE,
    default_model TEXT DEFAULT 'openai/gpt-4o',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    goal TEXT NOT NULL,
    status TEXT NOT NULL, -- queued, planning, awaiting_approval, executing, waiting_external, verifying, completed, failed, cancelled, blocked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    run_number INTEGER NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    token_count INTEGER DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    role TEXT NOT NULL, -- system, user, assistant, tool
    content TEXT NOT NULL,
    tool_call_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tool_calls (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    arguments_json TEXT NOT NULL,
    result_json TEXT,
    status TEXT NOT NULL, -- pending, approval_required, executing, succeeded, failed, rejected
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tool_call_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    payload_preview TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    decided_at TIMESTAMP,
    decided_by TEXT,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(tool_call_id) REFERENCES tool_calls(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- diff, file, plan, test_report, json
    content TEXT NOT NULL,
    source_path TEXT,
    verification_status TEXT NOT NULL DEFAULT 'unverified', -- unverified, verified, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_items (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL, -- working, conversation, project, user, procedural
    project_id TEXT,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    provenance TEXT,
    confidence REAL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actor TEXT NOT NULL,
    event_type TEXT NOT NULL,
    project_id TEXT,
    task_id TEXT,
    details_json TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    parent_task_id TEXT NOT NULL,
    role TEXT NOT NULL,
    title TEXT NOT NULL,
    goal TEXT NOT NULL,
    dependencies_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL, -- pending, running, completed, failed, blocked, cancelled
    depth INTEGER DEFAULT 1,
    result_summary TEXT,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY(parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    default_model TEXT DEFAULT 'openai/gpt-4o',
    is_active INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cron_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    profile_id TEXT,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    cron_expr TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cron_runs (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    task_id TEXT,
    status TEXT NOT NULL,
    output_summary TEXT,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES cron_jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    author TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'installed',
    verification_status TEXT NOT NULL DEFAULT 'untrusted',
    signature TEXT,
    checksum TEXT,
    permissions TEXT,
    installed_path TEXT,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Skills Hub Tables
-- ========================================================

CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT NOT NULL,
    scope TEXT NOT NULL, -- bundled, user, workspace
    risk_level TEXT NOT NULL, -- low, medium, high, critical
    path TEXT NOT NULL,
    manifest_json TEXT NOT NULL,
    instruction_checksum TEXT NOT NULL,
    manifest_checksum TEXT NOT NULL,
    total_checksum TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_versions (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    version TEXT NOT NULL,
    checksum TEXT NOT NULL,
    manifest_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_enablement (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    project_id TEXT, -- NULL for global/bundled scope, or project_id for workspace scope
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(skill_id, project_id)
);

CREATE TABLE IF NOT EXISTS skill_audits (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    version TEXT NOT NULL,
    checksum TEXT NOT NULL,
    status TEXT NOT NULL, -- passed, warning, failed, not_audited, stale
    findings_json TEXT NOT NULL DEFAULT '[]',
    risk_score INTEGER NOT NULL DEFAULT 0,
    audited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_dependencies (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    dep_type TEXT NOT NULL, -- command, runtime, plugin, env_var, tool
    dep_name TEXT NOT NULL,
    status TEXT NOT NULL, -- available, missing, optional_missing
    details TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    version TEXT NOT NULL,
    reason TEXT,
    model TEXT,
    status TEXT NOT NULL, -- active, completed, failed, cancelled
    duration_ms INTEGER,
    error_sanitized TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_tool_calls (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    permitted INTEGER NOT NULL DEFAULT 1,
    decision TEXT NOT NULL, -- allow, ask, deny
    arguments_json TEXT,
    result_json TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(run_id) REFERENCES skill_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_approvals (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    decided_at TIMESTAMP,
    decided_by TEXT,
    FOREIGN KEY(run_id) REFERENCES skill_runs(id) ON DELETE CASCADE
);

