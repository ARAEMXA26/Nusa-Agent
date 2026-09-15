---
name: Multi-Agent Orchestration
description: Mendelegasikan subtask independen, menyatukan hasil, mengelola status dan konflik.
version: 1.0.0
allowed_tools: [agent_spawn, agent_message, agent_wait, agent_stop]
tags: [agents, delegation, parallel]
---

# Multi-Agent Orchestration

## Purpose
Mengatur orkestrasi sub-agent paralel, agregasi deliverable, sinkronisasi state, dan penanganan konflik.

## Trigger Conditions
- Tugas memiliki cabang investigasi atau pembangunan yang dapat diparalelisasi.
- Dibutuhkan spesialisasi peran (misal: Researcher, Builder, Verifier).
- Pengguna meminta eksekusi tim agent independen.

## Do Not Use When
- Tugas sekuensial sederhana yang cukup diselesaikan oleh satu agent.
- Kondisi resource atau token budget sangat terbatas.

## Inputs
- Subtask definitions
- Role assignment
- Budget constraints.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`agent_spawn, agent_message, agent_wait, agent_stop`

## Workflow
1. Tentukan subtask terisolasi yang tidak memiliki race condition.
2. Spawn sub-agent dengan role yang sesuai dan konteks minimal yang dibutuhkan.
3. Monitor status subtask secara asinkron hingga deliverable diterima.
4. Gabungkan output, selesaikan konflik jika ada, dan hentikan sub-agent yang selesai.

## Safety and Approval Gates
- Persetujuan wajib jika alokasi agent melebihi ambang batas biaya atau concurrency.

## Verification
- Pastikan setiap sub-agent melaporkan status terminal sukses sebelum agregasi.

## Output Contract
- Laporan konsolidasi hasil kerja seluruh sub-agent beserta metrik waktu eksekusi.

## Failure Handling
- Jika sub-agent gagal atau timeout, coba delegasikan ulang sekali atau lanjutkan dengan fallback.
