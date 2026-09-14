---
name: test-generator
description: Menghasilkan test cases otomatis dan menjalankan verifikasi menggunakan test runner nyata.
version: 1.0.0
license: Apache-2.0
author: Nusa Team
compatibility: >=1.0.0
allowed_tools: [file_read, file_write, file_patch, run_test]
tags: [testing, verification, tdd]
---

# Test Generator Skill

Gunakan skill ini untuk membuat atau memperbaiki unit tests dan integration tests:
1. Baca berkas implementasi untuk memahami kontrak fungsi dan edge cases.
2. Buat berkas test (misal `test_<module>.py` atau `<module>.test.ts`).
3. Jalankan `run_test` untuk memverifikasi bahwa pengujian benar-benar lulus secara deterministik.
4. Catat status verifikasi sebagai bukti deliverable selesai.
