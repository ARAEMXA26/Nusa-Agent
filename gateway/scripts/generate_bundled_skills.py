"""Generator script to author all 20 production-ready bundled skills."""

import json
import os
from pathlib import Path

BUNDLED_SKILLS = [
    {
        "id": "task-planning",
        "name": "Task Planning",
        "version": "1.0.0",
        "description": "Memecah tujuan kompleks menjadi langkah, dependency, milestone, dan kriteria selesai.",
        "tags": ["planning", "tasks", "workflow"],
        "tools": ["workspace_read", "memory_read"],
        "optionalTools": ["task_state_write"],
        "permissions": {
            "filesystem": "read",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "low",
        "requiresApprovalFor": [],
        "purpose": "Memecah tujuan tingkat tinggi menjadi rencana aksi terstruktur yang terukur, berurutan, dan dapat diverifikasi.",
        "triggers": [
            "Pengguna memberikan tujuan berskala besar atau proyek multi-tahap.",
            "Tugas membutuhkan dekomposisi langkah dan estimasi dependensi.",
            "Pengguna meminta roadmap, timeline, atau milestone teknis."
        ],
        "do_not_use": [
            "Tugas instruksi satu baris atau perbaikan sintaksis kecil.",
            "Eksekusi kode langsung tanpa fase perencanaan yang diminta."
        ],
        "inputs": ["Tujuan akhir (goal)", "Konteks workspace", "Riwayat memori atau preferensi pengguna."],
        "workflow": [
            "Analisis tujuan utama dan identifikasi dependensi kritis.",
            "Baca struktur workspace dan artefak yang sudah ada untuk menghindari redundansi.",
            "Susun milestone bertahap dengan kriteria verifikasi objektif untuk setiap langkah.",
            "Tulis rencana ke dalam format markdown terstruktur dan emit event rencana."
        ],
        "safety": ["Operasi bersifat read-only terhadap workspace dan memory.", "Tidak ada eksekusi shell atau modifikasi destruktif."],
        "verification": ["Verifikasi kelengkapan milestone dan ketergantungan logis antar langkah."],
        "output_contract": ["Rencana terstruktur dengan tabel milestone, dependensi, dan kriteria sukses."],
        "failure_handling": ["Bila tujuan ambigu, ajukan pertanyaan klarifikasi terarah sebelum melanjutkan."]
    },
    {
        "id": "multi-agent-orchestration",
        "name": "Multi-Agent Orchestration",
        "version": "1.0.0",
        "description": "Mendelegasikan subtask independen, menyatukan hasil, mengelola status dan konflik.",
        "tags": ["agents", "delegation", "parallel"],
        "tools": ["agent_spawn", "agent_message", "agent_wait", "agent_stop"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "read",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "medium",
        "requiresApprovalFor": ["agent_spawn_exceeding_budget"],
        "purpose": "Mengatur orkestrasi sub-agent paralel, agregasi deliverable, sinkronisasi state, dan penanganan konflik.",
        "triggers": [
            "Tugas memiliki cabang investigasi atau pembangunan yang dapat diparalelisasi.",
            "Dibutuhkan spesialisasi peran (misal: Researcher, Builder, Verifier).",
            "Pengguna meminta eksekusi tim agent independen."
        ],
        "do_not_use": [
            "Tugas sekuensial sederhana yang cukup diselesaikan oleh satu agent.",
            "Kondisi resource atau token budget sangat terbatas."
        ],
        "inputs": ["Subtask definitions", "Role assignment", "Budget constraints."],
        "workflow": [
            "Tentukan subtask terisolasi yang tidak memiliki race condition.",
            "Spawn sub-agent dengan role yang sesuai dan konteks minimal yang dibutuhkan.",
            "Monitor status subtask secara asinkron hingga deliverable diterima.",
            "Gabungkan output, selesaikan konflik jika ada, dan hentikan sub-agent yang selesai."
        ],
        "safety": ["Persetujuan wajib jika alokasi agent melebihi ambang batas biaya atau concurrency."],
        "verification": ["Pastikan setiap sub-agent melaporkan status terminal sukses sebelum agregasi."],
        "output_contract": ["Laporan konsolidasi hasil kerja seluruh sub-agent beserta metrik waktu eksekusi."],
        "failure_handling": ["Jika sub-agent gagal atau timeout, coba delegasikan ulang sekali atau lanjutkan dengan fallback."]
    },
    {
        "id": "web-research",
        "name": "Web Research",
        "version": "1.0.0",
        "description": "Mencari sumber web, membandingkan bukti, dan menghasilkan jawaban bersitasi.",
        "tags": ["research", "web", "citations"],
        "tools": ["web_search", "web_open", "web_find"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "read",
            "network": "restricted",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "medium",
        "requiresApprovalFor": [],
        "purpose": "Mencari informasi eksternal di internet, mengekstrak fakta akurat, membandingkan sumber terpercaya, dan melampirkan sitasi.",
        "triggers": [
            "Pengguna menanyakan dokumentasi library terkini, API reference, atau rilis baru.",
            "Dibutuhkan benchmark pasar, informasi kompetitor, atau artikel ilmiah.",
            "Konteks lokal tidak memadai untuk menjawab pertanyaan teknis."
        ],
        "do_not_use": [
            "Mencari data sensitif atau kredensial internal.",
            "Tugas yang hanya membutuhkan pembacaan kode lokal."
        ],
        "inputs": ["Topik atau kueri riset", "Parameter tanggal/keakuratan", "Kriteria sumber."],
        "workflow": [
            "Rumuskan kueri pencarian yang presisi menggunakan kata kunci teknis.",
            "Gunakan `web_search` untuk menemukan halaman rujukan relevan.",
            "Buka halaman dengan `web_open` dan cari poin spesifik menggunakan `web_find`.",
            "Sintesis ringkasan objektif dengan menyertakan tautan sitasi lengkap."
        ],
        "safety": ["Network dibatasi pada domain publik terpercaya. Tolak domain mencurigakan."],
        "verification": ["Verifikasi silang minimal dua sumber independen untuk klaim teknis penting."],
        "output_contract": ["Rangkuman riset komprehensif disertai daftar referensi dan URL sitasi."],
        "failure_handling": ["Bila situs tidak dapat diakses atau diblokir, coba mirror resmi atau dokumen arsip."]
    },
    {
        "id": "software-development",
        "name": "Software Development",
        "version": "1.0.0",
        "description": "Membaca, menambah, mengedit, menghapus, mencari, dan memverifikasi source code.",
        "tags": ["coding", "files", "implementation"],
        "tools": ["file_read", "file_list", "file_search", "symbol_search", "file_write", "file_patch", "run_command"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "none",
            "shell": "sandboxed",
            "computerControl": "none"
        },
        "riskLevel": "high",
        "requiresApprovalFor": ["delete_file", "write_outside_workspace", "destructive_command"],
        "purpose": "Mengimplementasikan fitur perangkat lunak, perbaikan bug, refaktorisasi arsitektur, dan integrasi modul.",
        "triggers": [
            "Instruksi penulisan kode, penambahan fitur baru, atau debugging aplikasi.",
            "Perubahan struktur berkas dan implementasi komponen.",
            "Refactoring kode yang ada di workspace."
        ],
        "do_not_use": [
            "Review pasif tanpa niat melakukan modifikasi kode.",
            "Menghapus berkas sistem operasi atau file di luar batas workspace."
        ],
        "inputs": ["Spesifikasi fitur / bug report", "Path berkas target", "Konvensi arsitektur proyek."],
        "workflow": [
            "Pindai simbol dan berkas terkait menggunakan `file_search` dan `symbol_search`.",
            "Baca berkas lengkap menggunakan `file_read` sebelum melakukan perubahan apa pun.",
            "Terapkan modifikasi presisi dengan `file_patch` atau buat berkas baru dengan `file_write`.",
            "Jalankan kompilasi atau linter dengan `run_command` untuk memastikan sintaks bersih."
        ],
        "safety": ["Penghapusan berkas atau penulisan di luar workspace wajib mendapat persetujuan pengguna."],
        "verification": ["Lakukan pengecekan build dan typecheck segera setelah pengeditan kode."],
        "output_contract": ["Daftar berkas yang diubah beserta ringkasan implementasi dan status build."],
        "failure_handling": ["Jika build gagal, baca traceback lengkap dan pulihkan file atau perbaiki secara sistematis."]
    },
    {
        "id": "code-reviewer",
        "name": "Code Reviewer",
        "version": "1.0.0",
        "description": "Meninjau diff untuk bug, regresi, kerentanan, dan masalah maintainability.",
        "tags": ["review", "security", "quality"],
        "tools": ["file_read", "file_list", "file_search", "git_status", "git_diff"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "read",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "low",
        "requiresApprovalFor": [],
        "purpose": "Melakukan penelaahan kode secara pasif dan objektif untuk menjamin kualitas, keamanan, dan kebersihan arsitektur.",
        "triggers": [
            "Pengguna meminta peninjauan branch, pull request, atau git diff sebelum commit.",
            "Audit kualitas kode dan deteksi kemungkinan regresi logis.",
            "Pemeriksaan kepatuhan gaya penulisan dan standar arsitektur."
        ],
        "do_not_use": [
            "Melakukan penulisan atau perbaikan kode langsung (gunakan skill software-development).",
            "Menjalankan skrip eksekusi yang berpotensi mutatif."
        ],
        "inputs": ["Target diff atau rentang commit", "Kriteria tinjauan (keamanan, performa, maintainability)."],
        "workflow": [
            "Periksa status repositori dan dapatkan diff perubahan dengan `git_diff`.",
            "Baca berkas konteks asal menggunakan `file_read` untuk memahami dampak perubahan.",
            "Identifikasi potensi memory leak, race condition, kerentanan injeksi, atau regresi logic.",
            "Format temuan ke dalam ulasan terstruktur berdasar tingkat keparahan."
        ],
        "safety": ["Skill ini strictly read-only. Tidak ada izin penulisan atau eksekusi mutatif."],
        "verification": ["Pastikan setiap komentar review merujuk pada nomor baris dan berkas yang valid."],
        "output_contract": ["Laporan tinjauan kode terstruktur: Temuan Kritis, Peringatan, dan Rekomendasi."],
        "failure_handling": ["Jika diff kosong, informasikan bahwa workspace bersih tanpa perubahan pending."]
    },
    {
        "id": "test-generator",
        "name": "Test Generator",
        "version": "1.0.0",
        "description": "Membuat test case relevan dan menjalankan verifikasi dengan test runner nyata.",
        "tags": ["testing", "verification", "tdd"],
        "tools": ["file_read", "file_search", "file_write", "file_patch", "run_test"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "none",
            "shell": "sandboxed",
            "computerControl": "none"
        },
        "riskLevel": "medium",
        "requiresApprovalFor": [],
        "purpose": "Menghasilkan unit test, integration test, dan assertion deterministik menggunakan runner nyata.",
        "triggers": [
            "Modul baru dibuat dan membutuhkan cakupan pengujian komprehensif.",
            "Bug dilaporkan dan membutuhkan test reproduksi untuk regresi (TDD).",
            "Pengguna meminta peningkatan code coverage pada repositori."
        ],
        "do_not_use": [
            "Membuat mock pengujian dummy yang selalu lulus tanpa memvalidasi logika nyata.",
            "Menghapus pengujian lama yang gagal alih-alih memperbaiki kode."
        ],
        "inputs": ["Berkas target yang akan diuji", "Test framework yang digunakan (pytest, vitest, jest)."],
        "workflow": [
            "Baca implementasi fungsi dan identifikasi edge cases, validasi parameter, dan error conditions.",
            "Tulis skenario pengujian ke dalam berkas test sesuai konvensi proyek.",
            "Jalankan `run_test` untuk mengeksekusi runner secara nyata.",
            "Pastikan semua pengujian lulus dan laporkan hasil pengujian."
        ],
        "safety": ["Hanya menulis di direktori test workspace. Tidak menghapus test yang sudah ada."],
        "verification": ["Verifikasi bahwa command `run_test` menghasilkan exit code 0."],
        "output_contract": ["Berkas test yang valid dan laporan hasil eksekusi runner."],
        "failure_handling": ["Jika test gagal, analisis stack trace dan sesuaikan assertion atau laporkan bug kode."]
    },
    {
        "id": "git-workflow",
        "name": "Git Workflow",
        "version": "1.0.0",
        "description": "Membaca status dan diff, membuat commit semantik, serta menyiapkan branch atau pull request secara aman.",
        "tags": ["git", "workflow", "versioning"],
        "tools": ["git_status", "git_diff", "git_log", "git_add", "git_commit"],
        "optionalTools": ["git_branch", "git_push", "pull_request_create"],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "restricted",
            "shell": "sandboxed",
            "computerControl": "none"
        },
        "riskLevel": "high",
        "requiresApprovalFor": ["git_push", "force_operation", "branch_deletion", "pull_request_create"],
        "purpose": "Mengelola version control git dengan commit semantik, isolasi branch, dan perlindungan riwayat repositori.",
        "triggers": [
            "Pekerjaan coding selesai dan siap di-commit.",
            "Pengguna meminta pembuatan branch baru atau persiapan pull request.",
            "Pemeriksaan riwayat git log atau status staged berkas."
        ],
        "do_not_use": [
            "Force push (`git push -f`) tanpa persetujuan eksplisit.",
            "Menyimpan secret, token, atau file .env ke dalam git."
        ],
        "inputs": ["Pesan commit atau deskripsi perubahan", "Nama branch target", "Remote target."],
        "workflow": [
            "Periksa perubahan dengan `git_status` dan tinjau diff perubahan dengan `git_diff`.",
            "Stage berkas yang relevan dengan `git_add` secara selektif.",
            "Buat commit terstandar dengan pesan semantik (Conventional Commits) menggunakan `git_commit`.",
            "Jika diminta push, minta persetujuan pengguna sebelum memanggil `git_push`."
        ],
        "safety": ["Push ke remote, force push, dan penghapusan branch WAJIB melalui human approval gate."],
        "verification": ["Periksa `git_log -n 1` untuk memvalidasi commit hash dan author metadata."],
        "output_contract": ["Commit hash baru, status branch terkini, dan log commit."],
        "failure_handling": ["Jika ada conflict, batalkan merge atau instruksikan penyelesaian manual kepada user."]
    },
    {
        "id": "browser-automation",
        "name": "Browser Automation",
        "version": "1.0.0",
        "description": "Membuka halaman, berinteraksi dengan DOM, mengisi form, mengambil screenshot, dan memverifikasi web app.",
        "tags": ["browser", "automation", "e2e"],
        "tools": ["browser_open", "browser_inspect", "browser_click", "browser_type", "browser_screenshot"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "unrestricted",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "high",
        "requiresApprovalFor": ["form_submit", "financial_transaction", "account_login", "publish_action"],
        "purpose": "Otomasi interaksi web browser, pengujian E2E frontend, pengisian formulir, dan verifikasi visual.",
        "triggers": [
            "Pengujian fungsional aplikasi web lokal atau staging.",
            "Kebutuhan navigasi halaman dan inspeksi elemen DOM.",
            "Pengambilan screenshot halaman web untuk verifikasi visual."
        ],
        "do_not_use": [
            "Mengakses akun perbankan, kredensial pribadi, atau transaksi moneter tanpa otorisasi.",
            "Melewati CAPTCHA atau merusak situs pihak ketiga."
        ],
        "inputs": ["URL target", "Langkah interaksi", "Selektor / element ID."],
        "workflow": [
            "Buka URL tujuan menggunakan `browser_open`.",
            "Ambil snapshot accessibility tree dengan `browser_inspect` untuk memetakan ID elemen interaktif.",
            "Lakukan aksi interaksi terarah dengan `browser_click` dan `browser_type`.",
            "Ambil screenshot dengan `browser_screenshot` sebagai bukti hasil eksekusi."
        ],
        "safety": ["Persetujuan wajib untuk submit formulir berisiko, transaksi finansial, atau aksi autentikasi."],
        "verification": ["Verifikasi respons status HTTP dan tangkapan layar elemen yang diharapkan muncul."],
        "output_contract": ["Screenshot bukti verifikasi, snapshot DOM, dan log interaksi."],
        "failure_handling": ["Jika elemen tidak ditemukan, ambil snapshot DOM terbaru dan coba selektor alternatif."]
    },
    {
        "id": "computer-use",
        "name": "Computer Use",
        "version": "1.0.0",
        "description": "Mengamati dan mengoperasikan aplikasi desktop ketika API atau tool khusus tidak tersedia.",
        "tags": ["desktop", "gui", "automation"],
        "tools": ["screen_view", "mouse_control", "keyboard_control"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "read",
            "network": "none",
            "shell": "none",
            "computerControl": "interact-with-approval"
        },
        "riskLevel": "critical",
        "requiresApprovalFor": ["state_modifying_action", "desktop_interaction", "system_input"],
        "purpose": "Mengendalikan antarmuka GUI desktop untuk aplikasi yang tidak memiliki API atau antarmuka headless.",
        "triggers": [
            "Aplikasi desktop pihak ketiga harus dioperasikan melalui GUI.",
            "Diperlukan pengamatan visual terhadap layar desktop pengguna.",
            "Alat otomatisasi API spesifik tidak tersedia."
        ],
        "do_not_use": [
            "Ketika tugas dapat diselesaikan melalui CLI, script, atau API langsung.",
            "Operasi tanpa konfirmasi pada aplikasi yang menyimpan data finansial/pribadi."
        ],
        "inputs": ["Koordinat mouse", "Kombinasi tombol keyboard", "Tangkapan layar konteks."],
        "workflow": [
            "Ambil tangkapan layar desktop terkini dengan `screen_view`.",
            "Hitung koordinat tombol atau target elemen secara presisi.",
            "Dapatkan persetujuan pengguna untuk melakukan klik atau input keyboard.",
            "Kirim event kontrol `mouse_control` atau `keyboard_control` secara bertahap.",
            "Ambil tangkapan layar verifikasi untuk memastikan state aplikasi berubah sesuai harapan."
        ],
        "safety": ["Tingkat risiko CRITICAL. Setiap aksi mutatif ke GUI wajib dikonfirmasi manusia."],
        "verification": ["Verifikasi visual pasca-aksi untuk mendeteksi perubahan jendela aktif."],
        "output_contract": ["Log urutan event mouse/keyboard dan screenshot pasca-interaksi."],
        "failure_handling": ["Hentikan kontrol segera bila koordinat tidak cocok atau jendela hilang."]
    },
    {
        "id": "document",
        "name": "Document Studio",
        "version": "1.0.0",
        "description": "Membaca, membuat, mengedit, merender, dan memverifikasi dokumen DOCX.",
        "tags": ["document", "docx", "writing"],
        "tools": ["document_read", "document_write", "document_render", "file_read", "file_write"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "medium",
        "requiresApprovalFor": [],
        "purpose": "Pembuatan dan manipulasi berkas dokumen pengolah kata (.docx) dengan format rapi dan tipografi profesional.",
        "triggers": [
            "Kebutuhan membuat laporan bisnis, SOP, proposal, atau dokumen teknis berformat Word.",
            "Pembacaan dan ekstraksi teks dari berkas .docx yang ada di workspace."
        ],
        "do_not_use": ["Dokumen yang seharusnya berupa slide presentasi atau spreadsheet numerik."],
        "inputs": ["Konten dokumen", "Heading hierarchy", "Tabel dan styling."],
        "workflow": [
            "Baca dokumen referensi jika memodifikasi dokumen yang ada.",
            "Susun struktur heading, paragraf, daftar berpoin, dan tabel.",
            "Gunakan `document_write` untuk menghasilkan berkas DOCX valid.",
            "Render pratinjau dokumen dengan `document_render` jika diperlukan verifikasi visual."
        ],
        "safety": ["File hanya ditulis di dalam ruang kerja workspace."],
        "verification": ["Verifikasi keutuhan format OpenXML berkas hasil pembuatan."],
        "output_contract": ["Berkas .docx yang valid dan dapat dibuka di Microsoft Word / LibreOffice."],
        "failure_handling": ["Bila format korup, kembalikan ke struktur teks polos dan bangun ulang berkas."]
    },
    {
        "id": "pdf",
        "name": "PDF Studio",
        "version": "1.0.0",
        "description": "Membaca, membuat, menggabungkan, mengisi, merender, dan memeriksa PDF.",
        "tags": ["pdf", "forms", "render"],
        "tools": ["pdf_read", "pdf_write", "pdf_render", "file_read", "file_write"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "medium",
        "requiresApprovalFor": [],
        "purpose": "Ekstraksi teks, penggabungan halaman, pengisian form, dan rendering halaman dokumen PDF.",
        "triggers": [
            "Pengguna ingin membaca konten laporan atau invoice berformat PDF.",
            "Kebutuhan konversi dokumen atau pembuatan berkas PDF publikasi.",
            "Pemeriksaan teks dan metadata pada berkas PDF."
        ],
        "do_not_use": ["Dokumen yang membutuhkan editing tabel dinamis secara simultan."],
        "inputs": ["Path berkas PDF", "Halaman target", "Konten yang akan dikonversi."],
        "workflow": [
            "Gunakan `pdf_read` untuk mengekstrak teks, metadata, dan jumlah halaman.",
            "Jika membuat PDF baru, susun layout dan simpan dengan `pdf_write`.",
            "Gunakan `pdf_render` untuk menghasilkan gambar pratinjau halaman.",
            "Verifikasi keterbacaan teks dan posisi margin."
        ],
        "safety": ["Tidak mengeksekusi JavaScript yang mungkin tersemat dalam berkas PDF."],
        "verification": ["Pastikan file PDF memiliki header `%PDF-` yang valid."],
        "output_contract": ["Berkas PDF yang valid atau teks hasil ekstraksi per halaman."],
        "failure_handling": ["Bila berkas terenkripsi dengan password, minta password kepada pengguna."]
    },
    {
        "id": "spreadsheet",
        "name": "Spreadsheet Analyst",
        "version": "1.0.0",
        "description": "Membuat dan menganalisis workbook, formula, tabel, chart, serta validasi kalkulasi.",
        "tags": ["spreadsheet", "xlsx", "data"],
        "tools": ["spreadsheet_read", "spreadsheet_write", "spreadsheet_recalculate", "spreadsheet_render"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "medium",
        "requiresApprovalFor": [],
        "purpose": "Pengolahan berkas spreadsheet (.xlsx/.csv), penulisan formula matematika/keuangan, dan rekapitulasi data.",
        "triggers": [
            "Analisis laporan keuangan, data penjualan, atau inventaris berbasis sheet.",
            "Pembuatan workbook Excel baru dengan formula otomatis (SUM, VLOOKUP, INDEX/MATCH).",
            "Validasi kalkulasi tabel numerik."
        ],
        "do_not_use": ["Dataset masif multi-gigabyte yang memerlukan database relasional SQL."],
        "inputs": ["Data mentah", "Struktur kolom", "Formula yang diinginkan."],
        "workflow": [
            "Baca sheet yang ada menggunakan `spreadsheet_read`.",
            "Olah data, perbaiki formula, atau tambahkan sheet baru.",
            "Tulis kembali perubahan dengan `spreadsheet_write`.",
            "Jalankan `spreadsheet_recalculate` untuk memvalidasi kebenaran kalkulasi."
        ],
        "safety": ["Mencegah injeksi macro VBA atau skrip eksternal yang mencurigakan."],
        "verification": ["Verifikasi bahwa tidak ada error formula seperti `#REF!`, `#VALUE!`, atau `#DIV/0!`."],
        "output_contract": ["Berkas workbook .xlsx yang valid dengan formula fungsional."],
        "failure_handling": ["Jika formula error, evaluasi urutan komputasi dan perbaiki referensi cell."]
    },
    {
        "id": "slides",
        "name": "Presentation Builder",
        "version": "1.0.0",
        "description": "Membuat, mengedit, merender, dan memverifikasi presentasi.",
        "tags": ["slides", "presentation", "pptx"],
        "tools": ["slides_read", "slides_write", "slides_render"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "medium",
        "requiresApprovalFor": [],
        "purpose": "Merancang slide presentasi PowerPoint (.pptx) dengan layout profesional, visual menarik, dan poin padat.",
        "triggers": [
            "Kebutuhan pembuatan pitch deck, presentasi laporan kuartalan, atau materi pelatihan.",
            "Ekstraksi teks atau layout dari slide yang sudah ada."
        ],
        "do_not_use": ["Dokumen teks panjang naratif (gunakan Document Studio)."],
        "inputs": ["Topik presentasi", "Jumlah slide", "Tema warna dan visual."],
        "workflow": [
            "Rancang alur presentasi: Title, Agenda, Problem, Solution, Data, Conclusion.",
            "Susun konten setiap slide secara ringkas dengan hierarki visual yang jelas.",
            "Gunakan `slides_write` untuk menghasilkan berkas PPTX.",
            "Render slide dengan `slides_render` untuk memverifikasi tata letak elemen."
        ],
        "safety": ["Hanya menulis di direktori workspace pengguna."],
        "verification": ["Verifikasi konsistensi tema warna, kontras teks, dan posisi slide."],
        "output_contract": ["Berkas .pptx yang siap dipresentasikan."],
        "failure_handling": ["Jika teks terlalu panjang hingga overflow, ringkas poin secara padat."]
    },
    {
        "id": "media-creation",
        "name": "Media Creation",
        "version": "1.0.0",
        "description": "Membuat atau mengedit aset gambar, audio, dan video melalui provider yang tersedia.",
        "tags": ["image", "audio", "video", "creative"],
        "tools": ["image_generate", "image_edit"],
        "optionalTools": ["audio_generate", "video_generate"],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "restricted",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "medium",
        "requiresApprovalFor": ["paid_provider_usage_over_budget"],
        "purpose": "Menghasilkan aset visual ilustrasi, icon, diagram, dan media kreatif untuk melengkapi aplikasi atau laporan.",
        "triggers": [
            "Aplikasi web membutuhkan ilustrasi banner, icon aset, atau mockup produk.",
            "Pengguna meminta pembuatan gambar dari deskripsi teks."
        ],
        "do_not_use": ["Pembuatan konten ilegal, berbahaya, atau melanggar hak cipta eksplisit."],
        "inputs": ["Prompt deskripsi visual", "Aspek rasio", "Style visual (minimalis, 3D, flat)."],
        "workflow": [
            "Optimalkan prompt visual agar sesuai dengan gaya visual Nusa Agent yang elegan.",
            "Gunakan `image_generate` untuk membuat aset baru ke direktori workspace.",
            "Lakukan modifikasi terarah dengan `image_edit` jika diperlukan revisi.",
            "Laporkan path berkas media yang dihasilkan."
        ],
        "safety": ["Penggunaan API provider berbayar yang melebihi batas budget memerlukan konfirmasi pengguna."],
        "verification": ["Pastikan file gambar tersimpan dalam format PNG/SVG yang valid dan tidak 0-byte."],
        "output_contract": ["Aset gambar tersimpan di direktori assets workspace."],
        "failure_handling": ["Jika provider eksternal tidak aktif, gunakan generator diagram SVG lokal."]
    },
    {
        "id": "data-analysis",
        "name": "Data Analysis",
        "version": "1.0.0",
        "description": "Membersihkan, menganalisis, memvisualisasikan, dan memvalidasi dataset secara reproducible.",
        "tags": ["analysis", "statistics", "visualization"],
        "tools": ["file_read", "data_query", "python_sandbox", "chart_render"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "none",
            "shell": "sandboxed",
            "computerControl": "none"
        },
        "riskLevel": "medium",
        "requiresApprovalFor": [],
        "purpose": "Analisis data kuantitatif, eksplorasi statistik, pembuatan chart visual, dan perumusan wawasan analitik.",
        "triggers": [
            "Dataset CSV, JSON, atau SQLite perlu dieksplorasi dan diringkas.",
            "Pengguna ingin mengetahui tren, anomali, korelasi, atau metrik utama.",
            "Kebutuhan pembuatan grafik visual statistik."
        ],
        "do_not_use": ["Menjalankan kode Python tanpa sandbox atau mengakses jaringan luar."],
        "inputs": ["Path dataset", "Pertanyaan analitik", "Tipe chart yang diinginkan."],
        "workflow": [
            "Pindai skema dan sampel data awal menggunakan `file_read` atau `data_query`.",
            "Tulis skrip komputasi analitik di dalam `python_sandbox` untuk agregasi data bersih.",
            "Hasilkan representasi visual dengan `chart_render`.",
            "Sajikan ringkasan wawasan bisnis dan interpretasi statistik."
        ],
        "safety": ["Eksekusi Python dibatasi pada sandbox terisolasi tanpa akses filesystem host."],
        "verification": ["Verifikasi angka statistik dasar (mean, median, count) terhadap data mentah."],
        "output_contract": ["Laporan analitik dilengkapi grafik visual dan ringkasan eksekutif."],
        "failure_handling": ["Jika terdapat data null atau korup, lakukan pembersihan dan dokumentasikan asumsi."]
    },
    {
        "id": "security-audit",
        "name": "Security Audit",
        "version": "1.0.0",
        "description": "Memindai manifest, dependency, source code, secret exposure, permission, dan risiko supply chain.",
        "tags": ["security", "audit", "compliance"],
        "tools": ["file_read", "file_search", "dependency_scan", "secret_scan", "static_analysis"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "read",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "low",
        "requiresApprovalFor": [],
        "purpose": "Audit keamanan komprehensif terhadap repositori: celah injeksi, kebocoran secret, CVE dependency, dan permission.",
        "triggers": [
            "Sebelum rilis produksi atau sebelum penggabungan kode kritis.",
            "Pemeriksaan berkala atas paparan secret dan dependency rentan.",
            "Audit kesesuaian manifest dan policy guardrails."
        ],
        "do_not_use": ["Melakukan penyerangan aktif, eksploitasi berbahaya, atau port scanning eksternal."],
        "inputs": ["Target direktori atau repositori", "Standar kepatuhan yang digunakan."],
        "workflow": [
            "Jalankan `secret_scan` untuk menemukan kunci API, token, atau private key yang tidak sengaja ter-commit.",
            "Periksa daftar dependensi dengan `dependency_scan` untuk mencocokkan database kerentanan.",
            "Gunakan `static_analysis` untuk mendeteksi pola SQL injection, XSS, insecure deserialization.",
            "Petakan temuan ke dalam matriks risiko (Critical, High, Medium, Low)."
        ],
        "safety": ["Bersifat read-only sepenuhnya. Tidak mengubah file repositori."],
        "verification": ["Verifikasi temuan dengan membaca potongan kode spesifik menggunakan `file_read`."],
        "output_contract": ["Laporan audit keamanan lengkap dengan matriks keparahan dan rekomendasi perbaikan."],
        "failure_handling": ["Jika berkas terenkripsi atau berformat binary, tandai sebagai uninspected."]
    },
    {
        "id": "automation-scheduler",
        "name": "Automation Scheduler",
        "version": "1.0.0",
        "description": "Membuat, melihat, mengubah, menjeda, dan menghapus pekerjaan terjadwal.",
        "tags": ["automation", "schedule", "monitor"],
        "tools": ["automation_list", "automation_create", "automation_update", "automation_delete"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "read",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "high",
        "requiresApprovalFor": ["automation_create", "automation_activate", "automation_destructive_update", "automation_delete"],
        "purpose": "Manajemen otomasi latar belakang Nusa Agent, cron jobs berulang, dan tugas monitoring terjadwal.",
        "triggers": [
            "Pengguna ingin menjalankan tugas secara berkala (misal: harian, mingguan, per jam).",
            "Pemeriksaan status cron job yang sedang aktif.",
            "Penghentian atau penghapusan jadwal otomatisasi."
        ],
        "do_not_use": ["Menjadwalkan eksekusi skrip berbahaya tanpa persetujuan."],
        "inputs": ["Ekspresi cron (cron expression)", "Prompt tugas", "Profile target."],
        "workflow": [
            "Periksa jadwal yang sudah ada menggunakan `automation_list`.",
            "Validasi sintaksis ekspresi cron dan estimasikan waktu eksekusi berikutnya.",
            "Minta persetujuan pengguna untuk membuat atau mengubah jadwal.",
            "Daftarkan jadwal dengan `automation_create` dan pastikan status aktif."
        ],
        "safety": ["Pembuatan, aktivasi, dan penghapusan jadwal memerlukan human approval eksplisit."],
        "verification": ["Hitung waktu `next_run_at` dan pastikan tersimpan dalam database cron."],
        "output_contract": ["ID automasi, jadwal cron yang aktif, dan ringkasan prompt tugas."],
        "failure_handling": ["Bila ekspresi cron tidak valid, beri saran format standar 5-field."]
    },
    {
        "id": "memory-curator",
        "name": "Memory Curator",
        "version": "1.0.0",
        "description": "Memilih fakta yang layak disimpan, memperbarui memori, menghapus duplikasi, dan menghormati privasi.",
        "tags": ["memory", "context", "personalization"],
        "tools": ["memory_read", "memory_write", "memory_delete"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "read",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "high",
        "requiresApprovalFor": ["save_sensitive_memory", "delete_memory"],
        "purpose": "Kurasi memori jangka panjang agent, menyimpan preferensi pengguna, menghapus memori basi, dan menjaga privasi.",
        "triggers": [
            "Pengguna menyatakan preferensi berulang (misal: gaya coding, stack favorit).",
            "Ditemukan fakta penting tentang arsitektur proyek yang perlu diingat lintas percakapan.",
            "Pembersihan memori usang atau inkonsisten."
        ],
        "do_not_use": [
            "Menyimpan password, PIN, token rahasia, atau data pribadi sensitif (PII).",
            "Menghapus memori tanpa verifikasi relevansi."
        ],
        "inputs": ["Kunci memori (key)", "Nilai fakta (value)", "Scope (global / project)."],
        "workflow": [
            "Cari memori yang relevan menggunakan `memory_read` untuk mendeteksi duplikasi.",
            "Filter data sensitif sesuai kebijakan privasi Nusa Agent.",
            "Tulis fakta ringkas dan esensial ke memori persisten dengan `memory_write`.",
            "Hapus entri memori yang sudah tidak berlaku menggunakan `memory_delete`."
        ],
        "safety": ["Penyimpanan data sensitif dan penghapusan memori membutuhkan approval pengguna."],
        "verification": ["Pastikan entri tersimpan dapat dicari kembali melalui pencarian semantik/kunci."],
        "output_contract": ["Konfirmasi entri memori yang diperbarui atau dihapus."],
        "failure_handling": ["Jika terjadi konflik fakta, prioritaskan instruksi pengguna paling baru."]
    },
    {
        "id": "skill-creator",
        "name": "Skill Creator",
        "version": "1.0.0",
        "description": "Membuat, memvalidasi, menguji, dan mengemas skill Nusa Agent baru.",
        "tags": ["skills", "authoring", "extensions"],
        "tools": ["file_read", "file_write", "file_patch", "skill_validate", "skill_test"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "none",
            "shell": "none",
            "computerControl": "none"
        },
        "riskLevel": "high",
        "requiresApprovalFor": ["install_skill", "publish_skill"],
        "purpose": "Membangun skill baru yang mematuhi standar manifest `skill.json` dan kontrak 10 bab `SKILL.md`.",
        "triggers": [
            "Pengguna ingin membuat kapabilitas skill kustom baru.",
            "Kebutuhan validasi manifest skill sebelum diaktifkan.",
            "Pengujian integritas folder skill."
        ],
        "do_not_use": ["Membuat skill dengan izin berlebihan atau instruksi yang mencoba membypass guardrails."],
        "inputs": ["ID skill", "Deskripsi dan tujuan", "Daftar tools yang dibutuhkan", "Instruksi kerja."],
        "workflow": [
            "Buat struktur folder `skills/user/<skill-id>` dengan subdirektori terkait.",
            "Susun manifest `skill.json` yang mematuhi `SkillManifest` schemaVersion 1.",
            "Tulis `SKILL.md` lengkap mencakup seluruh 10 bab kontrak wajib.",
            "Jalankan `skill_validate` dan `skill_test` untuk memastikan lulus audit keamanan.",
            "Minta persetujuan pengguna sebelum menginstal atau mengaktifkan skill."
        ],
        "safety": ["Instalasi skill baru dan publikasi membutuhkan konfirmasi persetujuan pengguna."],
        "verification": ["Pastikan scanner keamanan mengembalikan status `passed` dengan risk_score rendah."],
        "output_contract": ["Paket skill baru yang terverifikasi dan siap digunakan."],
        "failure_handling": ["Bila validasi gagal, tampilkan daftar error manifest atau bab kontrak yang kurang."]
    },
    {
        "id": "plugin-mcp-manager",
        "name": "Plugin & MCP Manager",
        "version": "1.0.0",
        "description": "Menemukan, memasang, mengonfigurasi, menguji, menonaktifkan, dan menghapus plugin atau MCP server.",
        "tags": ["plugin", "mcp", "integrations"],
        "tools": ["plugin_list", "plugin_inspect", "plugin_install", "plugin_update", "plugin_remove", "mcp_test"],
        "optionalTools": [],
        "permissions": {
            "filesystem": "workspace-write",
            "network": "restricted",
            "shell": "sandboxed",
            "computerControl": "none"
        },
        "riskLevel": "critical",
        "requiresApprovalFor": ["plugin_install", "plugin_update", "plugin_remove", "credential_change", "permission_change"],
        "purpose": "Manajemen siklus hidup plugin dan server Model Context Protocol (MCP), konfigurasi transport, dan pengujian konektivitas.",
        "triggers": [
            "Pengguna ingin menambahkan integrasi tool eksternal via MCP.",
            "Pengelolaan status plugin aktif/nonaktif dan audit keamanan plugin.",
            "Pengujian koneksi server MCP stdio / SSE."
        ],
        "do_not_use": ["Memasang plugin dari sumber tidak tepercaya tanpa verifikasi checksum."],
        "inputs": ["Nama plugin / MCP identifier", "Konfigurasi transport (command, args, env)", "Izin yang diminta."],
        "workflow": [
            "Cari dan periksa metadata plugin dengan `plugin_inspect`.",
            "Evaluasi izin yang diminta dan lakukan pemindaian keamanan manifest.",
            "Dapatkan approval pengguna sebelum menjalankan instalasi dengan `plugin_install`.",
            "Uji koneksi tool dengan `mcp_test` untuk memastikan schema tool terbaca dengan benar.",
            "Laporkan status tool baru yang berhasil didaftarkan ke registry."
        ],
        "safety": ["Tingkat risiko CRITICAL. Pemasangan, pembaruan, dan penghapusan MCP membutuhkan approval ketat."],
        "verification": ["Verifikasi respons `tools/list` dari server MCP dengan exit code sehat."],
        "output_contract": ["Status plugin terpasang dan daftar tool baru yang tersedia."],
        "failure_handling": ["Jika koneksi gagal, periksa env var dan logging stderr server MCP."]
    }
]

def generate():
    target_dir = Path("/Users/ariardianto/Documents/AGENT/CODE/gateway/skills/bundled")
    target_dir.mkdir(parents=True, exist_ok=True)

    for skill in BUNDLED_SKILLS:
        s_dir = target_dir / skill["id"]
        s_dir.mkdir(parents=True, exist_ok=True)
        (s_dir / "references").mkdir(exist_ok=True)
        (s_dir / "scripts").mkdir(exist_ok=True)
        (s_dir / "assets").mkdir(exist_ok=True)

        manifest = {
            "schemaVersion": 1,
            "id": skill["id"],
            "name": skill["name"],
            "version": skill["version"],
            "description": skill["description"],
            "tags": skill["tags"],
            "scope": "bundled",
            "entrypoint": "SKILL.md",
            "enabledByDefault": True,
            "tools": skill["tools"],
            "optionalTools": skill["optionalTools"],
            "dependencies": {
                "commands": [],
                "runtimes": [],
                "plugins": [],
                "environmentVariables": []
            },
            "permissions": skill["permissions"],
            "riskLevel": skill["riskLevel"],
            "requiresApprovalFor": skill["requiresApprovalFor"],
            "compatibility": {
                "os": ["darwin", "linux", "win32"],
                "minAppVersion": "0.1.0"
            }
        }

        (s_dir / "skill.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        # Build SKILL.md with the 10 required sections
        tools_str = ", ".join(skill["tools"] + skill["optionalTools"]) if (skill["tools"] + skill["optionalTools"]) else "None"
        triggers_str = "\n".join(f"- {t}" for t in skill["triggers"])
        do_not_str = "\n".join(f"- {d}" for d in skill["do_not_use"])
        inputs_str = "\n".join(f"- {i}" for i in skill["inputs"])
        workflow_str = "\n".join(f"{idx}. {w}" for idx, w in enumerate(skill["workflow"], 1))
        safety_str = "\n".join(f"- {s}" for s in skill["safety"])
        verification_str = "\n".join(f"- {v}" for v in skill["verification"])
        output_str = "\n".join(f"- {o}" for o in skill["output_contract"])
        failure_str = "\n".join(f"- {f}" for f in skill["failure_handling"])

        skill_md = f"""---
name: {skill["name"]}
description: {skill["description"]}
version: {skill["version"]}
allowed_tools: [{", ".join(skill["tools"])}]
tags: [{", ".join(skill["tags"])}]
---

# {skill["name"]}

## Purpose
{skill["purpose"]}

## Trigger Conditions
{triggers_str}

## Do Not Use When
{do_not_str}

## Inputs
{inputs_str}

## Allowed Tools
Alat yang diizinkan dan dideklarasikan:
`{tools_str}`

## Workflow
{workflow_str}

## Safety and Approval Gates
{safety_str}

## Verification
{verification_str}

## Output Contract
{output_str}

## Failure Handling
{failure_str}
"""
        (s_dir / "SKILL.md").write_text(skill_md, encoding="utf-8")
        print(f"Generated bundled skill: {skill['id']}")

    # Also mirror or create symlink to root skills/bundled
    root_skills = Path("/Users/ariardianto/Documents/AGENT/CODE/skills/bundled")
    root_skills.mkdir(parents=True, exist_ok=True)
    for skill in BUNDLED_SKILLS:
        root_s_dir = root_skills / skill["id"]
        root_s_dir.mkdir(parents=True, exist_ok=True)
        (root_s_dir / "skill.json").write_text((target_dir / skill["id"] / "skill.json").read_text(encoding="utf-8"), encoding="utf-8")
        (root_s_dir / "SKILL.md").write_text((target_dir / skill["id"] / "SKILL.md").read_text(encoding="utf-8"), encoding="utf-8")

    print(f"Successfully generated all {len(BUNDLED_SKILLS)} bundled skills!")

if __name__ == "__main__":
    generate()
