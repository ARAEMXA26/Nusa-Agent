---
name: Browser Automation
description: Membuka halaman, berinteraksi dengan DOM, mengisi form, mengambil screenshot, dan memverifikasi web app.
version: 1.0.0
allowed_tools: [browser_open, browser_inspect, browser_click, browser_type, browser_screenshot]
tags: [browser, automation, e2e]
---

# Browser Automation

## Purpose
Otomasi interaksi web browser, pengujian E2E frontend, pengisian formulir, dan verifikasi visual.

## Trigger Conditions
- Pengujian fungsional aplikasi web lokal atau staging.
- Kebutuhan navigasi halaman dan inspeksi elemen DOM.
- Pengambilan screenshot halaman web untuk verifikasi visual.

## Do Not Use When
- Mengakses akun perbankan, kredensial pribadi, atau transaksi moneter tanpa otorisasi.
- Melewati CAPTCHA atau merusak situs pihak ketiga.

## Inputs
- URL target
- Langkah interaksi
- Selektor / element ID.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`browser_open, browser_inspect, browser_click, browser_type, browser_screenshot`

## Workflow
1. Buka URL tujuan menggunakan `browser_open`.
2. Ambil snapshot accessibility tree dengan `browser_inspect` untuk memetakan ID elemen interaktif.
3. Lakukan aksi interaksi terarah dengan `browser_click` dan `browser_type`.
4. Ambil screenshot dengan `browser_screenshot` sebagai bukti hasil eksekusi.

## Safety and Approval Gates
- Persetujuan wajib untuk submit formulir berisiko, transaksi finansial, atau aksi autentikasi.

## Verification
- Verifikasi respons status HTTP dan tangkapan layar elemen yang diharapkan muncul.

## Output Contract
- Screenshot bukti verifikasi, snapshot DOM, dan log interaksi.

## Failure Handling
- Jika elemen tidak ditemukan, ambil snapshot DOM terbaru dan coba selektor alternatif.
