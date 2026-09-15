---
name: Document Studio
description: Membaca, membuat, mengedit, merender, dan memverifikasi dokumen DOCX.
version: 1.0.0
allowed_tools: [document_read, document_write, document_render, file_read, file_write]
tags: [document, docx, writing]
---

# Document Studio

## Purpose
Pembuatan dan manipulasi berkas dokumen pengolah kata (.docx) dengan format rapi dan tipografi profesional.

## Trigger Conditions
- Kebutuhan membuat laporan bisnis, SOP, proposal, atau dokumen teknis berformat Word.
- Pembacaan dan ekstraksi teks dari berkas .docx yang ada di workspace.

## Do Not Use When
- Dokumen yang seharusnya berupa slide presentasi atau spreadsheet numerik.

## Inputs
- Konten dokumen
- Heading hierarchy
- Tabel dan styling.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`document_read, document_write, document_render, file_read, file_write`

## Workflow
1. Baca dokumen referensi jika memodifikasi dokumen yang ada.
2. Susun struktur heading, paragraf, daftar berpoin, dan tabel.
3. Gunakan `document_write` untuk menghasilkan berkas DOCX valid.
4. Render pratinjau dokumen dengan `document_render` jika diperlukan verifikasi visual.

## Safety and Approval Gates
- File hanya ditulis di dalam ruang kerja workspace.

## Verification
- Verifikasi keutuhan format OpenXML berkas hasil pembuatan.

## Output Contract
- Berkas .docx yang valid dan dapat dibuka di Microsoft Word / LibreOffice.

## Failure Handling
- Bila format korup, kembalikan ke struktur teks polos dan bangun ulang berkas.
