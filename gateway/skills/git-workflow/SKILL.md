---
name: git-workflow
description: Standarisasi commit Git semantik, peninjauan diff, dan persiapan pull request aman.
version: 1.0.0
license: Apache-2.0
author: Nusa Team
compatibility: >=1.0.0
allowed_tools: [git_status, git_diff]
tags: [git, workflow, versioning]
---

# Git Workflow Skill

Panduan operasi Git yang aman dan terstandardisasi:
1. Selalu jalankan `git_status` untuk memastikan berkas yang dimodifikasi sesuai rencana.
2. Periksa `git_diff` untuk memastikan tidak ada rahasia, token, atau file sementara yang tidak sengaja terbawa.
3. Gunakan konvensi Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
