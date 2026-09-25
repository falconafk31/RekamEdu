# Database — Tabel Fondasi

Skema memakai PostgreSQL 16, shared schema. Setiap tabel milik tenant wajib punya
kolom `tenant_id` dan index komposit `@@index([tenant_id, ...])`
(lihat `docs/multi-tenancy.md`). Tabel modul 1–5 didefinisikan pada Tahap 2–3.

## tenants

Sekolah yang berlangganan (satu tenant = satu sekolah).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `kode_sekolah` | varchar, unique | Kode login sekolah, mis. `SMA-001` |
| `nama` | varchar | Nama sekolah |
| `alamat` | text, nullable | |
| `telepon` | varchar, nullable | |
| `email` | varchar, nullable | |
| `logo_url` | varchar, nullable | Logo di MinIO |
| `is_active` | boolean | default `true` |
| `created_at` / `updated_at` | timestamptz | |

## users

Pengguna di dalam tenant. Username unik per tenant.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | `ON DELETE CASCADE` |
| `username` | varchar | unik per `(tenant_id, username)` |
| `password_hash` | varchar | argon2id |
| `nama_lengkap` | varchar | |
| `role` | enum | `ADMIN` \| `GURU` \| `PUSTAKAWAN` \| `TU` |
| `is_active` | boolean | default `true` |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@unique([tenant_id, username])`, `@@index([tenant_id, role])`.

> Catatan: akun **Owner platform** tidak terikat tenant — disimpan di tabel terpisah
> `platform_users` (tanpa `tenant_id`, role `OWNER`) agar tidak tercampur data sekolah.

## subscriptions

Langganan/paket tiap tenant.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | `ON DELETE CASCADE` |
| `plan` | enum | mis. `BASIC` \| `PRO` \| `ENTERPRISE` |
| `status` | enum | `ACTIVE` \| `SUSPENDED` \| `EXPIRED` |
| `started_at` / `ends_at` | timestamptz | Masa berlaku paket |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@index([tenant_id, status])`.

## ai_models

Katalog model AI milik platform. Dikelola Owner; **tanpa `tenant_id`**.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `provider` | varchar | mis. `openai`, `anthropic` |
| `model_name` | varchar | mis. `gpt-4o-mini` |
| `api_key_encrypted` | text | API key terenkripsi AES-256-GCM |
| `price_per_1k_tokens` | numeric, nullable | Untuk perhitungan biaya |
| `is_active` | boolean | default `true` |
| `created_at` / `updated_at` | timestamptz | |

## plan_ai_models

Relasi paket langganan → model AI yang diizinkan. Dikelola Owner.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `plan` | enum | sama dengan enum plan di `subscriptions` |
| `ai_model_id` | UUID FK → ai_models | `ON DELETE CASCADE` |
| `monthly_token_quota` | integer | Kuota token per bulan untuk kombinasi plan+model |

Unique: `@@unique([plan, ai_model_id])`.

## ai_usage_logs

Log pemakaian AI per tenant — dasar kuota & audit.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | `ON DELETE CASCADE` |
| `user_id` | UUID FK → users | nullable (set null on delete) |
| `ai_model_id` | UUID FK → ai_models | |
| `prompt_tokens` / `completion_tokens` | integer | |
| `cost` | numeric, nullable | Estimasi biaya |
| `created_at` | timestamptz | |

Index: `@@index([tenant_id, created_at])`, `@@index([tenant_id, ai_model_id, created_at])`.

## audit_logs

Jejak aktivitas penting (login, perubahan data sensitif, aksi Owner).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants, nullable | null untuk aksi level platform (Owner) |
| `user_id` | UUID FK → users, nullable | |
| `action` | varchar | mis. `auth.login`, `user.create` |
| `entity` / `entity_id` | varchar, nullable | Objek yang dikenai aksi |
| `metadata` | jsonb, nullable | Detail tambahan |
| `created_at` | timestamptz | |

Index: `@@index([tenant_id, created_at])`, `@@index([action, created_at])`.
