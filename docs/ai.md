# AI (RPP & Perangkat Pembelajaran + AI)

Modul 3 memakai AI untuk membantu guru menyusun RPP dan perangkat pembelajaran.
Pengelolaan AI bersifat **tersentralisasi di Owner platform** — tenant tidak pernah
menyentuh API key.

## Peran

- **Owner:** mendaftarkan provider (mis. OpenAI, Anthropic, dsb.), memilih model,
  menyimpan API key, dan menentukan model mana yang boleh dipakai tiap paket langganan.
- **Tenant (sekolah):** hanya memilih model dari daftar yang diizinkan paketnya.
  Tidak bisa menambah provider atau melihat API key.

## Keamanan API Key

- API key provider disimpan di database **terenkripsi AES-256-GCM** memakai `ENCRYPTION_KEY`
  (64 karakter hex = 32 byte, lihat `.env.example`).
- **Kunci enkripsi dan API key tidak pernah dikirim ke frontend** — dekripsi hanya terjadi
  di memori backend saat memanggil provider.
- Endpoint manajemen provider/model hanya bisa diakses peran `OWNER`.

## Tabel

| Tabel | Fungsi |
|-------|--------|
| `ai_models` | Katalog model AI milik platform (provider, nama model, harga/token, aktif). |
| `plan_ai_models` | Relasi paket langganan → model yang diizinkan untuk paket tersebut. |
| `ai_usage_logs` | Log setiap pemanggilan AI: `tenant_id`, `user_id`, model, jumlah token, biaya, timestamp. Dipakai untuk kuota & audit. |

## Streaming & Rate Limit

- Respons AI di-streaming ke frontend via **Server-Sent Events (SSE)** agar guru melihat
  hasil draf RPP secara bertahap.
- **Rate limit per tenant** memakai Redis (token bucket per `tenant_id` + model),
  mencegah satu sekolah menghabiskan kuota bersama.
- Batas kuota bulanan per paket dicek terhadap `ai_usage_logs` sebelum request diteruskan
  ke provider; jika kuota habis, API mengembalikan `429` dengan pesan Bahasa Indonesia.

## Master data naungan → jenjang → mapel

Sumber kebenaran tunggal: `apps/api/src/rpp/ai/master-data.ts`
(**jangan** hardcode daftar mapel di komponen frontend).

- **Naungan**: `kemendikdasmen` (Sekolah Umum: SD/SMP/SMA/SMK) dan
  `kemenag` (Madrasah: MI/MTs/MA). Madrasah menambahkan mapel agama
  (Al-Qur'an Hadits, Akidah Akhlak, Fikih, SKI, Bahasa Arab) sesuai KMA 183/2019.
- Backend mengekspos `GET /api/rpp/ai/master-data` (ter-guard seperti endpoint
  AI lain); frontend memakai respons ini untuk dropdown berjenjang
  naungan → jenjang → kelas → mapel.
- Backend memvalidasi kombinasi `naungan → jenjang → kelas → mapel` terhadap
  master data sebelum generate (`validasiKonteksRpp`); kombinasi salah
  ditolak dengan `400` dan pesan Bahasa Indonesia.
- Fungsi `faseUntuk()` memetakan jenjang+kelas ke fase Kurikulum Merdeka
  (A–F) dan disuntik otomatis ke prompt.

## Template prompt bercabang per naungan

Builder: `apps/api/src/rpp/ai/rpp-prompt.ts` (`buildRppPrompt`).
Tuning dilakukan **murni lewat prompt engineering + master data**, tanpa
fine-tuning model.

- System prompt menyuntik: naungan, kurikulum, fase, regulasi acuan per naungan,
  dan kekhasan madrasah (untuk mapel rumpun PAI/Bahasa Arab).
- Regulasi Kemendikdasmen: Permendikbudristek 12/2024, Kepmendikbudristek
  008/M/2022 jo. 262/M/2022 (CP), Kepmendikbudristek 009/M/2022 (P5).
- Regulasi Kemenag: KMA 183/184/185/2019, KMA 347/2022 jo. KMA 450/2024
  (Kurikulum Merdeka pada madrasah), P5-PPRA (Profil Pelajar Pancasila +
  Rahmatan lil 'Alamin) sebagai pengganti P5.
- Struktur keluaran: Informasi Umum → **CP → TP → ATP** → Pemahaman Bermakna →
  Pertanyaan Pemantik → Kegiatan Pembelajaran (berdiferensiasi:
  konten/proses/produk) → Asesmen **formatif & sumatif** (+ KKTP) →
  Pengayaan & Remedial → Refleksi Guru.
