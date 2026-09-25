# Deployment

## Target: Single VPS

RekamEdu di-deploy sebagai **satu tumpukan Docker Compose di satu VPS**:

- Service: `postgres`, `redis`, `minio`, `api`, `web`, `caddy` (lihat `docker-compose.yml`).
- **Caddy** menjadi pintu masuk tunggal (`:80`/`:443`) dengan **TLS otomatis**
  (Let's Encrypt) begitu `DOMAIN` diisi domain publik.
- API hanya di-expose ke jaringan internal compose; publik mengaksesnya lewat `{$DOMAIN}/api/*`.

## Rilis

1. `cp .env.example .env` lalu isi secret production (JWT secrets, `ENCRYPTION_KEY`,
   `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `DOMAIN`).
2. `docker compose up --build -d`
3. Jalankan migrasi Prisma: `docker compose exec api npx prisma migrate deploy`
4. Jalankan seed Owner bila instalasi baru.

## Backup

- **Backup database terjadwal** dengan `pg_dump` (rencana skrip di `infra/backup/`, Tahap 4):
  harian, retensi 7 hari, salinan mingguan retensi 4 minggu.
- Backup disimpan di luar VPS (object storage terpisah / server backup).
- File MinIO (`miniodata`) di-backup via snapshot volume / `mc mirror` terjadwal.
- Uji restore dilakukan berkala — backup yang tidak pernah diuji restore dianggap tidak ada.

## Trigger Scale

Tumpukan single VPS dipertahankan selama metrik sehat. Eskalasi dilakukan bila:

| Sinyal | Ambang | Tindakan |
|--------|--------|----------|
| CPU/RAM database | > 70% **kontinu** | Pisahkan PostgreSQL ke server/klaster tersendiri |
| Latensi API p95 | > 800 ms | Tambah instance `api` (scale horizontal di balik Caddy/load balancer) |
| Antrean ekspor > 5 menit | Job menumpuk | Pisahkan worker antrean ke service tersendiri |

Keputusan scale dicatat di CHANGELOG pada rilis terkait.
