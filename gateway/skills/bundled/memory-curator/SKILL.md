---
name: Memory Curator
description: Memilih fakta yang layak disimpan, memperbarui memori, menghapus duplikasi, dan menghormati privasi.
version: 1.0.0
allowed_tools: [memory_read, memory_write, memory_delete]
tags: [memory, context, personalization]
---

# Memory Curator

## Purpose
Kurasi memori jangka panjang agent, menyimpan preferensi pengguna, menghapus memori basi, dan menjaga privasi.

## Trigger Conditions
- Pengguna menyatakan preferensi berulang (misal: gaya coding, stack favorit).
- Ditemukan fakta penting tentang arsitektur proyek yang perlu diingat lintas percakapan.
- Pembersihan memori usang atau inkonsisten.

## Do Not Use When
- Menyimpan password, PIN, token rahasia, atau data pribadi sensitif (PII).
- Menghapus memori tanpa verifikasi relevansi.

## Inputs
- Kunci memori (key)
- Nilai fakta (value)
- Scope (global / project).

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`memory_read, memory_write, memory_delete`

## Workflow
1. Cari memori yang relevan menggunakan `memory_read` untuk mendeteksi duplikasi.
2. Filter data sensitif sesuai kebijakan privasi Nusa Agent.
3. Tulis fakta ringkas dan esensial ke memori persisten dengan `memory_write`.
4. Hapus entri memori yang sudah tidak berlaku menggunakan `memory_delete`.

## Safety and Approval Gates
- Penyimpanan data sensitif dan penghapusan memori membutuhkan approval pengguna.

## Verification
- Pastikan entri tersimpan dapat dicari kembali melalui pencarian semantik/kunci.

## Output Contract
- Konfirmasi entri memori yang diperbarui atau dihapus.

## Failure Handling
- Jika terjadi konflik fakta, prioritaskan instruksi pengguna paling baru.
