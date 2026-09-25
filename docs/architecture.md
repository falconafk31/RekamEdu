# Arsitektur

## Gambaran Umum

RekamEdu dibangun sebagai **monolith modular** agar mudah dioperasikan pada satu VPS,
namun terstruktur per modul sehingga bisa dipecah per layanan di masa depan.

- **Backend (`apps/api`):** NestJS (Node.js + TypeScript). Satu aplikasi, dibagi menjadi
  modul per fitur: `auth`, `tenants`, `subscriptions`, `presensi`, `jurnal`, `rpp`,
  `perpustakaan`, `surat`, `ai`. Setiap modul punya controller, service, dan repository Prisma.
- **Frontend (`apps/web`):** Vue 3 Single Page Application (Vite + Tailwind CSS + Pinia).
  Berkomunikasi dengan backend hanya melalui REST API di prefix `/api`.
- **Database:** satu klaster PostgreSQL 16 dengan **shared schema** (lihat `docs/multi-tenancy.md`).
- **Redis:** cache sesi/JWKS? tidak — Redis dipakai untuk cache ringan, rate limit AI,
  dan antrean pekerjaan latar (mis. ekspor data) via BullMQ.
- **MinIO:** object storage S3-compatible untuk file (dokumen surat, lampiran, cover buku, dst).
- **Caddy:** reverse proxy + TLS otomatis di depan API dan Web.

## Diagram Alir Request

```
                          +------------------+
                          |     Pengguna       |
                          +--------+-----------+
                                   |  HTTPS
                                   v
                          +--------+-----------+
                          |  Caddy (:80/:443)  |
                          |  TLS otomatis      |
                          +---+------------+---+
                              |            |
                    /api/*    |            |  /*
                              v            v
                    +---------+--+   +-----+------+
                    |  api:3000    |   |  web:80 (nginx)|
                    |  NestJS      |   |  Vue SPA       |
                    +---+------+---+   +--------------+
                        |      |
            +-----------+      +-----------+
            |                              |
            v                              v
   +--------+---------+            +-------+--------+
   | PostgreSQL 16    |            | Redis          |
   | (tenant_id di    |            | (cache, rate   |
   | semua tabel)     |            |  limit, queue) |
   +--------+---------+            +----------------+
            |
            v
   +--------+---------+
   | MinIO (:9000)    |
   | file/lampiran    |
   +------------------+
```

## Prinsip

1. **Satu deploy, satu repo.** Monorepo: `apps/api`, `apps/web`, `packages/shared`, `infra/`, `docs/`.
2. **Kode bersama di `packages/shared`.** Tipe DTO, konstanta peran/modul, dan util validasi dipakai
   bersama oleh API dan Web agar kontrak API konsisten.
3. **Tenant isolation di backend.** Frontend tidak dipercaya untuk memfilter data tenant;
   isolasi ditegakkan di NestJS (guard + request context + Prisma middleware). Lihat `docs/multi-tenancy.md`.
4. **Stateless API.** Sesi login memakai JWT (access token + refresh token di cookie httpOnly).
   Lihat `docs/auth.md`.
5. **AI terpusat di Owner.** API key provider AI dienkripsi dan hanya dikelola Owner platform;
   tenant memilih model sesuai paketnya. Lihat `docs/ai.md`.
