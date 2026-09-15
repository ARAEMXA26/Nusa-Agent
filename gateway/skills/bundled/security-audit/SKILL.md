---
name: Security Audit
description: Memindai manifest, dependency, source code, secret exposure, permission, dan risiko supply chain.
version: 1.0.0
allowed_tools: [file_read, file_search, dependency_scan, secret_scan, static_analysis]
tags: [security, audit, compliance]
---

# Security Audit

## Purpose
Audit keamanan komprehensif terhadap repositori: celah injeksi, kebocoran secret, CVE dependency, dan permission.

## Trigger Conditions
- Sebelum rilis produksi atau sebelum penggabungan kode kritis.
- Pemeriksaan berkala atas paparan secret dan dependency rentan.
- Audit kesesuaian manifest dan policy guardrails.

## Do Not Use When
- Melakukan penyerangan aktif, eksploitasi berbahaya, atau port scanning eksternal.

## Inputs
- Target direktori atau repositori
- Standar kepatuhan yang digunakan.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`file_read, file_search, dependency_scan, secret_scan, static_analysis`

## Workflow
1. Jalankan `secret_scan` untuk menemukan kunci API, token, atau private key yang tidak sengaja ter-commit.
2. Periksa daftar dependensi dengan `dependency_scan` untuk mencocokkan database kerentanan.
3. Gunakan `static_analysis` untuk mendeteksi pola SQL injection, XSS, insecure deserialization.
4. Petakan temuan ke dalam matriks risiko (Critical, High, Medium, Low).

## Safety and Approval Gates
- Bersifat read-only sepenuhnya. Tidak mengubah file repositori.

## Verification
- Verifikasi temuan dengan membaca potongan kode spesifik menggunakan `file_read`.

## Output Contract
- Laporan audit keamanan lengkap dengan matriks keparahan dan rekomendasi perbaikan.

## Failure Handling
- Jika berkas terenkripsi atau berformat binary, tandai sebagai uninspected.
