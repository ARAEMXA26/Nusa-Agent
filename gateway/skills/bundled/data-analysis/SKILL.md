---
name: Data Analysis
description: Membersihkan, menganalisis, memvisualisasikan, dan memvalidasi dataset secara reproducible.
version: 1.0.0
allowed_tools: [file_read, data_query, python_sandbox, chart_render]
tags: [analysis, statistics, visualization]
---

# Data Analysis

## Purpose
Analisis data kuantitatif, eksplorasi statistik, pembuatan chart visual, dan perumusan wawasan analitik.

## Trigger Conditions
- Dataset CSV, JSON, atau SQLite perlu dieksplorasi dan diringkas.
- Pengguna ingin mengetahui tren, anomali, korelasi, atau metrik utama.
- Kebutuhan pembuatan grafik visual statistik.

## Do Not Use When
- Menjalankan kode Python tanpa sandbox atau mengakses jaringan luar.

## Inputs
- Path dataset
- Pertanyaan analitik
- Tipe chart yang diinginkan.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`file_read, data_query, python_sandbox, chart_render`

## Workflow
1. Pindai skema dan sampel data awal menggunakan `file_read` atau `data_query`.
2. Tulis skrip komputasi analitik di dalam `python_sandbox` untuk agregasi data bersih.
3. Hasilkan representasi visual dengan `chart_render`.
4. Sajikan ringkasan wawasan bisnis dan interpretasi statistik.

## Safety and Approval Gates
- Eksekusi Python dibatasi pada sandbox terisolasi tanpa akses filesystem host.

## Verification
- Verifikasi angka statistik dasar (mean, median, count) terhadap data mentah.

## Output Contract
- Laporan analitik dilengkapi grafik visual dan ringkasan eksekutif.

## Failure Handling
- Jika terdapat data null atau korup, lakukan pembersihan dan dokumentasikan asumsi.
