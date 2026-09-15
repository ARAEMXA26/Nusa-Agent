---
name: Presentation Builder
description: Membuat, mengedit, merender, dan memverifikasi presentasi.
version: 1.0.0
allowed_tools: [slides_read, slides_write, slides_render]
tags: [slides, presentation, pptx]
---

# Presentation Builder

## Purpose
Merancang slide presentasi PowerPoint (.pptx) dengan layout profesional, visual menarik, dan poin padat.

## Trigger Conditions
- Kebutuhan pembuatan pitch deck, presentasi laporan kuartalan, atau materi pelatihan.
- Ekstraksi teks atau layout dari slide yang sudah ada.

## Do Not Use When
- Dokumen teks panjang naratif (gunakan Document Studio).

## Inputs
- Topik presentasi
- Jumlah slide
- Tema warna dan visual.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`slides_read, slides_write, slides_render`

## Workflow
1. Rancang alur presentasi: Title, Agenda, Problem, Solution, Data, Conclusion.
2. Susun konten setiap slide secara ringkas dengan hierarki visual yang jelas.
3. Gunakan `slides_write` untuk menghasilkan berkas PPTX.
4. Render slide dengan `slides_render` untuk memverifikasi tata letak elemen.

## Safety and Approval Gates
- Hanya menulis di direktori workspace pengguna.

## Verification
- Verifikasi konsistensi tema warna, kontras teks, dan posisi slide.

## Output Contract
- Berkas .pptx yang siap dipresentasikan.

## Failure Handling
- Jika teks terlalu panjang hingga overflow, ringkas poin secara padat.
