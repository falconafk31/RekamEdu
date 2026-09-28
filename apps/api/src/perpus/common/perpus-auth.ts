import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

// Komposisi guard standar modul perpustakaan, dipakai di semua controller
// perpus agar konsisten: JWT → konteks tenant → langganan aktif → role.
// Role yang diizinkan: ADMIN, KEPALA_SEKOLAH, PUSTAKAWAN.
export function PerpusAuth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard),
    Roles(Role.ADMIN, Role.KEPALA_SEKOLAH, Role.PUSTAKAWAN),
  );
}
