---
name: Automation Scheduler
description: Membuat, melihat, mengubah, menjeda, dan menghapus pekerjaan terjadwal.
version: 1.0.0
allowed_tools: [automation_list, automation_create, automation_update, automation_delete]
tags: [automation, schedule, monitor]
---

# Automation Scheduler

## Purpose
Manajemen otomasi latar belakang Nusa Agent, cron jobs berulang, dan tugas monitoring terjadwal.

## Trigger Conditions
- Pengguna ingin menjalankan tugas secara berkala (misal: harian, mingguan, per jam).
- Pemeriksaan status cron job yang sedang aktif.
- Penghentian atau penghapusan jadwal otomatisasi.

## Do Not Use When
- Menjadwalkan eksekusi skrip berbahaya tanpa persetujuan.

## Inputs
- Ekspresi cron (cron expression)
- Prompt tugas
- Profile target.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`automation_list, automation_create, automation_update, automation_delete`

## Workflow
1. Periksa jadwal yang sudah ada menggunakan `automation_list`.
2. Validasi sintaksis ekspresi cron dan estimasikan waktu eksekusi berikutnya.
3. Minta persetujuan pengguna untuk membuat atau mengubah jadwal.
4. Daftarkan jadwal dengan `automation_create` dan pastikan status aktif.

## Safety and Approval Gates
- Pembuatan, aktivasi, dan penghapusan jadwal memerlukan human approval eksplisit.

## Verification
- Hitung waktu `next_run_at` dan pastikan tersimpan dalam database cron.

## Output Contract
- ID automasi, jadwal cron yang aktif, dan ringkasan prompt tugas.

## Failure Handling
- Bila ekspresi cron tidak valid, beri saran format standar 5-field.
