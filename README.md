# Nusa Agent 🛡️🤖

> **Local-first Agent Command Center** yang extensible, aman, dan berdaya tinggi (overpowered).
> Mengadopsi prinsip arsitektur teruji dari Hermes Agent, OpenClaw, Agent Zero, Eigent, Goose, OpenHands, dan Google Antigravity.

---

## Ringkasan Proyek

Nusa Agent adalah aplikasi desktop AI agent multi-platform (macOS, Windows, Linux) yang mengontrol pekerjaan otonom melalui pemisahan tegas antara **Desktop Shell** dan **Agent Gateway/Daemon**.

### Fitur Utama MVP (Phase 0 & Phase 1 Selesai):
- **Local-First & Privacy Preserving**: Database SQLite dengan mode Write-Ahead Logging (`WAL`), data project, task, artifact, dan audit logs tersimpan sepenuhnya di perangkat lokal.
- **Strict Security & Canonical Path Jail**: Setiap pembacaan, penulisan, dan patch file dibatasi di dalam root directory workspace proyek menggunakan resolving path kanonikal dan pencegahan symlink escape.
- **Policy Engine (`DENY > ASK > ALLOW`)**:
  - `DENY`: Akses direktori di luar workspace proyek, traversal, atau perintah destruktif sistem.
  - `ASK`: Modifikasi file (`file_patch`, `file_write`, `file_delete`), eksekusi shell, dan network calls memerlukan otorisasi eksplisit pengguna.
  - `ALLOW`: Operasi read-only dalam workspace (`file_read`, `file_list`, `git_status`).
- **Human-in-the-loop Approvals**: Tampilan persetujuan real-time di UI dengan preview diff sebelum kode ditulis ke disk.
- **Deterministic Verification Phase**: Agent tidak sekadar mengklaim pekerjaan selesai; agent menjalankan test suite nyata (`run_test`) dan memverifikasi keluaran sebelum menandai task sebagai `completed`.
- **Artifact & Diff Review**: Visualisasi unified diff dengan pewarnaan penambahan/pengurangan kode dan tab laporan hasil test.
- **Mid-turn Steering & Cancellation**: Pengguna dapat memberikan instruksi korektif di tengah eksekusi agent atau membatalkan pekerjaan kapan saja.
- **Multi-Provider & Offline Fallback**:
  - OpenAI (GPT-4o, GPT-4o-mini)
  - Anthropic (Claude 3.5 Sonnet)
  - Ollama (Model lokal seperti Llama 3.1)
  - OpenRouter
  - Deterministic Runner bawaan (untuk pengujian otomatis tanpa API key/koneksi internet)
- **Bilingual Interface**: Antarmuka responsif Bahasa Indonesia dan English dengan toggle i18n seketika.

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
| **Phase 2** | Skills Hub, MCP Manager, Progressive Disclosure | *Milestone Berikutnya* |
| **Phase 3** | Multi-Agent Workforce, Parallel Task Graph, Git Worktree Isolation | Terjadwal |
| **Phase 4** | Browser Sandbox (Playwright DOM-first) & Scoped Computer-Use | Terjadwal |
| **Phase 5** | Long-Term Memory, Scoped Profiles, Cron Scheduler | Terjadwal |
| **Phase 6** | Plugin Marketplace, Signing & Static Scanner | Terjadwal |
| **Phase 7** | Multi-Platform Packaging (macOS dmg, Windows exe, Linux AppImage) & Auto-update | Terjadwal |

---

## Lisensi
Proyek ini dilisensikan di bawah [Apache License 2.0](LICENSE).
