---
name: Git Workflow
description: Membaca status dan diff, membuat commit semantik, serta menyiapkan branch atau pull request secara aman.
version: 1.0.0
allowed_tools: [git_status, git_diff, git_log, git_add, git_commit]
tags: [git, workflow, versioning]
---

# Git Workflow

## Purpose
Mengelola version control git dengan commit semantik, isolasi branch, dan perlindungan riwayat repositori.

## Trigger Conditions
- Pekerjaan coding selesai dan siap di-commit.
- Pengguna meminta pembuatan branch baru atau persiapan pull request.
- Pemeriksaan riwayat git log atau status staged berkas.

## Do Not Use When
- Force push (`git push -f`) tanpa persetujuan eksplisit.
- Menyimpan secret, token, atau file .env ke dalam git.

## Inputs
- Pesan commit atau deskripsi perubahan
- Nama branch target
- Remote target.

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`git_status, git_diff, git_log, git_add, git_commit, git_branch, git_push, pull_request_create`

## Workflow
1. Periksa perubahan dengan `git_status` dan tinjau diff perubahan dengan `git_diff`.
2. Stage berkas yang relevan dengan `git_add` secara selektif.
3. Buat commit terstandar dengan pesan semantik (Conventional Commits) menggunakan `git_commit`.
4. Jika diminta push, minta persetujuan pengguna sebelum memanggil `git_push`.

## Safety and Approval Gates
- Push ke remote, force push, dan penghapusan branch WAJIB melalui human approval gate.

## Verification
- Periksa `git_log -n 1` untuk memvalidasi commit hash dan author metadata.

## Output Contract
- Commit hash baru, status branch terkini, dan log commit.

## Failure Handling
- Jika ada conflict, batalkan merge atau instruksikan penyelesaian manual kepada user.
