# Roadmap & Risk Register — Nusa Agent

## Prioritized Roadmap

### Phase 0 — Discovery & Design (SELESAI)
- [x] Repository & Environment assessment.
- [x] Product Requirements Document (PRD).
- [x] System Architecture & Threat Model.
- [x] SQLite Data Model with Migrations.
- [x] WebSocket Protocol Specification.
- [x] ADR 0001 (Stack Selection) & ADR 0002 (Security & Permission Model).
- [x] Decision Log & Risk Register.

### Phase 1 — Thin Vertical Slice (MILESTONE SAAT INI)
**Target Alur End-to-End**:
1. Buat Project & Workspace lokal.
2. Kirim Task ke Agent Gateway.
3. State Machine: `queued` -> `planning` -> `executing`.
4. Tool `file_read` membaca file workspace secara riil.
5. Policy Engine mendeteksi mutasi file -> State dialihkan ke `awaiting_approval`.
6. Pengguna memberikan persetujuan (approval) melalui UI / protocol.
7. Tool `file_patch` menerapkan perubahan file secara riil dengan canonical path check.
8. Verifier tool `run_test` mengeksekusi test lokal (misal pytest) dan memvalidasi keberhasilan.
9. UI dan Gateway menghasilkan Artifact (Implementation Plan, Unified Diff, Test Report).
10. Task dialihkan ke `completed`.
11. State persisten di SQLite dan dapat dibuka kembali setelah app di-restart.

### Phase 2 — Skills, MCP & Provider Adapters
- [ ] Agent Skills Loader (`SKILL.md`, scripts, evals).
- [ ] Model Context Protocol (MCP) Client (stdio & HTTP).
- [ ] Full multi-provider routing (OpenAI, Anthropic Claude, Gemini, Ollama lokal).
- [ ] Dynamic Tool Search & Deferred Loading.

### Phase 3 — Multi-Agent Workforce & Git Worktrees
- [ ] Sub-agent lifecycle (parent-child relationship).
- [ ] Git worktree isolation untuk pekerjaan paralel.
- [ ] Multi-agent task graph visualizer.
- [ ] Verifier/Critic agent khusus.

### Phase 4 — Browser Worker & Scoped Computer-Use
- [ ] Playwright-based isolated browser worker.
- [ ] DOM-first action extraction & vision fallback.
- [ ] Permission scoped per web domain.

### Phase 5 — Memory, Profiles & Schedules
- [ ] Scoped memory store (working, conversation, project, user).
- [ ] Cron/interval scheduler untuk pekerjaan berulang.
- [ ] Isolated profiles (config, memory, sessions).

### Phase 6 — Plugins & Distribution
- [ ] Plugin manifest scanner & integrity check.
- [ ] Sandboxed plugin runtime.

### Phase 7 — Hardening & Release Packaging
- [ ] Cross-platform installers (macOS DMG/app, Windows NSIS/MSI, Linux AppImage/deb).
- [ ] Automatic update manager.

---

## Risk Register

| Risk ID | Deskripsi Risiko | Dampak | Probabilitas | Mitigasi Terpasang |
|---|---|---|---|---|
| **R-01** | Kebocoran kredensial atau prompt injection memaksa model menghapus file host. | Sangat Tinggi | Sedang | Path jailing berbasis `Path.resolve()`, sandbox cwd, policy precedence `deny > ask > allow`, dan Secret Redactor regex. |
| **R-02** | Kehabisan budget token / infinite agent loop. | Tinggi | Rendah | Hard limits: maks 25 iterasi per task, timeout eksekusi, kuota token terkonfigurasi. |
| **R-03** | Inkonsistensi data jika aplikasi crash di tengah eksekusi. | Sedang | Rendah | SQLite WAL mode, foreign keys, status state machine eksplisit, transaction rollback, dan recoverable patch storage. |
| **R-04** | Latensi UI saat streaming tool dan status agent. | Sedang | Rendah | WebSocket bus asinkron non-blocking, decoupled rendering di React. |
