# Nusa Agent Skills Hub — Architecture, Security & Developer Guide

## 1. Ikhtisar Arsitektur Skills Hub

Skills Hub adalah subsistem kapabilitas modular dan aman pada **Nusa Agent** yang memungkinkan model agen menjalankan alur kerja khusus secara deterministik, dapat diaudit, dan aman.

```text
+-------------------------------------------------------------------------+
|                               Skills Hub                                |
|  [Search / Filter Chips] [20 Bundled Skills] [Audit Badges] [Drawer]   |
+-------------------------------------------------------------------------+
                                    |
                                    | REST API (/api/skills/*)
                                    v
+-------------------------------------------------------------------------+
|                              SkillManager                               |
|  - Discovery: workspace > user > bundled                                |
|  - Progressive Disclosure: Level 1 (Summary) -> Level 2 -> Level 3      |
|  - Persistence: SQLite (enablement, audits, runs, tool_calls, approvals)|
+-------------------------------------------------------------------------+
          |                                            |
          v                                            v
+-----------------------+                    +-----------------------+
|  SkillSecurityScanner |                    |  SecurityPolicyEngine |
|  - Static analysis    |                    |  - Least Privilege    |
|  - Prompt injection   |                    |  - Declared Tools Only|
|  - Secret leaks       |                    |  - Human Approval Gate|
|  - Path traversal     |                    |  - Deny by Default    |
+-----------------------+                    +-----------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                       Orchestrator & Execution Plane                    |
|  - System Prompt: Level 1 metadata index (<available_skills>)           |
|  - Intent / Router: $skill-id or goal keywords -> Level 2 active_skill  |
|  - Boundary: active_skill.tools & permissions checked per tool call     |
|  - Teardown: context unloaded & traces persisted to skill_runs          |
+-------------------------------------------------------------------------+
```

---

## 2. Struktur Penyimpanan dan Prioritas Resolusi

Skill disimpan dalam tiga cakupan hirarkis:

```text
skills/
  bundled/         # Skill bawaan sistem (immutable, tidak dapat dihapus)
    task-planning/
      skill.json   # Manifest deklaratif
      SKILL.md     # Kontrak instruksi operasional
      references/  # Dokumen pendukung on-demand
      scripts/     # Skrip/utilitas deterministik
      assets/      # Template atau data pendukung
    ... (20 bundled skills)
  user/            # ~/.nusa/skills atau skills/user/ (berlaku lintas project)
  workspace/       # <project_root>/.nusa/skills atau skills/workspace/
```

### Prioritas Resolusi (Precedence Rule)
Ketika sebuah `id` skill ditemukan di beberapa lokasi, SkillManager memprioritaskan:
$$\text{workspace} > \text{user} > \text{bundled}$$

Bundled skill berstatus **immutable** (tidak dapat dihapus atau ditimpa melalui endpoint DELETE/PATCH).

---

## 3. Schema Manifest (`skill.json`)

Setiap skill wajib memiliki file `skill.json` yang divalidasi secara deterministik menggunakan Pydantic validator (`SkillManifest`):

```json
{
  "schemaVersion": 1,
  "id": "task-planning",
  "name": "Task Planning",
  "version": "1.0.0",
  "description": "Memecah tujuan kompleks menjadi langkah, dependency, milestone, dan kriteria selesai.",
  "tags": ["planning", "tasks", "workflow"],
  "scope": "bundled",
  "entrypoint": "SKILL.md",
  "enabledByDefault": true,
  "tools": ["workspace_read", "memory_read"],
  "optionalTools": ["task_state_write"],
  "dependencies": {
    "commands": [],
    "runtimes": ["python>=3.10"],
    "plugins": [],
    "environmentVariables": []
  },
  "permissions": {
    "filesystem": "read",
    "network": "none",
    "shell": "none",
    "computerControl": "none"
  },
  "riskLevel": "low",
  "requiresApprovalFor": [],
  "compatibility": {
    "os": ["darwin", "linux", "win32"],
    "minAppVersion": "0.1.0"
  }
}
```

### Aturan Validasi:
1. `id`: Format kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`).
2. `version`: Semantic versioning (`^\d+\.\d+\.\d+.*$`).
3. `entrypoint`: Wajib `"SKILL.md"` dan tidak boleh keluar dari direktori skill.
4. `tools`: Harus terdaftar dalam Tool Registry Nusa Agent. Tool yang belum tersedia ditandai status missing dependency.

---

## 4. Kontrak Wajib `SKILL.md` (10 Bagian)

Setiap instruksi skill `SKILL.md` harus mematuhi struktur 10 bagian wajib:

```markdown
# Nama Skill

## Purpose
Deskripsi peran, tanggung jawab, dan batasan operasional skill.

## Trigger Conditions
Kondisi spesifik kapan skill ini harus diaktifkan oleh router atau pengguna.

## Do Not Use When
Skenario negatif di mana skill ini dilarang digunakan (anti-pattern).

## Inputs
Parameter atau data yang dibutuhkan untuk memulai eksekusi.

## Allowed Tools
Daftar tool yang diizinkan dan fungsinya dalam alur kerja skill.

## Workflow
Langkah-langkah deterministik yang dieksekusi oleh model.

## Safety and Approval Gates
Aksi berisiko yang memerlukan konfirmasi manusia sebelum dijalankan.

## Verification
Langkah pengujian atau validasi hasil sebelum menyatakan tugas selesai.

## Output Contract
Format keluaran yang terstruktur (Markdown, JSON, Artifact).

## Failure Handling
Prosedur penanganan ketika terjadi error, timeout, atau data invalid.
```

---

## 5. Mekanisme Progressive Disclosure

Untuk menghemat token context window dan mencegah kebingungan model (prompt dilution), Nusa Agent menerapkan **3 level progressive disclosure**:

1. **Level 1 (Metadata Indexing):**
   - Hanya metadata ringkas (ID, nama, deskripsi singkat, tag, tools) yang disuntikkan ke dalam system prompt dalam blok XML `<available_skills>`.
   - Ukuran konteks: $\approx 1.5 - 2$ KB untuk seluruh 20 skills.
2. **Level 2 (Active Skill Context):**
   - Saat tugas di-route ke suatu skill (melalui intent matching atau mention `$skill-id`), konten lengkap `SKILL.md` dibaca dan dimuat ke blok `<active_skill>`.
3. **Level 3 (On-Demand References & Assets):**
   - File pendukung di folder `references/` atau skrip di `scripts/` hanya dibaca ketika model secara eksplisit meminta melalui tool pembaca file aman.
4. **Teardown:**
   - Setelah tugas selesai (`completed` atau `cancelled`), konteks `active_skill` dilepas secara otomatis.

---

## 6. Least Privilege & Policy Enforcement

Sebelum setiap pemanggilan tool, `SecurityPolicyEngine` menghitung izin efektif:

$$\text{Effective Permission} = \text{App Policy} \cap \text{Workspace Trust} \cap \text{Skill Manifest} \cap \text{User Approval} \cap \text{Tool Policy}$$

- **Deny by Default:** Tool yang tidak tercantum dalam `manifest.tools` atau `optionalTools` otomatis ditolak (`UNAUTHORIZED_TOOL`).
- **Human Approval Gates:** Operasi berikut **wajib** mendapatkan persetujuan manusia (`requires_approval=True`):
  - Penghapusan file (`file_write` mode delete / unlink).
  - Penulisan di luar direktori workspace yang diizinkan.
  - Eksekusi host shell non-sandbox (`run_command`).
  - Instalasi package atau modifikasi plugin (`plugin_install`, `plugin_remove`).
  - Git push atau publish (`git_push`, `pull_request_create`).
  - Kontrol GUI/komputer desktop (`mouse_control`, `keyboard_control`).

---

## 7. Static Security Audit Scanner

Setiap skill diperiksa oleh `SkillSecurityScanner`:

- **Audit Statuses:** `passed`, `warning`, `failed`, `not_audited`, `stale`.
- **Deteksi:**
  - Prompt injection (jailbreak patterns, override instructions).
  - Obfuscation (base64 payloads, eval/exec tricks).
  - Path traversal (`../`, absolute symlink escape).
  - Secret leaks (pola API key OpenAI, Anthropic, AWS, GCP, GitHub tokens).
  - Undeclared tool calls.
  - Perubahan konten: SHA256 checksum disimpan. Jika berkas diubah di disk, status audit otomatis menjadi `stale`.
- **Fail Closed:** Skill dengan status `failed` **tidak dapat diaktifkan** oleh pengguna di UI.

---

## 8. 20 Bundled Skills Bawaan

| # | Skill ID | Nama UI | Risk Level | Tools Utama |
|---|---|---|---|---|
| 1 | `task-planning` | Task Planning | Low | `workspace_read`, `memory_read` |
| 2 | `multi-agent-orchestration` | Multi-Agent Orchestration | Medium | `agent_spawn`, `agent_message`, `agent_wait`, `agent_stop` |
| 3 | `web-research` | Web Research | Medium | `web_search`, `web_open`, `web_find` |
| 4 | `software-development` | Software Development | High | `file_read`, `file_list`, `file_search`, `file_write`, `run_command` |
| 5 | `code-reviewer` | Code Reviewer | Low | `file_read`, `file_list`, `file_search`, `git_status`, `git_diff` |
| 6 | `test-generator` | Test Generator | Medium | `file_read`, `file_search`, `file_write`, `file_patch`, `run_test` |
| 7 | `git-workflow` | Git Workflow | High | `git_status`, `git_diff`, `git_log`, `git_add`, `git_commit` |
| 8 | `browser-automation` | Browser Automation | High | `browser_open`, `browser_inspect`, `browser_click`, `browser_type` |
| 9 | `computer-use` | Computer Use | Critical | `screen_view`, `mouse_control`, `keyboard_control` |
| 10 | `document` | Document Studio | Medium | `document_read`, `document_write`, `document_render` |
| 11 | `pdf` | PDF Studio | Medium | `pdf_read`, `pdf_write`, `pdf_render` |
| 12 | `spreadsheet` | Spreadsheet Analyst | Medium | `spreadsheet_read`, `spreadsheet_write`, `spreadsheet_recalculate` |
| 13 | `slides` | Presentation Builder | Medium | `slides_read`, `slides_write`, `slides_render` |
| 14 | `media-creation` | Media Creation | Medium | `image_generate`, `image_edit` |
| 15 | `data-analysis` | Data Analysis | Medium | `file_read`, `data_query`, `python_sandbox`, `chart_render` |
| 16 | `security-audit` | Security Audit | Low | `file_read`, `file_search`, `dependency_scan`, `secret_scan` |
| 17 | `automation-scheduler` | Automation Scheduler | High | `automation_list`, `automation_create`, `automation_update` |
| 18 | `memory-curator` | Memory Curator | High | `memory_read`, `memory_write`, `memory_delete` |
| 19 | `skill-creator` | Skill Creator | High | `file_read`, `file_write`, `skill_validate`, `skill_test` |
| 20 | `plugin-mcp-manager` | Plugin & MCP Manager | Critical | `plugin_list`, `plugin_inspect`, `plugin_install`, `mcp_test` |

---

## 9. Cara Membuat Skill Baru (Authoring Guide)

### Menggunakan UI
1. Buka **Skills Hub** di Desktop Shell.
2. Klik tombol **Buat Skill** di pojok kanan atas.
3. Masukkan ID skill (`my-custom-skill`), Nama UI, Deskripsi, Tags, Tools yang dibutuhkan, dan Permissions.
4. Klik **Buat Skill**. Skill otomatis tersimpan di direktori user, divalidasi, dan diaudit keamanannya.

### Menggunakan CLI / Direktori
1. Buat folder di `skills/user/<skill-id>` atau `<workspace>/.nusa/skills/<skill-id>`.
2. Buat `skill.json` sesuai schema di atas.
3. Buat `SKILL.md` dengan 10 bagian wajib.
4. Jalankan `POST /api/skills/discover` untuk memindai direktori baru.
5. Jalankan `POST /api/skills/<skill-id>/audit` untuk memvalidasi keamanan skill.

---

## 10. Provider-Agnostic & Model Routing (Termasuk 9Router)

Skills Hub didesain independen dari model AI tertentu:
- Skill hanya mendefinisikan instruksi dan kapabilitas tools.
- Model router Nusa Agent menerjemahkan deklarasi tools ke dalam skema tool calling spesifik provider (OpenAI function calling, Anthropic tool use, Gemini function declarations).
- Mendukung proxy OpenAI-compatible seperti **9Router** dengan menyetel `baseURL` dan `apiKey` pada konfigurasi model router.
- **Sticky Routing:** Selama satu task berjalan di bawah naungan suatu skill, model provider dipertahankan tetap konsisten guna menjaga kontinuitas memori dan konteks instruksi.
