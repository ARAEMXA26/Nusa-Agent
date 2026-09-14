# Product Requirements Document (PRD) — Nusa Agent

## 1. Executive Summary
**Nusa Agent** adalah local-first AI agent command center untuk desktop (macOS, Windows, Linux) yang memberikan otonomi terkontrol kepada model kecerdasan buatan untuk menyelesaikan pekerjaan rekayasa perangkat lunak, otomatisasi alur kerja, analisis dokumen, serta riset multi-langkah.

Nusa Agent memadukan:
- Agent percakapan untuk tugas singkat dan interaktif.
- Task agent asinkron untuk sasaran jangka panjang.
- Multi-agent workspace untuk kolaborasi paralel.
- Eksekusi native tools dan protokol MCP dengan policy engine berlapis (`deny > ask > allow`).
- Memory persisten yang transparan, dapat diedit, dan terlacak sumbernya.
- Sistem persetujuan interaktif (Human-in-the-loop) untuk setiap aksi mutasi atau destruktif.
- Artifacts & diff viewer dengan verifikasi otomatis sebelum penyelesaian tugas.

---

## 2. Target Pengguna & Kasus Penggunaan Utama
1. **Software Engineers & DevOps**:
   - Meminta agen mempelajari repositori, merencanakan perbaikan, membuat worktree, menulis patch, menjalankan test lokal, dan menghasilkan review diff.
2. **Technical Researchers & Analysts**:
   - Menjalankan deep research melalui peramban terisolasi, mengekstrak data dari dokumen/PDF, memproses data dengan skrip lokal, dan membuat laporan terstruktur.
3. **Automators**:
   - Menjadwalkan tugas berkala (scheduled tasks), mengawasi health service lokal, dan menjalankan alur kerja tanpa risiko eksekusi liar tanpa persetujuan.

---

## 3. Sasaran Produk (Goals) & Non-Goals
### Sasaran (Goals):
- **Local-First & Privacy**: Seluruh sesi, state, metadata, kunci API, dan memori tersimpan di mesin pengguna (SQLite lokal, OS Keychain).
- **Extensibility**: Mendukung Agent Skills standard (SKILL.md), plugins, dan server Model Context Protocol (MCP).
- **Safety First**: Tidak ada mode "YOLO" tanpa batasan. Default-deny untuk akses di luar batas project, canonical path validation, dan sandboxing.
- **Auditable & Recoverable**: Setiap perubahan file dapat dibatalkan (undo/revert); setiap tool call tersimpan di audit log append-only.
- **Provider Agnostic**: Mendukung OpenAI, Anthropic, Gemini, OpenRouter, dan Ollama (model lokal) secara transparan.
- **Bilingual i18n**: Antarmuka bawaan Bahasa Indonesia dan English.

### Non-Goals (MVP):
- Bukan cloud SaaS multi-tenant.
- Tidak mengirim telemetri kode pengguna ke server pihak ketiga milik pembuat aplikasi.
- Bukan agent swarm acak yang berjalan tanpa batasan anggaran token, waktu, atau rekursi.

---

## 4. Fitur Utama MVP & Matrix Prioritas
| ID | Fitur | Prioritas | Status Target |
|----|-------|-----------|---------------|
| F-01 | Manajemen Workspace & Project lokal | P0 | Phase 1 |
| F-02 | State Machine Task Loop & Reconnect Recovery | P0 | Phase 1 |
| F-03 | Native Tool Engine (File read, write, patch, test runner) | P0 | Phase 1 |
| F-04 | Path Jail & Security Policy Engine (`deny > ask > allow`) | P0 | Phase 1 |
| F-05 | Diff Viewer & Artifact Preview | P0 | Phase 1 |
| F-06 | Provider Adapters (OpenAI, Anthropic, Ollama, OpenRouter) | P0 | Phase 1 & 2 |
| F-07 | Agent Skills Loader (SKILL.md format) | P1 | Phase 2 |
| F-08 | MCP Client Manager (stdio & HTTP) | P1 | Phase 2 |
| F-09 | Multi-agent Orchestration & Sub-agent Tree | P1 | Phase 3 |
| F-10 | Browser Worker & DOM inspection | P2 | Phase 4 |
| F-11 | Scoped Memory Inspector | P1 | Phase 5 |
| F-12 | Scheduler (Cron/Interval) | P2 | Phase 5 |
