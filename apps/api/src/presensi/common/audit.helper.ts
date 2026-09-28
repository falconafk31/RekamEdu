import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from './request-user';
import { denganTenant } from './tenant-data';

// Mencatat mutasi penting ke AuditLog. tenantId diambil dari JWT lalu
// diverifikasi ulang oleh middleware isolasi tenant — jangan pernah
// menulis tenantId dari input user di sini.
export async function catatAudit(
  prisma: PrismaService,
  user: RequestUser,
  aksi: string,
  tabelTerkait?: string,
  recordId?: string,
  detail?: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: denganTenant(user, {
      userId: user.userId,
      aksi,
      tabelTerkait: tabelTerkait ?? null,
      recordId: recordId ?? null,
      detail: detail === undefined ? null : JSON.stringify(detail),
    }),
  });
}
