# Protocol Specification — Nusa Agent

Gateway mengimplementasikan antarmuka ganda:
1. **REST API**: Operasi CRUD sinkron (proyek, konfigurasi, riwayat task).
2. **WebSocket Realtime Bus (`/ws/events`)**: Streaming dua arah untuk interaksi task, output model token-by-token, approval requests, dan sub-agent events.

---

## 1. WebSocket Inbound Messages (Client -> Gateway)

Setiap pesan dari client memiliki format JSON dengan tipe diskriminan `action`:

### 1.1 `task.create`
```json
{
  "action": "task.create",
  "project_id": "proj-uuid",
  "goal": "Tambahkan fungsi validasi email di utils.py dan jalankan pytest"
}
```

### 1.2 `task.steer` (Mid-Turn Steering)
Mengirim instruksi koreksi saat task sedang berjalan.
```json
{
  "action": "task.steer",
  "task_id": "task-uuid",
  "message": "Gunakan regex RFC 5322 untuk validasi email"
}
```

### 1.3 `task.cancel`
```json
{
  "action": "task.cancel",
  "task_id": "task-uuid",
  "reason": "Dibatalkan oleh pengguna"
}
```

### 1.4 `approval.respond`
Memberikan keputusan persetujuan pengguna untuk tool call tertentu.
```json
{
  "action": "approval.respond",
  "approval_id": "appr-uuid",
  "decision": "approved" // atau "rejected"
}
```

---

## 2. WebSocket Outbound Events (Gateway -> Client)

Semua event dari Gateway memiliki struktur:
```json
{
  "event": "string",
  "task_id": "task-uuid",
  "timestamp": "2026-09-14T04:00:00Z",
  "payload": {}
}
```

### Tipe Event:
- `task.created`: Task baru telah terdaftar di database.
- `task.state_changed`: Perubahan state machine (`old_state` -> `new_state`).
- `message.delta`: Chunk teks/alasan dari model untuk streaming UI.
- `tool.call_started`: Model memulai eksekusi tool tertentu dengan argumen.
- `tool.approval_required`: Agen berhenti, menunggu user merespon approval card.
- `tool.call_completed`: Tool selesai berjalan beserta output dan durasinya.
- `artifact.created`: Artifact baru dihasilkan (misal file diff, implementation plan).
- `subagent.spawned`: Sub-agent baru diluncurkan untuk tugas paralel.
- `subagent.completed`: Sub-agent menyelesaikan tugasnya dan mengembalikan struktur hasil.
- `task.completed`: Task berhasil diselesaikan dan lolos tahap verifikasi.
- `task.failed`: Task gagal diselesaikan atau dibatalkan.
