---
name: Skill Creator
description: Membuat, memvalidasi, menguji, dan mengemas skill Nusa Agent baru.
version: 1.0.0
allowed_tools: [file_read, file_write, file_patch, skill_validate, skill_test]
tags: [skills, authoring, extensions]
---

# Skill Creator

## Purpose
Membangun skill baru yang mematuhi standar manifest `skill.json` dan kontrak 10 bab `SKILL.md`.

## Trigger Conditions
- Pengguna ingin membuat kapabilitas skill kustom baru.
- Kebutuhan validasi manifest skill sebelum diaktifkan.
- Pengujian integritas folder skill.

## Do Not Use When
- Membuat skill dengan izin berlebihan atau instruksi yang melanggar kebijakan keamanan.

## Inputs
- ID skill
- Deskripsi dan tujuan
- Daftar tools yang dibutuhkan
- Instruksi kerja.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`file_read, file_write, file_patch, skill_validate, skill_test`

## Workflow
1. Buat struktur folder `skills/user/<skill-id>` dengan subdirektori terkait.
2. Susun manifest `skill.json` yang mematuhi `SkillManifest` schemaVersion 1.
3. Tulis `SKILL.md` lengkap mencakup seluruh 10 bab kontrak wajib.
4. Jalankan `skill_validate` dan `skill_test` untuk memastikan lulus audit keamanan.
5. Minta persetujuan pengguna sebelum menginstal atau mengaktifkan skill.

## Safety and Approval Gates
- Instalasi skill baru dan publikasi membutuhkan konfirmasi persetujuan pengguna.

## Verification
- Pastikan scanner keamanan mengembalikan status `passed` dengan risk_score rendah.

## Output Contract
- Paket skill baru yang terverifikasi dan siap digunakan.

## Failure Handling
- Bila validasi gagal, tampilkan daftar error manifest atau bab kontrak yang kurang.
