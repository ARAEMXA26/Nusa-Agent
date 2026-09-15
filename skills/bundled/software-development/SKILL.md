---
name: Software Development
description: Membaca, menambah, mengedit, menghapus, mencari, dan memverifikasi source code.
version: 1.0.0
allowed_tools: [file_read, file_list, file_search, symbol_search, file_write, file_patch, run_command]
tags: [coding, files, implementation]
---

# Software Development

## Purpose
Mengimplementasikan fitur perangkat lunak, perbaikan bug, refaktorisasi arsitektur, dan integrasi modul.

## Trigger Conditions
- Instruksi penulisan kode, penambahan fitur baru, atau debugging aplikasi.
- Perubahan struktur berkas dan implementasi komponen.
- Refactoring kode yang ada di workspace.

## Do Not Use When
- Review pasif tanpa niat melakukan modifikasi kode.
- Menghapus berkas sistem operasi atau file di luar batas workspace.

## Inputs
- Spesifikasi fitur / bug report
- Path berkas target
- Konvensi arsitektur proyek.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`file_read, file_list, file_search, symbol_search, file_write, file_patch, run_command`

## Workflow
1. Pindai simbol dan berkas terkait menggunakan `file_search` dan `symbol_search`.
2. Baca berkas lengkap menggunakan `file_read` sebelum melakukan perubahan apa pun.
3. Terapkan modifikasi presisi dengan `file_patch` atau buat berkas baru dengan `file_write`.
4. Jalankan kompilasi atau linter dengan `run_command` untuk memastikan sintaks bersih.

## Safety and Approval Gates
- Penghapusan berkas atau penulisan di luar workspace wajib mendapat persetujuan pengguna.

## Verification
- Lakukan pengecekan build dan typecheck segera setelah pengeditan kode.

## Output Contract
- Daftar berkas yang diubah beserta ringkasan implementasi dan status build.

## Failure Handling
- Jika build gagal, baca traceback lengkap dan pulihkan file atau perbaiki secara sistematis.
