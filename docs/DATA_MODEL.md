# Data Model & Schema Specification — Nusa Agent

Database lokal menggunakan **SQLite** dengan:
- `PRAGMA journal_mode = WAL;` (Write-Ahead Logging untuk konkurensi pembacaan dan penulisan).
- `PRAGMA foreign_keys = ON;` (Integritas referensial antar tabel).
- `PRAGMA busy_timeout = 5000;` (Mencegah error database locked).

---

## 1. Relational Entities & Tables

### 1.1 `projects`
Mewakili workspace direktori yang dikelola.
- `id` (TEXT, PK, UUIDv4)
- `name` (TEXT, NOT NULL)
- `root_path` (TEXT, NOT NULL, UNIQUE) - Path absolut canonical direktori host
- `default_model` (TEXT)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

### 1.2 `tasks`
Mewakili sasaran kerja tingkat tinggi (goal).
- `id` (TEXT, PK, UUIDv4)
- `project_id` (TEXT, FK -> projects.id, NOT NULL)
- `title` (TEXT, NOT NULL)
- `goal` (TEXT, NOT NULL)
- `status` (TEXT, NOT NULL) - Enum: `queued`, `planning`, `awaiting_approval`, `executing`, `waiting_external`, `verifying`, `completed`, `failed`, `cancelled`, `blocked`
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 1.3 `task_runs`
Mewakili satu sesi eksekusi dari suatu task (mendukung retry/resume).
- `id` (TEXT, PK, UUIDv4)
- `task_id` (TEXT, FK -> tasks.id, NOT NULL)
- `run_number` (INTEGER, NOT NULL)
- `status` (TEXT, NOT NULL)
- `started_at` (TIMESTAMP)
- `ended_at` (TIMESTAMP)
- `token_count` (INTEGER DEFAULT 0)
- `error_message` (TEXT)

### 1.4 `messages`
Riwayat percakapan dan instruksi dalam konteks task.
- `id` (TEXT, PK, UUIDv4)
- `task_id` (TEXT, FK -> tasks.id, NOT NULL)
- `role` (TEXT, NOT NULL) - Enum: `system`, `user`, `assistant`, `tool`
- `content` (TEXT, NOT NULL) - JSON string atau raw text content blocks
- `tool_call_id` (TEXT)
- `created_at` (TIMESTAMP)

### 1.5 `tool_calls`
Pencatatan setiap tool yang dipanggil oleh model.
- `id` (TEXT, PK, UUIDv4)
- `task_id` (TEXT, FK -> tasks.id, NOT NULL)
- `tool_name` (TEXT, NOT NULL)
- `arguments_json` (TEXT, NOT NULL)
- `result_json` (TEXT)
- `status` (TEXT, NOT NULL) - Enum: `pending`, `approval_required`, `executing`, `succeeded`, `failed`, `rejected`
- `duration_ms` (INTEGER)
- `created_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP)

### 1.6 `approvals`
Permintaan persetujuan aksi kritis yang diajukan kepada pengguna.
- `id` (TEXT, PK, UUIDv4)
- `task_id` (TEXT, FK -> tasks.id, NOT NULL)
- `tool_call_id` (TEXT, FK -> tool_calls.id, NOT NULL)
- `action_type` (TEXT, NOT NULL) - Misal: `file_patch`, `file_create`, `shell_execute`
- `description` (TEXT, NOT NULL)
- `payload_preview` (TEXT, NOT NULL) - Diff ringkas atau baris perintah
- `status` (TEXT, NOT NULL) - Enum: `pending`, `approved`, `rejected`
- `decided_at` (TIMESTAMP)
- `decided_by` (TEXT)

### 1.7 `artifacts`
Hasil kerja nyata (file output, diff, implementation plan, test report).
- `id` (TEXT, PK, UUIDv4)
- `task_id` (TEXT, FK -> tasks.id, NOT NULL)
- `title` (TEXT, NOT NULL)
- `type` (TEXT, NOT NULL) - Enum: `diff`, `file`, `plan`, `test_report`, `json`
- `content` (TEXT, NOT NULL)
- `source_path` (TEXT)
- `verification_status` (TEXT, NOT NULL) - Enum: `unverified`, `verified`, `failed`
- `created_at` (TIMESTAMP)

### 1.8 `memory_items`
Memori terstruktur ber-scope.
- `id` (TEXT, PK, UUIDv4)
- `scope` (TEXT, NOT NULL) - Enum: `working`, `conversation`, `project`, `user`, `procedural`
- `project_id` (TEXT, FK -> projects.id, NULLABLE)
- `key` (TEXT, NOT NULL)
- `value` (TEXT, NOT NULL)
- `provenance` (TEXT) - Sumber asal memori
- `confidence` (REAL DEFAULT 1.0)
- `created_at` (TIMESTAMP)

### 1.9 `audit_events`
Log append-only yang merekam setiap peristiwa keamanan dan operasional.
- `id` (TEXT, PK, UUIDv4)
- `timestamp` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `actor` (TEXT, NOT NULL) - Misal: `user`, `main_agent`, `subagent:security`
- `event_type` (TEXT, NOT NULL)
- `project_id` (TEXT)
- `task_id` (TEXT)
- `details_json` (TEXT)
