---
name: Plugin & MCP Manager
description: Menemukan, memasang, mengonfigurasi, menguji, menonaktifkan, dan menghapus plugin atau MCP server.
version: 1.0.0
allowed_tools: [plugin_list, plugin_inspect, plugin_install, plugin_update, plugin_remove, mcp_test]
tags: [plugin, mcp, integrations]
---

# Plugin & MCP Manager

## Purpose
Manajemen siklus hidup plugin dan server Model Context Protocol (MCP), konfigurasi transport, dan pengujian konektivitas.

## Trigger Conditions
- Pengguna ingin menambahkan integrasi tool eksternal via MCP.
- Pengelolaan status plugin aktif/nonaktif dan audit keamanan plugin.
- Pengujian koneksi server MCP stdio / SSE.

## Do Not Use When
- Memasang plugin dari sumber tidak tepercaya tanpa verifikasi checksum.

## Inputs
- Nama plugin / MCP identifier
- Konfigurasi transport (command, args, env)
- Izin yang diminta.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`plugin_list, plugin_inspect, plugin_install, plugin_update, plugin_remove, mcp_test`

## Workflow
1. Cari dan periksa metadata plugin dengan `plugin_inspect`.
2. Evaluasi izin yang diminta dan lakukan pemindaian keamanan manifest.
3. Dapatkan approval pengguna sebelum menjalankan instalasi dengan `plugin_install`.
4. Uji koneksi tool dengan `mcp_test` untuk memastikan schema tool terbaca dengan benar.
5. Laporkan status tool baru yang berhasil didaftarkan ke registry.

## Safety and Approval Gates
- Tingkat risiko CRITICAL. Pemasangan, pembaruan, dan penghapusan MCP membutuhkan approval ketat.

## Verification
- Verifikasi respons `tools/list` dari server MCP dengan exit code sehat.

## Output Contract
- Status plugin terpasang dan daftar tool baru yang tersedia.

## Failure Handling
- Jika koneksi gagal, periksa env var dan logging stderr server MCP.
