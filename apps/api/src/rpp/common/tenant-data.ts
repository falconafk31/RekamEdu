import { ForbiddenException } from '@nestjs/common';
import { RequestUser } from './request-user';

// Membungkus data create/upsert dengan tenantId dari JWT (server-issued,
// BUKAN input user). Middleware isolasi tenant tetap memverifikasi bahwa
// tenantId ini cocok dengan konteks tenant aktif — helper ini hanya memenuhi
// kebutuhan tipe Prisma karena kolom tenantId bersifat required di skema.
export function denganTenant<T extends object>(
  user: RequestUser,
  data: T,
): T & { tenantId: string } {
  if (!user.tenantId) {
    throw new ForbiddenException('Konteks tenant tidak ditemukan.');
  }
  return { ...data, tenantId: user.tenantId };
}
