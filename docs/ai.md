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
