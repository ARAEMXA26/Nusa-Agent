---
name: Computer Use
description: Mengamati dan mengoperasikan aplikasi desktop ketika API atau tool khusus tidak tersedia.
version: 1.0.0
allowed_tools: [screen_view, mouse_control, keyboard_control]
tags: [desktop, gui, automation]
---

# Computer Use

## Purpose
Mengendalikan antarmuka GUI desktop untuk aplikasi yang tidak memiliki API atau antarmuka headless.

## Trigger Conditions
- Aplikasi desktop pihak ketiga harus dioperasikan melalui GUI.
- Diperlukan pengamatan visual terhadap layar desktop pengguna.
- Alat otomatisasi API spesifik tidak tersedia.

## Do Not Use When
- Ketika tugas dapat diselesaikan melalui CLI, script, atau API langsung.
- Operasi tanpa konfirmasi pada aplikasi yang menyimpan data finansial/pribadi.

## Inputs
- Koordinat mouse
- Kombinasi tombol keyboard
- Tangkapan layar konteks.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`screen_view, mouse_control, keyboard_control`

## Workflow
1. Ambil tangkapan layar desktop terkini dengan `screen_view`.
2. Hitung koordinat tombol atau target elemen secara presisi.
3. Dapatkan persetujuan pengguna untuk melakukan klik atau input keyboard.
4. Kirim event kontrol `mouse_control` atau `keyboard_control` secara bertahap.
5. Ambil tangkapan layar verifikasi untuk memastikan state aplikasi berubah sesuai harapan.

## Safety and Approval Gates
- Tingkat risiko CRITICAL. Setiap aksi mutatif ke GUI wajib dikonfirmasi manusia.

## Verification
- Verifikasi visual pasca-aksi untuk mendeteksi perubahan jendela aktif.

## Output Contract
- Log urutan event mouse/keyboard dan screenshot pasca-interaksi.

## Failure Handling
- Hentikan kontrol segera bila koordinat tidak cocok atau jendela hilang.
