# Database — Tabel Fondasi & Modul

Skema memakai PostgreSQL 16, shared schema. Setiap tabel milik tenant wajib punya
kolom `tenant_id` dan index komposit `@@index([tenant_id, ...])`
(lihat `docs/multi-tenancy.md`). Tabel Modul 1 (Presensi) dan Modul 4
(Perpustakaan) didefinisikan pada **Tahap 1**; tabel Modul 2, 3, 5 didefinisikan pada
**Tahap 2+3** di bagian bawah dokumen.

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

Pengguna di dalam tenant. Username unik per tenant. **Tahap 1:** tabel `users`
aplikasi lama (`Admin`/`Guru`/`Pustakawan`) dipetakan ke tabel ini — kolom
`nama` dan `kelas` ditambahkan (assignment wali kelas untuk role `GURU`).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants, nullable | `NULL` khusus Owner platform; `ON DELETE CASCADE` |
| `username` | varchar | unik per `(tenant_id, username)` |
| `password_hash` | varchar | argon2id |
| `role` | enum | `OWNER` \| `ADMIN` \| `KEPALA_SEKOLAH` \| `GURU` \| `PUSTAKAWAN` \| `TU` |
| `nama` | varchar, nullable | nama tampilan |
| `kelas` | varchar, nullable | assignment wali kelas (role `GURU`) |
| `is_active` | boolean | default `true` |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@unique([tenant_id, username])`, `@@index([tenant_id])`.

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

Jejak aktivitas penting. **Tahap 1:** tabel `activity_logs` aplikasi lama
dipetakan ke tabel ini — kolom `tabel_terkait` dan `record_id` ditambahkan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | disuntik otomatis middleware tenant |
| `user_id` | varchar, nullable | |
| `aksi` | varchar | mis. `input_presensi`, `pinjam` |
| `tabel_terkait` | varchar, nullable | nama entitas terkait |
| `record_id` | varchar, nullable | id record terkait |
| `detail` | text, nullable | JSON detail tambahan |
| `created_at` | timestamptz | |

Index: `@@index([tenant_id, created_at])`.

---

# Tahap 1 — Modul 1 Presensi & Modul 4 Perpustakaan

Semua tabel di bawah memakai `tenant_id` (kolom scalar, tanpa relasi balik ke
`tenants` — mengikuti pola `ai_usage_logs`) dan terdaftar di
`TENANT_SCOPED_MODELS` pada `tenant.extension.ts` sehingga seluruh query
otomatis terisolasi per tenant.

## students

Data siswa per tenant (pengganti tabel `students` aplikasi lama).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | |
| `nisn` | varchar | unik per `(tenant_id, nisn)` |
| `nama` | varchar | |
| `jk` | enum `L`/`P`, nullable | |
| `kelas` | varchar, nullable | |
| `active` | boolean | default `true` |
| `status` | enum | `aktif` \| `lulus` \| `pindah` \| `keluar` |
| `tanggal_masuk` / `tanggal_keluar` | date, nullable | |
| `keterangan` | text, nullable | |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@unique([tenant_id, nisn])`, `@@index([tenant_id, kelas])`,
`@@index([tenant_id, status])`.

## attendance_logs

Catatan presensi harian — satu baris unik per siswa per tanggal.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | |
| `date` | date | |
| `student_id` | UUID FK → students | `ON DELETE CASCADE` |
| `status` | enum | `Hadir` \| `Izin` \| `Sakit` \| `Alfa` |
| `kelas` | varchar, nullable | snapshot kelas saat input |
| `guru_input` | varchar, nullable | username penginput |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@unique([tenant_id, date, student_id])`, `@@index([tenant_id, date])`.

## academic_calendar

Status hari (Masuk/Libur) per tanggal per tenant.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `tenant_id` | varchar | bagian dari PK komposit |
| `date` | date | bagian dari PK komposit |
| `status` | enum | `Masuk` \| `Libur`, default `Masuk` |

PK: `@@id([tenant_id, date])`.

## academic_periods

Periode tahun ajaran + semester; hanya satu yang aktif per tenant
(ditegakkan di service via transaction).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | |
| `tahun_ajaran` | varchar | mis. `2025/2026` |
| `semester` | enum | `Ganjil` \| `Genap` |
| `is_active` | boolean | default `false` |
| `created_at` | timestamptz | |

Index: `@@unique([tenant_id, tahun_ajaran, semester])`,
`@@index([tenant_id, is_active])`.

## class_history

Snapshot kelas siswa per tahun ajaran.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | |
| `student_id` | UUID FK → students | `ON DELETE CASCADE` |
| `tahun_ajaran` | varchar | |
| `kelas` / `wali_kelas` / `status` | varchar, nullable | |
| `created_at` | timestamptz | |

Index: `@@unique([tenant_id, student_id, tahun_ajaran])`,
`@@index([tenant_id, tahun_ajaran])`.

## tenant_settings

Satu baris pengaturan per tenant (pengganti `app_settings` satu baris global
di aplikasi lama).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar, unique | |
| `nama_sekolah` / `alamat` / `kepala_sekolah` / `nip_kepala_sekolah` | varchar, nullable | |
| `logo_url` | varchar, nullable | |
| `daftar_kelas` | jsonb | default `[]` |
| `kop_baris2` … `kop_baris5` | varchar, nullable | kop surat laporan |
| `nama_perpustakaan` | varchar, nullable | |
| `hari_libur_mingguan` | jsonb | default `[0, 6]` (Min=0 … Sab=6) |
| `updated_at` | timestamptz | |

## books

Katalog buku perpustakaan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | |
| `judul` | varchar | |
| `pengarang` / `penerbit` / `tahun_terbit` / `isbn` / `kategori` | varchar, nullable | |
| `stok` | integer | default `1` (jumlah eksemplar) |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@index([tenant_id, kategori])`, `@@index([tenant_id, judul])`.

## book_loans

Sirkulasi peminjaman. "Pinjaman aktif" = status `dipinjam`; `isTerlambat`
adalah flag turunan (`dipinjam` + hari ini > `tanggal_kembali_seharusnya`).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | |
| `book_id` | UUID FK → books | `ON DELETE CASCADE` |
| `student_id` | UUID FK → students | `ON DELETE CASCADE` |
| `tanggal_pinjam` | date | |
| `tanggal_kembali_seharusnya` | date | |
| `tanggal_kembali_aktual` | date, nullable | |
| `status` | enum | `dipinjam` \| `dikembalikan` \| `terlambat` \| `hilang`, default `dipinjam` |
| `guru_input` | varchar, nullable | username pencatat |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@index([tenant_id, status])`, `@@index([tenant_id, student_id])`,
`@@index([tenant_id, tanggal_pinjam])`.

## library_visits

Kunjungan siswa ke perpustakaan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | |
| `student_id` | UUID FK → students | `ON DELETE CASCADE` |
| `tanggal` | date | |
| `created_at` | timestamptz | |

Index: `@@index([tenant_id, tanggal])`, `@@index([tenant_id, student_id])`.

## Ringkasan endpoint Tahap 1

**Modul 1 — `/api/presensi`** (role: `ADMIN`/`KEPALA_SEKOLAH`/`GURU`;
guru dibatasi ke `kelas` walinya pada input presensi):

| Endpoint | Keterangan |
|----------|------------|
| `GET/POST /siswa`, `GET/PATCH/DELETE /siswa/:id` | CRUD siswa (delete = soft) |
| `GET/POST /guru`, `PATCH/DELETE /guru/:id`, `POST /guru/:id/reset-password` | kelola akun guru (admin) |
| `GET/POST /presensi`, `POST /presensi/scan` | input bulk + scan QR by NISN |
| `GET /rekap`, `GET /rekap-semester` | rekap harian & semester |
| `GET /kalender`, `PUT /kalender/:tanggal` | kalender akademik |
| `GET/POST /periode`, `PATCH /periode/:id/aktifkan` | periode tahun ajaran |
| `GET /statistik` | total + tren harian + per kelas |
| `GET/POST /riwayat-kelas` | snapshot kelas per tahun ajaran |
| `GET /aktivitas` | audit log (admin) |
| `GET/PUT /pengaturan` | pengaturan tenant (admin) |

**Modul 4 — `/api/perpus`** (role: `ADMIN`/`KEPALA_SEKOLAH`/`PUSTAKAWAN`):

| Endpoint | Keterangan |
|----------|------------|
| `GET/POST /buku`, `GET/PATCH/DELETE /buku/:id` | CRUD katalog |
| `GET/POST /peminjaman`, `POST /peminjaman/:id/kembali`, `POST /peminjaman/:id/hilang` | sirkulasi (transaksi stok) |
| `GET/POST /kunjungan`, `DELETE /kunjungan/:id` | kunjungan |
| `GET /dashboard` | statistik perpus |
| `GET /anggota/:nisn/kartu` | data kartu anggota |

**Auth tambahan:** `GET /api/auth/me` — profil user dari access token
(dipakai frontend untuk hydrate sesi: `nama`, `kelas`).

# Tahap 2+3 — Modul 2 Jurnal, Modul 3 RPP+AI, Modul 5 Surat

## jurnal

Jurnal harian guru/wali kelas.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | isolasi tenant |
| `tanggal` | date | |
| `user_id` | varchar | id User guru pembuat |
| `kelas` | varchar, nullable | |
| `mapel` | varchar, nullable | mata pelajaran |
| `materi` | varchar, nullable | |
| `catatan` | text, nullable | |
| `kehadiran` | jsonb, nullable | ringkas: `{"hadir":30,"izin":1,"sakit":0,"alfa":0}` |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@index([tenant_id, tanggal])`, `@@index([tenant_id, user_id, tanggal])`.

## dokumen_pembelajaran

RPP & perangkat pembelajaran (Modul 3). Dibuat manual atau via AI
(`ai_model_id` terisi bila dibantu AI).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | isolasi tenant |
| `jenis` | enum | `RPP` \| `SILABUS` \| `MODUL_AJAR` \| `LKPD` \| `SOAL` \| `LAINNYA` |
| `judul` | varchar | |
| `konten` | text | isi dokumen |
| `versi` | integer | naik +1 setiap update, default `1` |
| `status` | enum | `DRAFT` \| `FINAL` |
| `metadata` | jsonb, nullable | jenjang, fase, mapel, kelas, dsb. |
| `ai_model_id` | UUID FK → ai_models, nullable | `ON DELETE SET NULL` |
| `created_by` | varchar, nullable | id User pembuat |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@index([tenant_id, jenis])`, `@@index([tenant_id, status])`.

## surat

Surat masuk & keluar (Modul 5). Nomor surat dibuat otomatis per tahun
berjalan via `surat_counter` dalam satu transaksi.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | isolasi tenant |
| `jenis` | enum | `MASUK` \| `KELUAR` |
| `nomor_surat` | varchar | unik per tenant, mis. `007/SMK-RE/K/III/2026` |
| `tahun` | integer | tahun penomoran |
| `nomor_urut` | integer | urutan per tahun+jenis |
| `tanggal` | date | tanggal surat |
| `pengirim` | varchar, nullable | |
| `penerima` | varchar, nullable | |
| `perihal` | varchar | |
| `ringkasan` | text, nullable | |
| `lampiran_url` | varchar, nullable | URL file di MinIO (upload presigned tahap lanjut) |
| `status` | varchar | default `arsip` |
| `created_by` | varchar, nullable | id User pencatat |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@unique([tenant_id, nomor_surat])`,
`@@unique([tenant_id, tahun, jenis, nomor_urut])`,
`@@index([tenant_id, jenis, tanggal])`.

## surat_counter

Counter penomoran surat per tenant, per tahun, per jenis.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `tenant_id` | varchar | bagian PK komposit |
| `tahun` | integer | bagian PK komposit |
| `jenis` | enum | bagian PK komposit |
| `terakhir` | integer | nomor terakhir yang dipakai, default `0` |

PK: `(tenant_id, tahun, jenis)`.

## surat_templates

Template surat yang bisa dipakai ulang (placeholder `{{nomor}}`,
`{{tanggal}}`, `{{perihal}}`, `{{pengirim}}`, `{{penerima}}`,
`{{namaSekolah}}`, `{{tahun}}`).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `tenant_id` | varchar | isolasi tenant |
| `nama` | varchar | nama template |
| `isi` | text | isi dengan placeholder |
| `created_at` / `updated_at` | timestamptz | |

Index: `@@index([tenant_id])`.

## Ringkasan endpoint Tahap 2+3

**Modul 2 — `/api/jurnal`** (role: `ADMIN`/`KEPALA_SEKOLAH`/`GURU`;
guru hanya melihat jurnal miliknya sendiri):

| Endpoint | Keterangan |
|----------|------------|
| `GET/POST /` | daftar (filter tanggal/kelas/mapel) + buat |
| `GET /rekap` | rekap per periode (per guru & per kelas) |
| `GET/PATCH/DELETE /:id` | detail, ubah, hapus |

**Modul 3 — `/api/rpp`** (role: `ADMIN`/`KEPALA_SEKOLAH`/`GURU`):

| Endpoint | Keterangan |
|----------|------------|
| `GET/POST /dokumen`, `GET/PATCH/DELETE /dokumen/:id` | CRUD dokumen (update = versi+1) |
| `GET /ai/models` | model AI yang diizinkan paket tenant (tanpa API key) |
| `POST /ai/generate` | generate RPP via AI, streaming SSE, kuota harian per tenant |

**Modul 5 — `/api/surat`** (role: `ADMIN`/`KEPALA_SEKOLAH`/`TU`):

| Endpoint | Keterangan |
|----------|------------|
| `GET/POST /` | daftar (filter jenis/pencarian/tanggal) + buat (nomor otomatis) |
| `GET/PATCH/DELETE /:id` | detail, ubah, hapus |
| `POST /:id/render` | render surat dengan template (placeholder) |
| `GET/POST /template`, `GET/PATCH/DELETE /template/:id` | CRUD template surat |

**Owner — `/api/owner`** (role: `OWNER` saja, tanpa subscription guard):

| Endpoint | Keterangan |
|----------|------------|
| `GET /tenants`, `GET/PATCH /tenants/:id` | daftar tenant + kelola paket/status manual |
| `GET/POST /ai-models`, `PATCH/DELETE /ai-models/:id` | CRUD model AI (key terenkripsi, tak pernah ke frontend) |
| `GET/POST /plan-models`, `DELETE /plan-models/:id` | izin model AI per paket |
| `GET /usage`, `GET /usage/ringkasan` | agregat pemakaian AI per tenant |
