# @rekamedu/shared

Paket kode bersama untuk monorepo RekamEdu. Dipakai oleh `apps/api` (NestJS)
dan `apps/web` (Vue 3) agar kontrak API, tipe data, dan konstanta selalu konsisten.

## Rencana Isi (Tahap 1+)

- `src/types/` — tipe TypeScript bersama (DTO auth, tenant, user, modul 1–5).
- `src/constants/` — konstanta peran (`OWNER`, `ADMIN`, `GURU`, `PUSTAKAWAN`, `TU`),
  penomoran modul (1–5), dan enum paket langganan.
- `src/utils/` — util validasi & format (tanggal, nomor surat, dsb.) yang bebas
  dependensi framework.

## Aturan

- Tidak boleh mengimpor framework (tanpa `vue`, tanpa `@nestjs/*`).
- Perubahan kontrak (breaking change) dicatat di CHANGELOG repo.
- Bahasa komentar & dokumentasi: Bahasa Indonesia.
