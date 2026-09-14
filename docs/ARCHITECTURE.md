# System Architecture — Nusa Agent

```text
+-------------------------------------------------------------------------+
|                              Desktop Shell                              |
|   (Electron + React 18 + TypeScript + Vite + Tailwind CSS + Lucide)     |
|                                                                         |
|  [Sidebar]  [Timeline & Chat]  [Agent Manager]  [Artifact & Diff Panel] |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Context-isolated Secure IPC Bridge (preload.ts / webSocketClient) |  |
+--+-------------------------------------------------------------------+--+
                                  |
                                  | Typed JSON-RPC / WebSocket & REST
                                  v
+-------------------------------------------------------------------------+
|                       Local Agent Gateway / Daemon                      |
|                  (Python 3.13 + FastAPI + AsyncIO)                      |
|                                                                         |
|  +-----------------------+ +--------------------+ +------------------+  |
|  | Task & Event Service  | | Session & Project  | | Model Router     |  |
|  | (Finite State Machine)| | Manager            | | (Multi-Provider) |  |
|  +-----------------------+ +--------------------+ +------------------+  |
|  +-----------------------+ +--------------------+ +------------------+  |
|  | Policy & Approval     | | Artifact & Diff    | | Memory Service   |  |
|  | Engine (deny>ask>allow) | Manager            | | (Scoped Memory)  |  |
|  +-----------------------+ +--------------------+ +------------------+  |
|  +-----------------------+ +--------------------+ +------------------+  |
|  | Audit & Redaction     | | Skill & Plugin     | | MCP Client       |  |
|  | Logger                | | Loader             | | Manager          |  |
|  +-----------------------+ +--------------------+ +------------------+  |
|                                                                         |
|  [SQLite Engine (WAL, PRAGMA foreign_keys, schema migrations)]          |
+-------------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------------+
|                             Execution Plane                             |
|                                                                         |
|  [Restricted Local Worker]        [Git Worktree Sandbox]                |
|  (Path jail, canonicalized paths) (Clean branch separation)             |
|                                                                         |
|  [Docker Sandbox Worker (opt)]    [Browser Worker (Playwright/CDP)]     |
+-------------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------------+
|                              Capabilities                               |
|                                                                         |
|  * Native Tools (read, patch, write, list, search, run_test, shell)     |
|  * MCP Protocol Tools (stdio / SSE)                                     |
|  * Agent Skills (progressive SKILL.md specs)                            |
|  * Provider APIs (OpenAI, Anthropic, Gemini, Ollama, OpenRouter)        |
+-------------------------------------------------------------------------+
```

## 1. Architectural Tiers

### 1.1 Desktop Shell (`desktop/`)
- Dibangun dengan Electron + React + TypeScript + Vite.
- Menggunakan preload script dengan `contextIsolation: true` dan `nodeIntegration: false`.
- IPC hanya menyediakan fungsi yang dibatasi (buka direktori sistem, buka window baru, relay koneksi ke gateway).
- Seluruh komunikasi data agent menggunakan WebSocket / JSON-RPC yang terstandarisasi. Ini memungkinkan UI berjalan baik di dalam Electron app maupun via browser web biasa saat debugging.

### 1.2 Local Agent Gateway (`gateway/`)
- Daemon lokal independen berbasis Python 3.13 + FastAPI + AsyncIO.
- Keunggulan memilih Python untuk gateway:
  1. Ekosistem pemrosesan AI, patch, diffing, Pydantic data validation, dan process sandboxing yang sangat matang.
  2. Kemudahan integrasi dengan model lokal (Ollama / HuggingFace) dan adapter LLM resmi.
  3. Portable execution engine untuk eksekusi skrip, compiler, dan linters.
- Komunikasi dua arah real-time via WebSocket:
  - Event streaming (chunk pesan, perubahan status task, log tool execution, request approval).
  - Client commands (create task, approve tool, send steering message, cancel task).

### 1.3 Execution Plane
- **Restricted Local Worker**:
  - Validasi ketat batas direktori project (canonical path checking via `os.path.realpath` / `pathlib.Path.resolve()`).
  - Mencegah symlink attack dan directory traversal (`../`).
  - Shell commands dijalankan dengan subprocess async, timeout eksplisit, dan isolasi cwd.
- **Git Worktree Sandbox**:
  - Isolasi sub-agent pada branch/worktree terpisah untuk mencegah race condition antar agent.

### 1.4 Capabilities & Tools
- Registry tools berbasis skema JSON Schema.
- Setiap tool dipetakan ke policy engine sebelum dieksekusi.
- Hasil tool output melewati data redactor (menghapus potensi kebocoran token/kunci API) sebelum dimasukkan ke context window model.
