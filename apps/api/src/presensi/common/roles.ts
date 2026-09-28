import { Role } from '@prisma/client';

// Role yang boleh mengakses endpoint presensi umum
// (siswa, presensi, rekap, kalender, periode, statistik, riwayat kelas).
export const PRESENSI_ROLES = [
  Role.ADMIN,
  Role.KEPALA_SEKOLAH,
  Role.GURU,
] as const;

// Role yang boleh mengelola akun guru, aktivitas, dan pengaturan.
export const ADMIN_ROLES = [Role.ADMIN, Role.KEPALA_SEKOLAH] as const;
