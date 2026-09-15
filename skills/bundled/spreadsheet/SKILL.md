---
name: Spreadsheet Analyst
description: Membuat dan menganalisis workbook, formula, tabel, chart, serta validasi kalkulasi.
version: 1.0.0
allowed_tools: [spreadsheet_read, spreadsheet_write, spreadsheet_recalculate, spreadsheet_render]
tags: [spreadsheet, xlsx, data]
---

# Spreadsheet Analyst

## Purpose
Pengolahan berkas spreadsheet (.xlsx/.csv), penulisan formula matematika/keuangan, dan rekapitulasi data.

## Trigger Conditions
- Analisis laporan keuangan, data penjualan, atau inventaris berbasis sheet.
- Pembuatan workbook Excel baru dengan formula otomatis (SUM, VLOOKUP, INDEX/MATCH).
- Validasi kalkulasi tabel numerik.

## Do Not Use When
- Dataset masif multi-gigabyte yang memerlukan database relasional SQL.

## Inputs
- Data mentah
- Struktur kolom
- Formula yang diinginkan.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`spreadsheet_read, spreadsheet_write, spreadsheet_recalculate, spreadsheet_render`

## Workflow
1. Baca sheet yang ada menggunakan `spreadsheet_read`.
2. Olah data, perbaiki formula, atau tambahkan sheet baru.
3. Tulis kembali perubahan dengan `spreadsheet_write`.
4. Jalankan `spreadsheet_recalculate` untuk memvalidasi kebenaran kalkulasi.

## Safety and Approval Gates
- Mencegah injeksi macro VBA atau skrip eksternal yang mencurigakan.

## Verification
- Verifikasi bahwa tidak ada error formula seperti `#REF!`, `#VALUE!`, atau `#DIV/0!`.

## Output Contract
- Berkas workbook .xlsx yang valid dengan formula fungsional.

## Failure Handling
- Jika formula error, evaluasi urutan komputasi dan perbaiki referensi cell.
