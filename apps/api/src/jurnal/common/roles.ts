import { Role } from '@prisma/client';

// Role yang boleh mengakses endpoint jurnal (modul 2).
export const JURNAL_ROLES = [
  Role.ADMIN,
  Role.KEPALA_SEKOLAH,
  Role.GURU,
] as const;
