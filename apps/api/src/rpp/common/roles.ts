import { Role } from '@prisma/client';

// Role yang boleh mengakses Modul 3 — RPP & Perangkat Pembelajaran + AI:
// guru (modul 1,2,3), admin & kepala sekolah (akses penuh dalam tenant).
export const RPP_ROLES = [Role.ADMIN, Role.KEPALA_SEKOLAH, Role.GURU] as const;
