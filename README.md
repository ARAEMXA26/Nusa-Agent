# Nusa Agent 🛡️🤖

> **Local-first Agent Command Center** yang extensible, aman, dan berdaya tinggi (overpowered).
> Mengadopsi prinsip arsitektur teruji dari Hermes Agent, OpenClaw, Agent Zero, Eigent, Goose, OpenHands, dan Google Antigravity.

---

## Ringkasan Proyek

Nusa Agent adalah aplikasi desktop AI agent multi-platform (macOS, Windows, Linux) yang mengontrol pekerjaan otonom melalui pemisahan tegas antara **Desktop Shell** dan **Agent Gateway/Daemon**.

### Fitur Utama (Phase 0, Phase 1, Phase 2 & Phase 3 Selesai):
- **Local-First & Privacy Preserving**: Database SQLite dengan mode Write-Ahead Logging (`WAL`), data project, task, artifact, dan audit logs tersimpan sepenuhnya di perangkat lokal.
- **Strict Security & Canonical Path Jail**: Setiap pembacaan, penulisan, dan patch file dibatasi di dalam root directory workspace proyek menggunakan resolving path kanonikal dan pencegahan symlink escape.
- **Policy Engine (`DENY > ASK > ALLOW`)**:
  - `DENY`: Akses direktori di luar workspace proyek, traversal, atau perintah destruktif sistem.
  - `ASK`: Modifikasi file (`file_patch`, `file_write`, `file_delete`), eksekusi shell, and network calls memerlukan otorisasi eksplisit pengguna.
  - `ALLOW`: Operasi read-only dalam workspace (`file_read`, `file_list`, `git_status`).
- **Human-in-the-loop Approvals**: Tampilan persetujuan real-time di UI dengan preview diff sebelum kode ditulis ke disk.
- **Multi-Agent Workforce & Parallel Task Graph (DAG)**:
  - Sub-agents terspesialisasi berdasarkan peran: **Planner** (arsitektur & breakdown rencana), **Coder** (implementasi kode), **Reviewer** (audit keamanan & quality review), dan **Verifier** (eksekusi pengujian nyata).
  - DAG engine dengan deteksi siklus dependencies, isolasi kegagalan kaskade (*cascading blocked state*), dan eksekusi paralel node independen via `asyncio.gather`.
  - **Sub-agent Containment**: Batasan kedalaman rekursi (`depth <= 3`), pewarisan izin ketat (`child <= parent`), dan isolasi riwayat percakapan (hanya summary yang dikirimkan ke parent task).
- **Git Worktree Isolation**:
  - Modifikasi kode sub-agent dieksekusi di branch worktree terpisah (`.nusa/worktrees/wt-...`) tanpa mengotori working tree utama pengguna.
  - Perubahan di-merge secara otomatis hanya jika tahapan Verifier menyatakan seluruh test lulus 100%.
- **Deterministic Verification Phase**: Agent tidak sekadar mengklaim pekerjaan selesai; agent menjalankan test suite nyata (`run_test`) dan memverifikasi keluaran sebelum menandai task sebagai `completed`.
- **Artifact & Diff Review**: Visualisasi unified diff dengan pewarnaan penambahan/pengurangan kode dan tab laporan hasil test.
- **Mid-turn Steering & Cancellation**: Pengguna dapat memberikan instruksi korektif di tengah eksekusi agent atau membatalkan pekerjaan kapan saja.
- **Agent Skills Hub & Progressive Disclosure**:
  - Struktur standar folder `skill-name/` (`SKILL.md`, `scripts/`, `references/`, `evals/`).
  - Precedence deterministik: `project > profile > global`.
  - Progressive disclosure 3-level: Level 1 (Metadata/Discovery dalam system prompt), Level 2 (Aktivasi instruksi penuh saat dipanggil), Level 3 (Sumber daya/eksekusi script on-demand).
  - **Static Security Scanner**: Memeriksa injeksi prompt, eksfiltrasi rahasia/token, perintah destruktif (`rm -rf /`), dan obfuscated code sebelum skill diaktifkan.
  - Built-in reference skills: `code-reviewer`, `test-generator`, dan `git-workflow`.
- **Model Context Protocol (MCP) Client & Manager**:
  - Mendukung transport `stdio` dan `http` berbasis JSON-RPC 2.0.
  - **Deferred Tool Loading**: Tool eksternal diindeks dan dicari secara dinamis (`tool_search_mcp`) agar context window model tidak kebanjiran puluhan tool schema sekaligus.
  - **Quarantine Isolation**: Menangani server MCP yang berperilaku aneh atau gagal schema validation.
  - Built-in Reference MCP Server (`gateway/nusa/mcp/reference_server.py`) siap pakai out-of-the-box (`mcp_system_info`, `mcp_hash_calculator`, `mcp_echo`).
- **Multi-Provider & Offline Fallback**: OpenAI, Anthropic, Ollama, OpenRouter, serta Deterministic Runner bawaan.
- **Bilingual Interface & Interactive Multi-Agent UI**: Antarmuka responsif Bahasa Indonesia dan English dengan modal manajer Skills, MCP, Browser Sandbox DOM-First, dan visualisasi interaktif pipeline DAG Multi-Agent di Desktop Shell.
- **Browser Automation Sandbox & Scoped Computer-Use (Phase 4)**:
  - **DOM-First Web Automation**: Otomasi Playwright headless Chromium yang fokus pada DOM accessibility tree dan representasi teks bersih alih-alih screenshot visual besar, menghemat token context window LLM.
  - **SSRF & Network Security Engine**: Memblokir skema berbahaya (`file://`, `data:`, `javascript:`), local loopback (`127.0.0.1`, `localhost`), link-local metadata cloud (`169.254.169.254`), serta subnet privat. Mendukung domain allowlist/blocklist kustom.
  - **Interactive Element Tagging**: Memberikan ID deterministik (`[button]`, `[input]`, `[link]`) untuk penargetan interaksi klik dan ketik yang akurat.
  - **Scoped Computer-Use Gating**: Emulasi keystroke dan mouse click koordinat layar terikat boundary `[0..3840, 0..2160]` dengan penegakan izin Tier 2 `ASK` (wajib approval manusia).
  - **Desktop Browser Inspector Modal**: Antarmuka penjelajah URL langsung, tree inspector interaktif, dan penampil snapshot visual.
- **Long-Term Memory, Scoped Profiles & Cron Scheduler (Phase 5)**:
  - **Long-Term Memory Subsystem**: Hirarki penyimpanan ganda Markdown (`USER.md`, `MEMORY.md`) dan basis data SQLite berindeks cepat untuk retrieval keyword/FTS dan injeksi konteks progresif tanpa pemborosan token.
  - **Memory Self-Reflection Tools**: Agentic tools `memory_search`, `memory_store`, `memory_forget`, dan `memory_list` untuk menyimpan preferensi pengguna, aturan arsitektur, dan konteks proyek.
  - **Scoped Profiles & Cross-Profile Soft Guard**: Profil terisolasi (`default`, `researcher`, `security-auditor`, dll.) dengan folder skill dan memori terpisah. Soft guard mencegah mutasi silang antar-profil tanpa persetujuan eksplisit.
  - **Background Cron Task Scheduler**: Penjadwalan tugas agentik otonom berbasis sintaks cron standar (`@hourly`, `@daily`, `*/30 * * * *`, `interval:60`) dengan riwayat eksekusi lengkap (`cron_runs`).
  - **Memory & Scheduler Desktop UI**: Modal tabulasi terpadu di Desktop Shell untuk mengelola memori proyek/global, berpindah profil aktif, dan mengatur jadwal eksekusi tugas background.

---

## Struktur Repositori

```text
.
├── docs/                      # Dokumentasi Desain Sistem & Keputusan
│   ├── PRD.md                 # Product Requirements Document
│   ├── ARCHITECTURE.md        # Arsitektur sistem berlapis
│   ├── THREAT_MODEL.md        # Model ancaman & matriks keamanan
│   ├── DATA_MODEL.md          # Skema DDL SQLite WAL
│   ├── PROTOCOL.md            # Spesifikasi WebSocket & REST event stream
│   ├── ROADMAP.md             # Roadmap prioritas Phase 0-7 & Risk Register
│   ├── DECISION_LOG.md        # Log keputusan arsitektur
│   └── ADR/                   # Architecture Decision Records
│       ├── ADR-0001-stack-selection.md
│       └── ADR-0002-permission-and-sandbox.md
├── gateway/                   # Local Agent Gateway (FastAPI + AsyncIO + SQLite)
│   ├── nusa/
│   │   ├── config.py          # Konfigurasi data dir, DB, host & port
│   │   ├── db/                # Koneksi SQLite WAL, schema, migrasi
│   │   ├── security/          # Path jail, policy engine, audit log, redactor
│   │   ├── tools/             # File tools, shell tools, test runners, git tools
│   │   ├── artifacts/         # Artifact & diff manager
│   │   ├── providers/         # Provider adapters (OpenAI, Anthropic, Ollama, etc.)
│   │   ├── core/              # State machine, event bus, task orchestrator
│   │   └── api/               # REST routers & WebSocket handler
│   ├── tests/                 # Test suite (Unit, Security, Tools, E2E Vertical Slice)
│   └── verify_live.py         # Skrip verifikasi live E2E
├── desktop/                   # Desktop Shell (React + TypeScript + Tailwind + Electron)
│   ├── electron/              # Electron main process & context-isolated preload
│   └── src/
│       ├── components/        # Sidebar, AgentManager, ApprovalsInbox, TaskTimeline, ArtifactPanel, DiffViewer
│       ├── hooks/             # useGateway (WebSocket connection & REST actions)
│       ├── i18n/              # Kamus Bahasa Indonesia (id.json) & English (en.json)
│       └── types/             # Protokol TypeScript & domain types
├── run_gateway.sh             # Skrip runner cepat Agent Gateway
├── run_desktop.sh             # Skrip runner cepat Desktop Shell
├── LICENSE                    # Lisensi Apache-2.0
└── README.md                  # Dokumentasi utama proyek
```

---

## Cara Menjalankan

### Prasyarat
- Python 3.11+
- Node.js 18+ & npm
- `uv` (atau pip standar)

### 1. Menjalankan Agent Gateway
```bash
./run_gateway.sh
```
Gateway akan aktif pada `http://127.0.0.1:4141` dengan endpoint:
- REST API: `http://127.0.0.1:4141/api/...`
- WebSocket Real-time: `ws://127.0.0.1:4141/ws/events`
- Health Check: `http://127.0.0.1:4141/health`
- Swagger Docs: `http://127.0.0.1:4141/docs`

### 2. Menjalankan Desktop UI
Pada terminal terpisah:
```bash
./run_desktop.sh
```
Desktop UI akan terbuka di browser Anda (atau Electron) pada `http://localhost:5173`.

### 3. Menjalankan Seluruh Test Suite
```bash
cd gateway
source .venv/bin/activate
pytest -v
```

### 4. Menjalankan Verifikasi End-to-End Live
Untuk memverifikasi alur penuh secara live (proyek nyata, WebSocket nyata, approval nyata, patch file nyata di disk, dan test verifikasi nyata):
```bash
# Pastikan gateway sedang berjalan, lalu:
cd gateway
source .venv/bin/activate
python verify_live.py
```

---

## Status Milestone & Roadmap

| Fase | Deskripsi | Status |
|---|---|---|
| **Phase 0** | Discovery, PRD, Architecture, Threat Model, Data Model, Protocol, ADR | **SELESAI** |
| **Phase 1** | Thin Vertical Slice (Real file read, patch, approval, test verify, diff artifact, restart recovery) | **SELESAI** |
| **Phase 2** | Skills Hub, MCP Manager, Progressive Disclosure, Static Security Scanner | **SELESAI** |
| **Phase 3** | Multi-Agent Workforce, Parallel Task Graph, Git Worktree Isolation | **SELESAI** |
| **Phase 4** | Browser Sandbox (Playwright DOM-first) & Scoped Computer-Use | **SELESAI** |
| **Phase 5** | Long-Term Memory, Scoped Profiles, Cron Scheduler | **SELESAI** |
| **Phase 6** | Plugin Marketplace, Signing & Static Scanner | *Milestone Berikutnya* |
| **Phase 7** | Multi-Platform Packaging (macOS dmg, Windows exe, Linux AppImage) & Auto-update | Terjadwal |

---

## Lisensi
Proyek ini dilisensikan di bawah [Apache License 2.0](LICENSE).
