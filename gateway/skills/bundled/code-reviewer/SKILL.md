---
name: Code Reviewer
description: Meninjau diff untuk bug, regresi, kerentanan, dan masalah maintainability.
version: 1.0.0
allowed_tools: [file_read, file_list, file_search, git_status, git_diff]
tags: [review, security, quality]
---

# Code Reviewer

## Purpose
Melakukan penelaahan kode secara pasif dan objektif untuk menjamin kualitas, keamanan, dan kebersihan arsitektur.

## Trigger Conditions
- Pengguna meminta peninjauan branch, pull request, atau git diff sebelum commit.
- Audit kualitas kode dan deteksi kemungkinan regresi logis.
- Pemeriksaan kepatuhan gaya penulisan dan standar arsitektur.

## Do Not Use When
- Melakukan penulisan atau perbaikan kode langsung (gunakan skill software-development).
- Menjalankan skrip eksekusi yang berpotensi mutatif.

## Inputs
- Target diff atau rentang commit
- Kriteria tinjauan (keamanan, performa, maintainability).

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`file_read, file_list, file_search, git_status, git_diff`

## Workflow
1. Periksa status repositori dan dapatkan diff perubahan dengan `git_diff`.
2. Baca berkas konteks asal menggunakan `file_read` untuk memahami dampak perubahan.
3. Identifikasi potensi memory leak, race condition, kerentanan injeksi, atau regresi logic.
4. Format temuan ke dalam ulasan terstruktur berdasar tingkat keparahan.

## Safety and Approval Gates
- Skill ini strictly read-only. Tidak ada izin penulisan atau eksekusi mutatif.

## Verification
- Pastikan setiap komentar review merujuk pada nomor baris dan berkas yang valid.

## Output Contract
- Laporan tinjauan kode terstruktur: Temuan Kritis, Peringatan, dan Rekomendasi.

## Failure Handling
- Jika diff kosong, informasikan bahwa workspace bersih tanpa perubahan pending.
