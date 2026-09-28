# Changelog

Semua perubahan penting pada proyek ini dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

## [0.2.0] - 2026-09-28

### Ditambahkan — Tahap 1: migrasi Modul 1 (Presensi) & Modul 4 (Perpustakaan)

**Database (`apps/api/prisma/`):**
- 9 model baru, semua dengan `tenant_id` + index komposit dan terdaftar di
  `TENANT_SCOPED_MODELS` (isolasi otomatis via middleware): `Student`,
  `AttendanceLog`, `AcademicCalendar`, `AcademicPeriod`, `ClassHistory`,
  `TenantSetting`, `Book`, `BookLoan`, `LibraryVisit` (+ 6 enum baru).
- `User` diperluas: `nama`, `kelas` (wali kelas untuk role `GURU`) — memetakan
  tabel `users` aplikasi lama (`Admin`→`ADMIN`, `Guru`→`GURU`,
  `Pustakawan`→`PUSTAKAWAN`); tanpa tabel user duplikat.
- `AuditLog` diperluas: `tabelTerkait`, `recordId` — memetakan tabel
  `activity_logs` aplikasi lama.
- Migrasi SQL `prisma/migrations/0001_tahap1_presensi_perpus/migration.sql`.

**Backend (`apps/api/src/`):**
- `presensi/` — `PresensiModule` (41 file): 12 resource di `/api/presensi/*`
  (siswa, guru, input presensi + scan QR, rekap, rekap semester, kalender,
  periode, statistik, riwayat kelas, aktivitas, pengaturan). Guard
  JWT + tenant + subscription + role; guru dibatasi ke kelas walinya saat
  input; audit log pada mutasi penting.
- `perpus/` — `PerpusModule` (17 file): `/api/perpus/*` (buku, peminjaman
  dengan transaksi cek stok, pengembalian/terlambat/hilang, kunjungan,
  dashboard, kartu anggota). Role `ADMIN`/`KEPALA_SEKOLAH`/`PUSTAKAWAN`.
- `GET /api/auth/me` — profil user dari access token (hydrate sesi frontend).
- Verifikasi isolasi tenant: tanpa raw SQL, `tenant_id` tidak pernah diambil
  dari input user/DTO.

**Frontend (`apps/web/src/`):**
- Dependensi baru: `xlsx`, `jspdf`, `jspdf-autotable`, `chart.js`,
  `vue-chartjs`, `qrcode.vue`, `html5-qrcode`, `lucide-vue-next`.
- `lib/api.ts` — API client JWT (Bearer + auto-refresh via cookie, retry 1x).
- `stores/auth.ts` menggantikan `stores/session.ts` (user + role + cache
  localStorage, token hanya di memori).
- Router `/presensi/*` (13 view) dan `/perpus/*` (6 view) dengan guard role;
  `/dashboard` redirect cerdas per role; menu sidebar berkelompok
  Presensi/Perpustakaan.
- 19 view di-port dari aplikasi lama ke TypeScript **tanpa Supabase**:
  fitur dipertahankan — export Excel, cetak PDF (rekap, rekap semester,
  sirkulasi, kunjungan), scan QR, cetak kartu anggota + QR NISN, grafik.
- `lib/`: `dates`, `excel`, `pdf` (5 generator), `charts`; 8 komponen
  `components/ui`; `types.ts` bersama.

### Keputusan desain (dicatat, bukan diubah diam-diam)
- Satu-periode-aktif ditegakkan di service (transaction), bukan partial unique
  index lintas tenant.
- Rekap semester menurunkan rentang tanggal dari konvensi kalender pendidikan
  Indonesia (Ganjil = 1 Jul–31 Des, Genap = 1 Jan–30 Jun).
- `isTerlambat` = flag turunan (dipinjam + lewat tenggat); status tersimpan
  `terlambat` hanya saat pengembalian lewat tenggat.
- Zona waktu WIB eksplisit untuk "hari ini"/"bulan ini" di modul perpus.

## [0.1.0] - 2026-09-26

### Ditambahkan

- **Tahap 0 fondasi:** dokumen & konfigurasi awal monorepo RekamEdu.
- `README.md` — ringkasan produk, 5 modul, peran, stack, quickstart, daftar env vars.
- `docker-compose.yml` — layanan `postgres`, `redis`, `minio`, `caddy`, `api`, `web` dengan healthcheck PostgreSQL.
- `.env.example` — seluruh variabel environment fondasi dengan placeholder yang jelas.
- `.gitignore` — Node, dist, `.env`, log, `.DS_Store`, coverage.
- `.editorconfig` — UTF-8, LF, 2 spasi, trim trailing whitespace.
- `infra/caddy/Caddyfile` — `{$DOMAIN}`: `/api/*` ke `api:3000`, sisanya ke `web:80`.
- `infra/README.md` — isi direktori `infra/`.
- `docs/architecture.md`, `docs/multi-tenancy.md`, `docs/auth.md`, `docs/ai.md`, `docs/deployment.md`, `docs/branding.md`, `docs/roadmap.md`, `docs/database.md`.
- `packages/shared/README.md` + stub `package.json` (`@rekamedu/shared`, private).
