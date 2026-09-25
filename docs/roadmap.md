# Roadmap

Penomoran modul bersifat final dan dipakai konsisten di seluruh dokumen & kode:

1. Presensi Siswa
2. Jurnal Harian Guru / Wali Kelas
3. RPP & Perangkat Pembelajaran + AI
4. Perpustakaan
5. Surat Masuk & Keluar

## Tahap 0 — Fondasi (status: berjalan — scope saat ini)

Dokumen & konfigurasi awal monorepo: README, CHANGELOG, `docker-compose.yml`
(`postgres`, `redis`, `minio`, `caddy`, `api`, `web`), `.env.example`, Caddyfile,
dokumen arsitektur/multi-tenancy/auth/AI/deployment/branding/database, dan
kerangka `packages/shared`. Belum ada implementasi kode aplikasi.

## Tahap 1 — Auth, Tenant & Platform

- Skema database fondasi + migrasi Prisma (`tenants`, `users`, `subscriptions`,
  `ai_models`, `plan_ai_models`, `ai_usage_logs`, `audit_logs`).
- Login `kode_sekolah` + `username` + `password` (argon2id), JWT 15 menit + refresh 7 hari.
- Guard peran: Owner | Admin/Kepala Sekolah | Guru | Pustakawan | TU.
- Isolasi tenant via Prisma middleware + `@@index([tenant_id, ...])`.
- Seed akun Owner (`SEED_OWNER_USERNAME`, `SEED_OWNER_PASSWORD`).

## Tahap 2 — Modul Inti Sekolah

- **Modul 1 — Presensi Siswa:** input presensi harian per kelas, rekap kehadiran.
- **Modul 2 — Jurnal Harian Guru / Wali Kelas:** pencatatan kegiatan mengajar harian.

## Tahap 3 — AI & Modul Pendukung

- **Modul 3 — RPP & Perangkat Pembelajaran + AI:** draf RPP berbantuan AI (SSE streaming),
  manajemen provider/model oleh Owner, kuota per paket, rate limit Redis.
- **Modul 4 — Perpustakaan:** katalog buku, peminjaman & pengembalian.
- **Modul 5 — Surat Masuk & Keluar:** registrasi surat, nomor agenda, lampiran di MinIO.

## Tahap 4 — Operasional & Scale

- Skrip backup `pg_dump` terjadwal di `infra/backup/` + uji restore.
- Observabilitas: log terpusat, metrik, alerting.
- Kesiapan scale sesuai trigger di `docs/deployment.md`
  (CPU/RAM DB > 70% kontinu → pisah DB; p95 API > 800 ms → tambah instance API;
  antrean ekspor > 5 menit → worker terpisah).
- Read replica bila beban baca tinggi.
