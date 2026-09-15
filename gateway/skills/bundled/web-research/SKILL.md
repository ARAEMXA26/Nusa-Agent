---
name: Web Research
description: Mencari sumber web, membandingkan bukti, dan menghasilkan jawaban bersitasi.
version: 1.0.0
allowed_tools: [web_search, web_open, web_find]
tags: [research, web, citations]
---

# Web Research

## Purpose
Mencari informasi eksternal di internet, mengekstrak fakta akurat, membandingkan sumber terpercaya, dan melampirkan sitasi.

## Trigger Conditions
- Pengguna menanyakan dokumentasi library terkini, API reference, atau rilis baru.
- Dibutuhkan benchmark pasar, informasi kompetitor, atau artikel ilmiah.
- Konteks lokal tidak memadai untuk menjawab pertanyaan teknis.

## Do Not Use When
- Mencari data sensitif atau kredensial internal.
- Tugas yang hanya membutuhkan pembacaan kode lokal.

## Inputs
- Topik atau kueri riset
- Parameter tanggal/keakuratan
- Kriteria sumber.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`web_search, web_open, web_find`

## Workflow
1. Rumuskan kueri pencarian yang presisi menggunakan kata kunci teknis.
2. Gunakan `web_search` untuk menemukan halaman rujukan relevan.
3. Buka halaman dengan `web_open` dan cari poin spesifik menggunakan `web_find`.
4. Sintesis ringkasan objektif dengan menyertakan tautan sitasi lengkap.

## Safety and Approval Gates
- Network dibatasi pada domain publik terpercaya. Tolak domain mencurigakan.

## Verification
- Verifikasi silang minimal dua sumber independen untuk klaim teknis penting.

## Output Contract
- Rangkuman riset komprehensif disertai daftar referensi dan URL sitasi.

## Failure Handling
- Bila situs tidak dapat diakses atau diblokir, coba mirror resmi atau dokumen arsip.
