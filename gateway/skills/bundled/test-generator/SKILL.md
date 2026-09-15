---
name: Test Generator
description: Membuat test case relevan dan menjalankan verifikasi dengan test runner nyata.
version: 1.0.0
allowed_tools: [file_read, file_search, file_write, file_patch, run_test]
tags: [testing, verification, tdd]
---

# Test Generator

## Purpose
Menghasilkan unit test, integration test, dan assertion deterministik menggunakan runner nyata.

## Trigger Conditions
- Modul baru dibuat dan membutuhkan cakupan pengujian komprehensif.
- Bug dilaporkan dan membutuhkan test reproduksi untuk regresi (TDD).
- Pengguna meminta peningkatan code coverage pada repositori.

## Do Not Use When
- Membuat mock pengujian dummy yang selalu lulus tanpa memvalidasi logika nyata.
- Menghapus pengujian lama yang gagal alih-alih memperbaiki kode.

## Inputs
- Berkas target yang akan diuji
- Test framework yang digunakan (pytest, vitest, jest).

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`file_read, file_search, file_write, file_patch, run_test`

## Workflow
1. Baca implementasi fungsi dan identifikasi edge cases, validasi parameter, dan error conditions.
2. Tulis skenario pengujian ke dalam berkas test sesuai konvensi proyek.
3. Jalankan `run_test` untuk mengeksekusi runner secara nyata.
4. Pastikan semua pengujian lulus dan laporkan hasil pengujian.

## Safety and Approval Gates
- Hanya menulis di direktori test workspace. Tidak menghapus test yang sudah ada.

## Verification
- Verifikasi bahwa command `run_test` menghasilkan exit code 0.

## Output Contract
- Berkas test yang valid dan laporan hasil eksekusi runner.

## Failure Handling
- Jika test gagal, analisis stack trace dan sesuaikan assertion atau laporkan bug kode.
