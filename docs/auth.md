# Autentikasi

## Skema Login

Pengguna login dengan **tiga kredensial**: `kode_sekolah` + `username` + `password`.

- `kode_sekolah`: kode unik per tenant (mis. `SMA-001`), menentukan tenant yang dituju.
- `username`: unik di dalam tenant.
- `password`: di-hash dengan **argon2id** (tidak pernah disimpan plain).

Alur: server mencari tenant dari `kode_sekolah` → mencari user dari `(tenant_id, username)` →
verifikasi password dengan argon2id → terbitkan token.

## Token

| Token | Masa berlaku | Penyimpanan |
|-------|:---:|------------|
| Access token (JWT) | 15 menit | Memory frontend (state Pinia), dikirim via header `Authorization: Bearer` |
| Refresh token (JWT) | 7 hari | Cookie `httpOnly`, `SameSite=Lax`, `Secure` di production |

- Payload access token memuat: `sub` (user id), `tenant_id`, `role`, `kode_sekolah`.
- Refresh token disimpan ter-hash di database agar bisa dicabut (logout / ganti password).
- Rotasi: setiap pemakaian refresh token yang valid menerbitkan pasangan token baru
  dan menginvalidasi refresh token lama.

## Endpoint

| Method & Path | Fungsi |
|---------------|--------|
| `POST /api/auth/login` | Login dengan `kode_sekolah`, `username`, `password` |
| `POST /api/auth/refresh` | Tukar refresh token (cookie) dengan pasangan token baru |
| `POST /api/auth/logout` | Cabut refresh token & hapus cookie |

## Secrets

- `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET`: string acak ≥ 32 karakter, **berbeda satu sama lain**,
  diisi via environment (lihat `.env.example`).
- Password user di-hash dengan argon2id (parameter OWASP yang direkomendasikan).
- Password seed awal (`SEED_OWNER_PASSWORD`, `SEED_DEMO_ADMIN_PASSWORD`) hanya untuk
  bootstrap Tahap 1 dan wajib diganti setelah login pertama.
