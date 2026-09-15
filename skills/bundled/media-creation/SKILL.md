---
name: Media Creation
description: Membuat atau mengedit aset gambar, audio, dan video melalui provider yang tersedia.
version: 1.0.0
allowed_tools: [image_generate, image_edit]
tags: [image, audio, video, creative]
---

# Media Creation

## Purpose
Menghasilkan aset visual ilustrasi, icon, diagram, dan media kreatif untuk melengkapi aplikasi atau laporan.

## Trigger Conditions
- Aplikasi web membutuhkan ilustrasi banner, icon aset, atau mockup produk.
- Pengguna meminta pembuatan gambar dari deskripsi teks.

## Do Not Use When
- Pembuatan konten ilegal, berbahaya, atau melanggar hak cipta eksplisit.

## Inputs
- Prompt deskripsi visual
- Aspek rasio
- Style visual (minimalis, 3D, flat).

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`image_generate, image_edit, audio_generate, video_generate`

## Workflow
1. Optimalkan prompt visual agar sesuai dengan gaya visual Nusa Agent yang elegan.
2. Gunakan `image_generate` untuk membuat aset baru ke direktori workspace.
3. Lakukan modifikasi terarah dengan `image_edit` jika diperlukan revisi.
4. Laporkan path berkas media yang dihasilkan.

## Safety and Approval Gates
- Penggunaan API provider berbayar yang melebihi batas budget memerlukan konfirmasi pengguna.

## Verification
- Pastikan file gambar tersimpan dalam format PNG/SVG yang valid dan tidak 0-byte.

## Output Contract
- Aset gambar tersimpan di direktori assets workspace.

## Failure Handling
- Jika provider eksternal tidak aktif, gunakan generator diagram SVG lokal.
