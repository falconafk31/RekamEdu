# AGENTS.md — RekamEdu

> Panduan kerja untuk AI agent yang membangun atau memodifikasi repo ini.
> Detail lengkap ada di `docs/`; file ini berisi aturan yang **tidak boleh dilanggar**.

## Stack (terkunci — jangan diganti tanpa konfirmasi pemilik produk)

- Frontend: Vue 3 + TypeScript + Vite + Tailwind + Pinia (`apps/web`)
- Backend: Node.js + TypeScript + NestJS (`apps/api`)
- ORM: Prisma **5.22.0** (dipin — isolasi tenant memakai middleware `$use`
  yang tidak tersedia dengan cara yang sama di Prisma 6)
- Database: PostgreSQL 16; Redis (cache/rate-limit/antrean); MinIO (object storage)
- Deploy: Docker Compose + Caddy di satu VPS (`docker-compose.yml`, `infra/caddy/`)
- **DILARANG**: Laravel/PHP, Supabase, Firebase sebagai backend, font Inter

## Multi-tenant (aturan keras)

- Setiap tabel data tenant **WAJIB** punya `tenant_id` + index komposit `(tenant_id, ...)`.
- Isolasi tenant di-enforce di **backend** (Prisma middleware + guard +
  AsyncLocalStorage tenant context), **bukan** di frontend.
- Jangan pernah menulis query lintas tenant tanpa filter tenant.
- Paket: `trial` / `pro` / `custom`; tenant `expired`/`suspended` diblokir
  subscription guard.

## Role & modul

- Role: `owner` (platform) | `admin` (seluruh modul tenant) |
  `guru` (modul 1,2,3) | `pustakawan` (modul 4) | `tu` (modul 5)
- Penomoran modul: 1=Presensi, 2=Jurnal Guru, 3=RPP+AI, 4=Perpustakaan, 5=Surat

## Auth

- Login: `kode_sekolah` + `username` + `password` (hash Argon2id)
- JWT access token pendek + refresh token di cookie httpOnly

## UI

- Font: **Plus Jakarta Sans** (body/heading), **IBM Plex Mono** (angka/tabel).
  Jangan pakai Inter.
- Warna: menu aktif, tombol primer, indikator status = emerald `rgb(4 120 87)`;
  cyan/toska hanya untuk brand/logo.
- Tema Terang/Gelap/Otomatis, default Terang; latar putih.
- Seluruh teks Bahasa Indonesia.
- Hindari estetika generik AI (tanpa gradien ungu, tanpa glassmorphism);
  dashboard padat dan fungsional.

## AI terpusat

- API key provider AI hanya dipegang Owner (`ai_models`, terenkripsi AES-256-GCM);
  key **tidak pernah** dikirim ke frontend.
- Tenant hanya memilih model yang diizinkan paketnya (`plan_ai_models`).
- Catat pemakaian di `ai_usage_logs`; rate limit/kuota per tenant via Redis.

## Alur kerja

- Setelah mengubah skema Prisma: `npx prisma validate`
- Validasi backend: `npm run build` dan `npm run lint` di `apps/api`
- Validasi frontend: `npx vue-tsc --noEmit` dan `npm run build` di `apps/web`
- Migrasi: `npx prisma migrate dev` (pengembangan), `npx prisma migrate deploy` (deploy)
- Cara instalasi lokal/VPS: `docs/instalasi.md`
- Setiap fitur/perubahan: catat di `CHANGELOG.md`; keputusan arsitektur baru
  dicatat di `docs/` yang relevan

## Struktur monorepo

- `apps/api` — backend NestJS
- `apps/web` — frontend Vue 3 SPA
- `packages/shared` — kode bersama
- `infra/caddy` — konfigurasi reverse proxy
- `docs/` — arsitektur, multi-tenancy, auth, AI, deployment, database, instalasi
