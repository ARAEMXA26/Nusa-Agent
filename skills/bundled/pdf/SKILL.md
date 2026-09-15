---
name: PDF Studio
description: Membaca, membuat, menggabungkan, mengisi, merender, dan memeriksa PDF.
version: 1.0.0
allowed_tools: [pdf_read, pdf_write, pdf_render, file_read, file_write]
tags: [pdf, forms, render]
---

# PDF Studio

## Purpose
Ekstraksi teks, penggabungan halaman, pengisian form, dan rendering halaman dokumen PDF.

## Trigger Conditions
- Pengguna ingin membaca konten laporan atau invoice berformat PDF.
- Kebutuhan konversi dokumen atau pembuatan berkas PDF publikasi.
- Pemeriksaan teks dan metadata pada berkas PDF.

## Do Not Use When
- Dokumen yang membutuhkan editing tabel dinamis secara simultan.

## Inputs
- Path berkas PDF
- Halaman target
- Konten yang akan dikonversi.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`pdf_read, pdf_write, pdf_render, file_read, file_write`

## Workflow
1. Gunakan `pdf_read` untuk mengekstrak teks, metadata, dan jumlah halaman.
2. Jika membuat PDF baru, susun layout dan simpan dengan `pdf_write`.
3. Gunakan `pdf_render` untuk menghasilkan gambar pratinjau halaman.
4. Verifikasi keterbacaan teks dan posisi margin.

## Safety and Approval Gates
- Tidak mengeksekusi JavaScript yang mungkin tersemat dalam berkas PDF.

## Verification
- Pastikan file PDF memiliki header `%PDF-` yang valid.

## Output Contract
- Berkas PDF yang valid atau teks hasil ekstraksi per halaman.

## Failure Handling
- Bila berkas terenkripsi dengan password, minta password kepada pengguna.
