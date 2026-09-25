import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Decorator untuk membatasi route ke role tertentu.
// Contoh: @Roles(Role.ADMIN, Role.KEPALA_SEKOLAH)
// Dipadukan dengan RolesGuard (dan JwtAuthGuard).
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
