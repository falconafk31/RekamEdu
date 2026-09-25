# RekamEdu

**"Setiap Aktivitas, Tercatat untuk Masa Depan"**
_Digitalisasi Sekolah Tanpa Ribet_

RekamEdu adalah platform SaaS administrasi sekolah yang mendigitalkan pencatatan aktivitas harian sekolah: presensi siswa, jurnal guru, perangkat pembelajaran berbantuan AI, perpustakaan, dan persuratan. Satu dashboard per sekolah, satu basis data per tenant, tanpa kerumitan instalasi.

## Modul (penomoran final)

| No | Modul | Peran |
|----|-------|-------|
| 1 | Presensi Siswa | Guru |
| 2 | Jurnal Harian Guru / Wali Kelas | Guru |
| 3 | RPP & Perangkat Pembelajaran + AI | Guru |
| 4 | Perpustakaan | Pustakawan |
| 5 | Surat Masuk & Keluar | TU |

## Peran

- **Owner (platform):** mengelola seluruh tenant, paket/langganan, dan provider AI.
- **Admin / Kepala Sekolah:** akses penuh atas seluruh sistem di tenant sekolahnya.
- **Guru:** Modul 1, 2, 3.
- **Pustakawan:** Modul 4.
- **TU:** Modul 5.

## Tech Stack

- **Web:** Vue 3 SPA + Vite + Tailwind CSS + Pinia (`apps/web`)
- **API:** Node.js + TypeScript + NestJS + Prisma (`apps/api`)
- **Database:** PostgreSQL 16
- **Cache/queue:** Redis
- **Object storage:** MinIO
- **Reverse proxy:** Caddy (TLS otomatis)
- **Infrastruktur:** Docker Compose (single VPS)

## Struktur Repo

```
rekamedu/
├── apps/
│   ├── api/            # Backend NestJS + Prisma
│   └── web/            # Frontend Vue 3 SPA
├── packages/
│   └── shared/         # Kode bersama (types, util) — dipakai api & web
├── infra/
│   └── caddy/          # Caddyfile
├── docs/               # Dokumentasi arsitektur
├── docker-compose.yml
└── .env.example
```

## Quickstart

```bash
# 1. Salin contoh environment
cp .env.example .env

# 2. Bangun & jalankan semua layanan
docker compose up --build

# 3. Akses
# - Web (via Caddy):  http://rekamedu.local  (atau DOMAIN yang diset)
# - API:              http://localhost:3000/api
# - MinIO Console:    http://localhost:9001
```

> Catatan: untuk akses via `rekamedu.local`, tambahkan `127.0.0.1 rekamedu.local` ke `/etc/hosts` pada pengembangan lokal.

Setelah layanan berjalan, jalankan migrasi Prisma dan seed (lihat README `apps/api` pada Tahap 1).

## Environment Variables

Daftar variabel penting di `.env` (lihat `.env.example` untuk nilai contoh):

| Variabel | Deskripsi |
|----------|-----------|
| `DATABASE_URL` | Koneksi PostgreSQL, format `postgresql://user:pass@postgres:5432/rekamedu` |
| `REDIS_URL` | Koneksi Redis, format `redis://redis:6379` |
| `JWT_ACCESS_SECRET` | Secret JWT access token (wajib ≥ 32 karakter acak) |
| `JWT_REFRESH_SECRET` | Secret JWT refresh token (wajib ≥ 32 karakter acak, berbeda dari access) |
| `MINIO_ENDPOINT` | Endpoint S3 MinIO, mis. `http://minio:9000` |
| `MINIO_ROOT_USER` | Username root MinIO |
| `MINIO_ROOT_PASSWORD` | Password root MinIO (min. 8 karakter) |
| `ENCRYPTION_KEY` | Kunci 64 karakter hex (32 byte) untuk AES-256-GCM — mengenkripsi API key provider AI |
| `DOMAIN` | Domain publik untuk Caddy, mis. `rekamedu.local` (dev) |
| `APP_PORT` | Port publik API pada dev lokal (`3000`) |
| `SEED_OWNER_USERNAME` | Username akun Owner hasil seed (default `owner`) |
| `SEED_OWNER_PASSWORD` | Password akun Owner hasil seed |
| `SEED_DEMO_ADMIN_PASSWORD` | Password akun Admin demo hasil seed |

## Dokumentasi

- `docs/architecture.md` — arsitektur monolith modular + diagram alir request
- `docs/multi-tenancy.md` — isolasi tenant (shared schema + `tenant_id`)
- `docs/auth.md` — login & JWT
- `docs/ai.md` — pengelolaan provider AI oleh Owner
- `docs/deployment.md` — VPS + Caddy, backup, trigger scale
- `docs/branding.md` — identitas visual
- `docs/roadmap.md` — Tahap 0 s.d. 4
- `docs/database.md` — tabel fondasi

## Lisensi

Proprietary. Hak cipta RekamEdu.
