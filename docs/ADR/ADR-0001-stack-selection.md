# ADR 0001: Pemilihan Stack Desktop Shell dan Agent Gateway

## Status
Accepted

## Konteks
Nusa Agent memerlukan arsitektur desktop multi-platform (macOS, Windows, Linux) yang terintegrasi dengan runtime agent yang tangguh, aman, dan dapat mengeksekusi operasi sistem, file patching, compiler/test runner, serta integrasi LLM multi-provider.

## Opsi yang Dipertimbangkan
1. **Desktop Shell**:
   - **Opsi A: Electron + React + TypeScript + Vite**.
     - *Kelebihan*: Ekosistem komponen UI paling kaya (diff viewer, terminal xterm, syntax highlighting), API OS matang (multi-window, clipboard, tray, notification), dukungan lintas OS stabil, time-to-market cepat untuk vertical slice.
     - *Kekurangan*: Footprint memori lebih besar dibanding Rust/Tauri.
   - **Opsi B: Tauri (Rust) + React**.
     - *Kelebihan*: Ukuran binary kecil, konsumsi memori rendah.
     - *Kekurangan*: Tooling windowing dan debugging lebih lambat diiterasi; integrasi child process supervisor membutuhkan boilerplate Rust tambahan.

2. **Local Agent Gateway**:
   - **Opsi A: Python 3.13 + FastAPI + AsyncIO**.
     - *Kelebihan*: Bahasa standar emas untuk ekosistem AI/LLM, AST parsing, diff handling, Pydantic type validation, tool scripting, dan interoperabilitas dengan library AI lokal/evals.
     - *Kekurangan*: Memerlukan runtime Python pada host (dapat di-bundle menggunakan PyInstaller / standalone interpreter).
   - **Opsi B: Node.js / TypeScript**.
     - *Kelebihan*: Satu bahasa dengan desktop UI.
     - *Kekurangan*: Library untuk file diffing, patching, AST analysis, dan integrasi ekosistem AI lokal tidak selengkap dan sefleksibel Python.

## Keputusan
1. **Desktop Shell**: Menggunakan **Electron + React + TypeScript + Vite + Tailwind CSS**. Ini memberikan kecepatan iterasi maksimum, UI komponen modern kelas satu, dan keandalan lintas OS (macOS/Windows/Linux).
2. **Local Agent Gateway**: Menggunakan **Python 3.13 + FastAPI + AsyncIO + Uvicorn + SQLite**. Gateway berjalan sebagai daemon independen dengan WebSocket / JSON-RPC bus.
3. Arsitektur decoupled (Desktop <-> WebSocket <-> Gateway) memungkinkan UI dijalankan baik sebagai native app (Electron) maupun Web preview di browser lokal, serta memungkinkan CLI mandiri di masa depan.

## Konsekuensi
- Packaging distribusi produksi akan memaketkan runtime Python gateway bersama binary Electron.
- Komunikasi antara UI dan Gateway sepenuhnya berbasis typed JSON protocol.
