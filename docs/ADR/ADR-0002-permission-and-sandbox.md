# ADR 0002: Model Keamanan, Permission Engine, dan Sandboxing

## Status
Accepted

## Konteks
Sebagai agent desktop otonom dengan kapabilitas file read, write, patch, shell execution, dan test running, aplikasi ini berpotensi membahayakan sistem pengguna jika prompt injection berhasil memaksa model memanggil tool berbahaya, membaca file rahasia (`~/.ssh`), atau merusak data host.

## Kebijakan & Prinsip
1. **Zero Trust pada Output Model**: Model AI tidak pernah diasumsikan aman. Setiap tool call adalah data yang belum terverifikasi dan harus disaring oleh policy engine independen di gateway sebelum dieksekusi.
2. **Policy Precedence: `DENY > ASK > ALLOW`**:
   - `DENY`: Aksi di luar workspace project, path traversal (`../`), symlink keluar, dan perintah berbahaya dilarang secara absolut tanpa dialog konfirmasi.
   - `ASK`: Aksi mutasi file (create, patch, delete) dan eksekusi shell memerlukan konfirmasi manusia (Human Approval) melalui antarmuka visual.
   - `ALLOW`: Hanya pembacaan file ter-sandboxed di dalam workspace yang berjalan otomatis.
3. **Canonical Path Jail**:
   - Semua path yang diberikan oleh model dinormalisasi menggunakan `pathlib.Path.resolve()`.
   - Path harus merupakan subpath dari `workspace.root_path`. Jika symlink mengarah ke luar root workspace, eksekusi ditolak seketika.
4. **Subprocess Isolation**:
   - Subprocess dieksekusi dengan working directory terikat pada workspace project.
   - Environment variables dibersihkan; API key disaring dari logs dan output menggunakan Secret Redactor regex.
5. **Idempotency dan Recoverable State**:
   - Setiap operasi penulisan file didahului dengan pembuatan backup in-memory atau riwayat diff sehingga dapat di-revert jika terjadi kegagalan.

## Konsekuensi
- Menjamin sistem pengguna terlindungi dari kerusakan fatal dan kebocoran credential.
- Pengguna tetap memegang kendali penuh melalui Approval Inbox di antarmuka desktop.
