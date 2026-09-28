# Panduan Instalasi RekamEdu

Panduan langkah-demi-langkah menjalankan RekamEdu. Pilih **satu** lingkungan
di bawah — perintah intinya sama di semuanya karena seluruh tumpukan berjalan
di Docker Compose (`postgres`, `redis`, `minio`, `api`, `web`, `caddy`).

> Belum punya VPS? Tidak masalah. Mulai dari **Opsi A atau B** untuk uji coba
> lokal, pindah ke **Opsi C** saat VPS sudah tersedia.

## 1. Prasyarat

- Docker 24+ dan Docker Compose v2
- Git
- Spek minimal:
  - Uji coba lokal: 2 vCPU / 4 GB RAM
  - Produksi kecil: 4 vCPU / 8 GB RAM / 40 GB disk

## 2. Pilih lingkungan

| Opsi | Lingkungan | Cocok untuk |
|------|------------|-------------|
| A | Docker Desktop di PC/laptop | Uji coba tercepat, **tanpa VM** |
| B | VirtualBox + Ubuntu Server 24.04 | Simulasi VPS / latihan deployment |
| C | VPS (Debian/Ubuntu) | Produksi |

## 3. Langkah instalasi inti (semua opsi)

```bash
# 1. Clone repo
git clone https://github.com/falconafk31/RekamEdu.git
cd RekamEdu

# 2. Siapkan environment
cp .env.example .env
```

3. **Isi `.env`** (wajib diganti, jangan pakai nilai contoh):
   - `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET`: string acak min. 32 karakter,
     hasilkan dengan `openssl rand -hex 32`
   - `ENCRYPTION_KEY`: 64 karakter hex dari `openssl rand -hex 32`
   - `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` (min. 8 karakter)
   - `SEED_OWNER_PASSWORD` dan `SEED_DEMO_ADMIN_PASSWORD`: password kuat
   - `DOMAIN`:
     - Lokal (Opsi A/B): biarkan `rekamedu.local`
     - VPS (Opsi C): isi domain publik, mis. `sekolah.rekamedu.id`

```bash
# 4. Bangun dan jalankan semua service
docker compose up --build -d

# 5. Migrasi database
docker compose exec api npx prisma migrate deploy

# 6. Seed akun awal (instalasi baru)
docker compose exec api npm run prisma:seed
```

7. **Akses aplikasi:**
   - Lokal: tambahkan `127.0.0.1 rekamedu.local` (Opsi A) atau
     `<IP-VM> rekamedu.local` (Opsi B) ke file `hosts`, lalu buka
     `http://rekamedu.local`
   - VPS: buka `https://<domain>` — Caddy menerbitkan sertifikat TLS
     otomatis via Let's Encrypt
8. Login sebagai Owner dengan `SEED_OWNER_USERNAME` /
   `SEED_OWNER_PASSWORD` dari `.env`.

## 4. Catatan per opsi

### Opsi A — Docker Desktop (Windows/Mac/Linux)

Tidak perlu VM apa pun. Docker Desktop sudah menyertakan mesin Linux mini
di belakang layar. Satu-satunya penyesuaian adalah entri `hosts` ke
`127.0.0.1` seperti di atas.

### Opsi B — VirtualBox

1. Buat VM **Ubuntu Server 24.04** (4 vCPU / 8 GB RAM / 40 GB disk).
2. Install Docker di VM:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin
   sudo usermod -aG docker $USER   # lalu logout/login ulang
   ```
3. Jaringan VM:
   - **Bridged Adapter** (disarankan): VM mendapat IP se-LAN, bisa dibuka
     dari HP/laptop lain — enak untuk demo.
   - **NAT**: tambahkan port forwarding `80 → 80` (dan `443 → 443`
     bila perlu) di pengaturan VirtualBox.
4. Lanjut ke langkah instalasi inti di dalam VM.

### Opsi C — VPS (saat sudah tersedia)

1. Arahkan DNS `A record` domain ke IP publik VPS.
2. Buka port `80` dan `443` di firewall VPS.
3. Isi `DOMAIN` di `.env` dengan domain publik sebelum `docker compose up`.
4. Untuk strategi backup, restore, dan kapan harus scale, lihat
   [deployment.md](./deployment.md).

## 5. Verifikasi instalasi

```bash
docker compose ps            # semua service berstatus running/healthy
docker compose logs -f api   # pantau log backend bila ada masalah
```

Cek manual: halaman login tampil → login sebagai Owner berhasil →
dashboard termuat.

## 6. Troubleshooting

| Gejala | Penyebab umum / solusi |
|--------|------------------------|
| Port 80 sudah dipakai | Hentikan service lain yang memakai port 80, atau ubah mapping `ports` service `caddy` di `docker-compose.yml` |
| Caddy gagal dapat sertifikat (Opsi C) | Pastikan DNS sudah mengarah ke IP VPS dan port 80/443 terbuka |
| `prisma migrate deploy` gagal konek | Tunggu hingga `postgres` berstatus `healthy` (`docker compose ps`) |
| Lupa password Owner | Jalankan ulang seed, atau reset via database (CLI admin direncanakan Tahap 4) |
| Ingin cek file MinIO | Konsol MinIO di `http://<host>:9001` |

## 7. Update ke versi baru

```bash
git pull
docker compose up --build -d
docker compose exec api npx prisma migrate deploy
```
