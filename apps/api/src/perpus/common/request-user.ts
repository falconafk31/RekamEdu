import { Role } from '@prisma/client';

// Bentuk request.user setelah JwtAuthGuard (+ TenantGuard).
// Pada modul perpus, @Roles membatasi akses ke role tenant
// (ADMIN, KEPALA_SEKOLAH, PUSTAKAWAN) sehingga tenantId selalu terisi —
// berbeda dengan Owner platform yang tenantId-nya null.
export interface RequestUser {
  userId: string;
  username: string;
  role: Role;
  tenantId: string;
}
