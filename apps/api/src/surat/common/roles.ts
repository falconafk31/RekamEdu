import { Role } from '@prisma/client';

// Role yang boleh mengakses Modul 5 (Surat Masuk & Keluar):
// admin tenant, kepala sekolah, dan petugas TU.
export const SURAT_ROLES = [
  Role.ADMIN,
  Role.KEPALA_SEKOLAH,
  Role.TU,
] as const;
