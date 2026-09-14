# Nusa Agent 🛡️🤖

[![Release](https://img.shields.io/badge/release-v0.1.0-indigo.svg)](https://github.com/ARAEMXA26/Nusa-Agent/releases/latest)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-emerald.svg)](https://github.com/ARAEMXA26/Nusa-Agent/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](gateway/)
[![Node](https://img.shields.io/badge/node-22+-green.svg)](desktop/)

> **Local-first Autonomous AI Agent Command Center** lintas platform yang aman, extensible, dan berdaya tinggi (*overpowered*).  
> Mengadopsi prinsip arsitektur teruji dari Hermes Agent, OpenClaw, Agent Zero, Eigent, Goose, OpenHands, dan Google Antigravity.

---

## 📥 Unduh Nusa Agent (Semua Perangkat Tersedia)

Nusa Agent dapat langsung diunduh dan dipasang pada sistem operasi **macOS**, **Windows**, dan **Linux**. Seluruh berkas rilis dan checksum verifikasi tersedia secara resmi di **[GitHub Releases](https://github.com/ARAEMXA26/Nusa-Agent/releases/latest)**.

### Tabel Tautan Unduhan Langsung (Direct Download Links)

| Sistem Operasi | Arsitektur | Format Berkas | Tautan Unduhan Langsung | Deskripsi |
|---|---|---|---|---|
| **macOS** (Apple Silicon) | Apple Silicon (`arm64` / M1, M2, M3, M4) | **`.dmg`** | [⬇️ Unduh `.dmg` (Apple Silicon)](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/Nusa-Agent-0.1.0-mac-arm64.dmg) | Installer drag-and-drop resmi macOS |
| **macOS** (Apple Silicon) | Apple Silicon (`arm64`) | **`.zip`** | [⬇️ Unduh `.zip` (Portable)](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/Nusa-Agent-0.1.0-mac-arm64.zip) | Portable standalone bundle |
| **macOS** (Intel) | Intel 64-bit (`x64`) | **`.dmg`** | [⬇️ Unduh `.dmg` (Intel)](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/Nusa-Agent-0.1.0-mac-x64.dmg) | Installer macOS untuk Mac berbasis prosesor Intel |
| **macOS** (Intel) | Intel 64-bit (`x64`) | **`.zip`** | [⬇️ Unduh `.zip` (Intel)](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/Nusa-Agent-0.1.0-mac-x64.zip) | Portable standalone bundle untuk Mac Intel |
| **Windows** | 64-bit (`x64`) | **`.exe` (Installer)** | [⬇️ Unduh Setup `.exe`](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/Nusa-Agent-0.1.0-win-x64.exe) | Setup wizard installer untuk Windows 10 & 11 |
| **Windows** | 64-bit (`x64`) | **`.exe` (Portable)** | [⬇️ Unduh Portable `.exe`](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/Nusa-Agent-0.1.0-win-x64-portable.exe) | Single executable siap pakai tanpa instalasi |
| **Linux** (Universal) | 64-bit (`x64`) | **`.AppImage`** | [⬇️ Unduh `.AppImage`](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/Nusa-Agent-0.1.0-linux-x64.AppImage) | Universal Linux binary (Ubuntu, Fedora, Arch, dll.) |
| **Linux** (Debian/Ubuntu) | 64-bit (`x64`) | **`.deb`** | [⬇️ Unduh `.deb` Package](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/Nusa-Agent-0.1.0-linux-x64.deb) | Paket instalasi Debian, Ubuntu, Linux Mint |
| **Linux** (Tarball) | 64-bit (`x64`) | **`.tar.gz`** | [⬇️ Unduh `.tar.gz`](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/Nusa-Agent-0.1.0-linux-x64.tar.gz) | Arsip biner mandiri untuk distribusi Linux lainnya |

> 🔒 **Verifikasi Integritas**: Seluruh checksum SHA-256 rilis dapat dicocokkan melalui berkas [`checksums.txt`](https://github.com/ARAEMXA26/Nusa-Agent/releases/download/v0.1.0/checksums.txt).

---

## 🚀 Panduan Instalasi Cepat Per Perangkat

### 🍎 macOS
1. Unduh file `.dmg` sesuai prosesor Mac Anda (Apple Silicon `arm64` untuk chip seri M, atau Intel `x64`).
2. Buka berkas `.dmg` dan seret ikon **Nusa Agent** ke folder **Applications**.
3. Jika muncul peringatan keamanan macOS Gatekeeper saat pertama kali dibuka, berikan izin di *System Settings > Privacy & Security* atau jalankan perintah di terminal:
   ```bash
   xattr -cr "/Applications/Nusa Agent.app"
   ```

### 🪟 Windows (10 & 11)
1. Unduh installer `Nusa-Agent-0.1.0-win-x64.exe` atau versi `portable.exe`.
2. Jalankan berkas `.exe` dan ikuti petunjuk wizard untuk membuat shortcut di Desktop dan Start Menu.
3. Aplikasi siap dijalankan langsung.

### 🐧 Linux
**Menggunakan AppImage (Universal)**:
```bash
chmod +x Nusa-Agent-0.1.0-linux-x64.AppImage
./Nusa-Agent-0.1.0-linux-x64.AppImage
```

**Menggunakan Debian Package (.deb)**:
```bash
sudo dpkg -i Nusa-Agent-0.1.0-linux-x64.deb
sudo apt-get install -f # jika membutuhkan pemenuhan dependensi
```

---

## 🌟 Apa itu Nusa Agent?

**Nusa Agent** adalah command center agen AI otonom *local-first* yang dirancang untuk mengendalikan tugas-tugas rekayasa perangkat lunak secara otomatis tanpa mengorbankan privasi kode dan kendali keamanan sistem.

Sistem memisahkan tanggung jawab secara tegas antara:
- **Desktop Shell (Electron + React + Tailwind)**: Antarmuka visual yang responsif, menyajikan timeline eksekusi langsung, persetujuan diff interaktif (*Human-in-the-loop*), visualisasi DAG sub-agen, inspeksi sandbox browser DOM-first, manajemen memori jangka panjang, dan plugin marketplace.
- **Agent Gateway & Daemon (FastAPI + AsyncIO + SQLite WAL)**: Server agen lokal berperforma tinggi yang mengeksekusi siklus penalaran, dispatching tool dengan izin ketat (*Canonical Path Jail*), dan koordinasi multi-agent workforce.

---

## 🛡️ Fitur Unggulan Arsitektur

### 1. Keamanan Berlapis & Zero-Trust Sandboxing
- **Canonical Path Jail (`PathJail.resolve_safe()`)**: Mencegah serangan path traversal (`../`) dan symlink escape keluar dari direktori workspace proyek.
- **Tiga Tingkat Kebijakan Akses (`DENY > ASK > ALLOW`)**:
  - `DENY`: Memblokir mutlak akses berkas di luar workspace dan perintah sistem berbahaya.
  - `ASK`: Operasi tulis berkas (`file_write`, `file_patch`), mutasi jaringan, dan eksekusi shell wajib meminta persetujuan manusia secara eksplisit di antarmuka desktop.
  - `ALLOW`: Operasi baca aman di dalam batas workspace.

### 2. Multi-Agent Workforce & Parallel DAG Execution
- **Spesialisasi Agen**: Terbagi menjadi peran **Planner** (dekomposisi tugas), **Coder** (implementasi kode), **Reviewer** (audit keamanan kode), dan **Verifier** (eksekusi testing nyata).
- **Git Worktree Isolation**: Setiap sub-agen coder bekerja pada isolated git worktree (`.nusa/worktrees/wt-...`). Perubahan hanya di-merge ke branch utama jika tahap Verifier membuktikan seluruh test lulus 100%.

### 3. Progressive Skills Hub & MCP Client
- **Progressive Context Disclosure**: Penyingkatan token instruksi agen hingga 85% dengan memuat metadata ringan pada system prompt dan hanya membuka instruksi mendalam saat skill dipanggil secara aktif.
- **Model Context Protocol (MCP)**: Dukungan transport JSON-RPC `stdio` dan `http` dengan pemuatan tool dinamis secara *deferred*.
- **Static Security Scanner**: Memeriksa file skill terhadap injeksi prompt dan eksfiltrasi rahasia sebelum dieksekusi.

### 4. Headless Browser Sandbox & Scoped Computer-Use
- **DOM-First Accessibility Automation**: Otomasi Playwright Chromium yang mengutamakan tree accessibility DOM berbasis teks bersih untuk efisiensi token tanpa keharusan mengirim screenshot visual besar ke LLM.
- **SSRF & Network Shield**: Memblokir skema berbahaya (`file://`, `data:`), loopback internal (`127.0.0.1`), metadata cloud AWS/GCP, dan subnet privat.

### 5. Long-Term Memory, Scoped Profiles & Cron Scheduler
- **Dual Persistence Memory**: Menyimpan preferensi di berkas Markdown human-readable (`USER.md`, `MEMORY.md`) sekaligus terindeks dalam SQLite WAL untuk pencarian FTS cepat.
- **Scoped Profiles & Cross-Profile Soft Guard**: Profil terisolasi (`default`, `researcher`, `security-auditor`) dengan pencegahan akses berkas antar-profil.
- **Asynchronous Cron Scheduler**: Penjadwalan tugas agentik background berbasis sintaks cron 5-kolom standar (`@hourly`, `@daily`, `interval:60`) dengan riwayat audit lengkap.

### 6. Plugin Marketplace, Cryptographic Signing & AST Scanner
- **Ed25519 Signatures & SHA-256 Checksums**: Verifikasi integritas kriptografis pada setiap plugin untuk mencegah *tampering* dan injeksi kode pihak ketiga.
- **Deep AST Static Security Scanner**: Parser Abstract Syntax Tree (AST) Python yang memindai kode sebelum instalasi dan memblokir otomatis panggilan berbahaya (`eval`, `exec`, `os.system`, `subprocess(shell=True)`, dan pencurian kredensial `.ssh` / `.aws`).

### 7. Multi-Platform Packaging & Auto-Updates
- Bundling terpadu untuk macOS, Windows, dan Linux melalui `electron-builder`.
- Manajemen otomatis proses daemon Gateway Python tanpa meninggalkan proses zombie.
- Panel *About & Auto-Update* di UI desktop untuk memeriksa dan mengunduh pembaruan terbaru langsung dari GitHub Releases.

---

## 🗺️ Status Roadmap Pengembangan

| Fase | Deskripsi Fitur Utama | Status |
|---|---|---|
| **Phase 0** | Discovery, PRD, Arsitektur, Model Ancaman, Data Model SQLite WAL, Protokol WebSocket/REST, ADR | **SELESAI** |
| **Phase 1** | Thin Vertical Slice: Safe File Tools, Canonical Path Jail, Persetujuan Manual, Test Verification, Diff Artifacts | **SELESAI** |
| **Phase 2** | Agent Skills Hub, MCP Client Manager, Progressive Disclosure (Hemat Token), Static AST Security Scanner | **SELESAI** |
| **Phase 3** | Multi-Agent Workforce: Planner, Coder, Reviewer, Verifier DAG, Parallel Subtasks, Git Worktree Isolation | **SELESAI** |
| **Phase 4** | Headless Browser Sandbox (Playwright DOM-First), Accessibility Tree, Scoped Computer-Use (Click, Type, Nav) | **SELESAI** |
| **Phase 5** | Long-Term Memory (Dual Markdown + SQLite WAL, FTS Search), Scoped Profiles, Background Cron Scheduler | **SELESAI** |
| **Phase 6** | Plugin Marketplace, Tanda Tangan Kriptografi Ed25519, SHA-256 Tamper Detection, Deep AST Security Auditor | **SELESAI** |
| **Phase 7** | Multi-Platform Packaging (macOS DMG, Windows EXE, Linux AppImage/deb), In-App Auto-updater, CI/CD Actions | **SELESAI** |

---

## 🛠️ Menjalankan dari Source (Mode Pengembang)

### Prasyarat:
- Python `>= 3.11`
- Node.js `>= 20` & npm `>= 10`

### 1. Clone Repositori
```bash
git clone https://github.com/ARAEMXA26/Nusa-Agent.git
cd Nusa-Agent
```

### 2. Setup & Jalankan Gateway Server (Backend)
```bash
cd gateway
python3 -m venv .venv
source .venv/bin/activate # Pada Windows: .venv\Scripts\activate
pip install -e .
uvicorn nusa.main:app --host 127.0.0.1 --port 4141 --reload
```

### 3. Setup & Jalankan Desktop Shell (Frontend)
Pada terminal baru:
```bash
cd desktop
npm install
npm run dev
```

### 4. Menjalankan Seluruh Test Suite
```bash
cd gateway
source .venv/bin/activate
pytest -v
```

### 5. Membangun Paket Distribusi Mandiri
```bash
./scripts/package_release.sh
```

---

## 📄 Lisensi

Nusa Agent dilisensikan di bawah lisensi terbuka [Apache License 2.0](LICENSE).
