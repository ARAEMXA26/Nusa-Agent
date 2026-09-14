# Decision Log — Nusa Agent

| ID | Tanggal | Keputusan | Rasional / Trade-off |
|---|---|---|---|
| **DEC-001** | 2026-09-14 | Menggunakan nama kode aplikasi `Nusa Agent` | Sesuai rekomendasi default prompt untuk command center agent desktop. |
| **DEC-002** | 2026-09-14 | Lisensi Core: Apache-2.0 | Menjamin keterbukaan, perlindungan paten timbal-balik, dan kompatibilitas ekosistem OSS. |
| **DEC-003** | 2026-09-14 | Arsitektur decoupled (Electron Shell + Python FastAPI Gateway) | Memisahkan UI presentation layer dari control plane AI dan execution plane sistem, memudahkan testing headless, CLI, dan multi-platform packaging. |
| **DEC-004** | 2026-09-14 | Database SQLite dengan WAL mode | Ringan, local-first, zero configuration, performa tinggi, dan handal untuk persistensi task & audit trail. |
| **DEC-005** | 2026-09-14 | Zero-Trust Model Output & `deny > ask > allow` | Memastikan keamanan pengguna dari destructive actions, path traversal, dan prompt injection secara default. |
| **DEC-006** | 2026-09-14 | Testing & Verification Terintegrasi | Setiap patch kode diverifikasi oleh test runner lokal sebelum task dinyatakan selesai (Definition of Done). |
