---
name: code-reviewer
description: Memeriksa kode terhadap kerentanan keamanan, bugs, dan standar arsitektur bersih.
version: 1.0.0
license: Apache-2.0
author: Nusa Team
compatibility: >=1.0.0
allowed_tools: [file_read, file_list, git_diff]
tags: [security, quality, review]
---

# Code Reviewer Skill

Gunakan skill ini ketika diminta melakukan tinjauan kode atau audit keamanan repository:
1. Periksa berkas yang berubah atau sasaran menggunakan `git_diff` atau `file_read`.
2. Identifikasi potensi kelemahan:
   - Injeksi SQL atau OS command.
   - Kebocoran secrets atau credentials hardcoded.
   - Resource leaks (file handle tidak ditutup).
   - Penanganan error yang kosong atau silent failures.
3. Susun laporan terstruktur dalam bentuk Artifact Review dengan saran perbaikan yang dapat diuji.
