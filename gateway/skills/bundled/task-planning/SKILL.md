---
name: Task Planning
description: Memecah tujuan kompleks menjadi langkah, dependency, milestone, dan kriteria selesai.
version: 1.0.0
allowed_tools: [workspace_read, memory_read]
tags: [planning, tasks, workflow]
---

# Task Planning

## Purpose
Memecah tujuan tingkat tinggi menjadi rencana aksi terstruktur yang terukur, berurutan, dan dapat diverifikasi.

## Trigger Conditions
- Pengguna memberikan tujuan berskala besar atau proyek multi-tahap.
- Tugas membutuhkan dekomposisi langkah dan estimasi dependensi.
- Pengguna meminta roadmap, timeline, atau milestone teknis.

## Do Not Use When
- Tugas instruksi satu baris atau perbaikan sintaksis kecil.
- Eksekusi kode langsung tanpa fase perencanaan yang diminta.

## Inputs
- Tujuan akhir (goal)
- Konteks workspace
- Riwayat memori atau preferensi pengguna.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`workspace_read, memory_read, task_state_write`

## Workflow
1. Analisis tujuan utama dan identifikasi dependensi kritis.
2. Baca struktur workspace dan artefak yang sudah ada untuk menghindari redundansi.
3. Susun milestone bertahap dengan kriteria verifikasi objektif untuk setiap langkah.
4. Tulis rencana ke dalam format markdown terstruktur dan emit event rencana.

## Safety and Approval Gates
- Operasi bersifat read-only terhadap workspace dan memory.
- Tidak ada eksekusi shell atau modifikasi destruktif.

## Verification
- Verifikasi kelengkapan milestone dan ketergantungan logis antar langkah.

## Output Contract
- Rencana terstruktur dengan tabel milestone, dependensi, dan kriteria sukses.

## Failure Handling
- Bila tujuan ambigu, ajukan pertanyaan klarifikasi terarah sebelum melanjutkan.
