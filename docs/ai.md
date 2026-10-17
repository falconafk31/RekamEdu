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
- **Mapel baru**: `Koding dan Kecerdasan Artifisial (Pilihan)` tersedia di
  semua jenjang, TA 2025/2026 bertahap sesuai kesiapan satuan pendidikan
  (Kemendikdasmen: Pasal 32A Permendikdasmen 13/2025; Kemenag: KMA 1503/2025 —
  MI kelas 5-6, MTs VII-IX, MA X + rumpun Teknologi XI-XII; panduan
  implementasi Kemenag masih draf, pilot MI disiapkan).
- Backend mengekspos `GET /api/rpp/ai/master-data` (ter-guard seperti endpoint
  AI lain); frontend memakai respons ini untuk dropdown berjenjang
  naungan → jenjang → kelas → mapel.
- Backend memvalidasi kombinasi `naungan → jenjang → kelas → mapel` terhadap
  master data sebelum generate (`validasiKonteksRpp`); kombinasi salah
  ditolak dengan `400` dan pesan Bahasa Indonesia.
- Fungsi `faseUntuk()` memetakan jenjang+kelas ke fase Kurikulum Merdeka
  (A–F) dan disuntik otomatis ke prompt.

## Template prompt: dua template, satu mesin inti

Builder: `apps/api/src/rpp/ai/rpp-prompt.ts` (`buildRppPrompt`).
Tuning dilakukan **murni lewat prompt engineering + master data**, tanpa
fine-tuning model.

Hasil riset (17 Okt 2026): **RPP dan Modul Ajar adalah dokumen berbeda** —
RPP istilah era K13 (Permendikbud 22/2016, sudah dicabut; turunan
silabus/KD, format per pertemuan), Modul Ajar istilah resmi Kurikulum
Merdeka (Kepmendikbudristek 56/M/2022, turunan fase/CP/ATP, format per
unit/topik). Keduanya berbagi inti wajib yang sama (tujuan–langkah–asesmen),
sehingga dipakai **dua template dengan satu mesin inti yang sama**:

- **Template RPP** (`jenis=RPP`): 10 komponen — Informasi Umum → CP → TP →
  ATP → Pemahaman Bermakna → Pertanyaan Pemantik → Kegiatan Pembelajaran
  (berdiferensiasi: konten/proses/produk; penutup mengaitkan dimensi profil
  lulusan + saran kokurikuler) → Asesmen formatif & sumatif (+ KKTP, rubrik
  mencakup sikap/keterampilan sosial) → Pengayaan & Remedial → Refleksi Guru.
- **Template Modul Ajar** (`jenis=MODUL_AJAR`): struktur Kurikulum Merdeka —
  **A. Informasi Umum** (identitas, kompetensi awal, target peserta didik,
  sarpras, model pembelajaran; madrasah: Topik Panca Cinta KBC) →
  **B. Komponen Inti** (TP, asesmen formatif & sumatif + KKTP, pemahaman
  bermakna, pertanyaan pemantik, kegiatan pembelajaran, refleksi murid &
  guru) → **C. Lampiran** (LKPD, pengayaan & remedial, bahan bacaan,
  glosarium, daftar pustaka).
- Kedua template ditutup bagian **Dasar Hukum** berisi regulasi acuan.
- Pemilihan jenis dilakukan guru lewat dropdown "Jenis dokumen" di form
  generate; backend memvalidasi `jenis` (`RPP`/`MODUL_AJAR`, default `RPP`)
  dan hasil generate disimpan dengan `jenis` yang sesuai (enum Prisma
  `JenisDokumen`).

## Ekspor DOCX & PDF

Guru bisa mengunduh dokumen agar bisa diedit ulang / diarsip:

- **DOCX** (bisa diedit): `GET /api/rpp/dokumen/:id/export?format=docx`
  (ter-guard). Backend mengonversi Markdown → DOCX memakai library `docx`
  (`apps/api/src/rpp/dokumen/export-docx.ts`): heading, bullet/numbered
  list, tabel Markdown, bold/italic, plus kepala dokumen (judul + jenis +
  jenjang/kelas/mapel + tanggal). File dikirim sebagai attachment.
- **PDF** (arsip/cetak): dibangun **di browser** memakai jsPDF +
  jspdf-autotable (`apps/web/src/lib/rpp-export.ts`), mengikuti pola
  `lib/pdf.ts` — tanpa beban tambahan di server/VPS. Mendukung heading,
  list, tabel, dan bold/italic inline, plus nomor halaman.
- Tombol unduh tersedia di halaman hasil generate (setelah dokumen
  tersimpan) dan di modal detail daftar dokumen.

**P5/P5-PPRA sudah dihapus** (koreksi 17 Okt 2026, hasil diskusi nvidia):
digantikan **8 Dimensi Profil Lulusan** + pendekatan **Pembelajaran Mendalam**
(berkesadaran, bermakna, menggembirakan).

- System prompt menyuntik: naungan, kurikulum, fase, regulasi acuan per naungan,
  8 Dimensi Profil Lulusan, prinsip Pembelajaran Mendalam, dan kekhasan
  madrasah (moderasi beragama; untuk mapel rumpun PAI/Bahasa Arab ditambah
  kekhasan KMA 183/2019). Untuk mapel KKA disuntik catatan etika digital
  (keshalehan digital, keamanan data).
- Regulasi Kemendikdasmen: Permendikdasmen 10/2025 (SKL — 8 Dimensi Profil
  Lulusan, mencabut Permendikbudristek 5/2022), Permendikdasmen 13/2025
  (struktur kurikulum: kokurikuler, pembelajaran kolaboratif lintas disiplin
  ilmu, Gerakan 7 Kebiasaan Anak Indonesia Hebat, Pembelajaran Mendalam),
  CP 008/M/2022 jo. 262/M/2022.
- Regulasi Kemenag: SKL nasional 8 Dimensi Profil Lulusan (menggantikan
  P5-PPRA) + KMA 183/184/185/2019 + KMA 347/2022 jo. 450/2024 + KMA
  1503/2025 (Kurikulum Merdeka pada madrasah; KKA mapel pilihan).
