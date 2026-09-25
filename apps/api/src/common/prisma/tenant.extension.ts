import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getTenantContext } from '../tenant/tenant-context';

// ============================================================================
// Prisma middleware isolasi tenant (shared schema).
// Dipasang di PrismaService via this.$use(tenantPrismaMiddleware()).
//
// Aturan:
// - Setiap query pada model yang punya kolom tenantId otomatis dibatasi
//   ke tenantId milik request saat ini (diambil dari AsyncLocalStorage).
// - create / createMany: tenantId disuntik otomatis; bila data menyebut
//   tenantId lain → ForbiddenException.
// - findMany / findFirst / count / aggregate / updateMany / deleteMany / dsb:
//   filter tenantId disuntik ke `where`; bila `where` menyebut tenantId lain
//   → ForbiddenException.
// - findUnique: diubah menjadi findFirst agar filter tenantId bisa diterapkan
//   (where pada findUnique hanya menerima unique key).
// - update / delete: kepemilikan diverifikasi dulu lewat probe findFirst
//   yang sudah di-scope; bila tidak ditemukan → ForbiddenException.
// - upsert: where di-scope, create disuntik tenantId, update dilarang
//   memindahkan baris ke tenant lain.
// - Tanpa konteks tenant (seed, job internal, request Owner) → dilewati;
//   keamanan untuk kasus itu ditangani guard di lapisan HTTP.
//
// PENTING: daftar model di bawah WAJIB disinkronkan dengan schema.prisma
// setiap kali menambah tabel data tenant baru.
// ============================================================================

// Model Prisma yang memiliki kolom tenantId.
const TENANT_SCOPED_MODELS = new Set<string>([
  'User',
  'Subscription',
  'AiUsageLog',
  'AuditLog',
]);

// Aksi baca/mutasi massal yang aman di-scope lewat `where`.
const SCOPED_WHERE_ACTIONS = new Set<string>([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

export function tenantPrismaMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const { model, action } = params;

    // Bukan model bertenantId (mis. Tenant, AiModel) → teruskan apa adanya.
    if (!model || !TENANT_SCOPED_MODELS.has(model)) {
      return next(params);
    }

    const ctx = getTenantContext();
    if (!ctx?.tenantId) {
      return next(params);
    }
    const tenantId = ctx.tenantId;
    const args = params.args ?? {};

    // Pastikan objek `data` membawa tenantId yang benar; tolak bila beda.
    const assertDataTenant = (data: unknown): unknown => {
      if (data === null || typeof data !== 'object') return data;
      const row = data as Record<string, unknown>;
      if (row.tenantId !== undefined && row.tenantId !== tenantId) {
        throw new ForbiddenException('Operasi lintas tenant ditolak.');
      }
      return { ...row, tenantId };
    };

    // Batasi `where` ke tenant aktif; tolak bila menyebut tenant lain.
    const scopeWhere = (where: unknown): Record<string, unknown> => {
      const w = (where ?? {}) as Record<string, unknown>;
      if (w.tenantId !== undefined && w.tenantId !== tenantId) {
        throw new ForbiddenException('Akses lintas tenant ditolak.');
      }
      return { ...w, tenantId };
    };

    // `update` pada upsert tidak boleh memindahkan baris ke tenant lain.
    const assertNoTenantMove = (data: unknown): unknown => {
      if (data === null || typeof data !== 'object') return data;
      const row = data as Record<string, unknown>;
      if (row.tenantId !== undefined && row.tenantId !== tenantId) {
        throw new ForbiddenException('Operasi lintas tenant ditolak.');
      }
      const { tenantId: _buang, ...rest } = row;
      return rest;
    };

    switch (action) {
      case 'create':
      case 'createMany': {
        args.data = Array.isArray(args.data)
          ? args.data.map(assertDataTenant)
          : assertDataTenant(args.data);
        params.args = args;
        return next(params);
      }

      case 'upsert': {
        args.where = scopeWhere(args.where);
        args.create = assertDataTenant(args.create);
        if (args.update !== undefined) {
          args.update = assertNoTenantMove(args.update);
        }
        params.args = args;
        return next(params);
      }

      case 'findUnique':
      case 'findUniqueOrThrow': {
        // findUnique tidak bisa di-scope via unique key → alihkan ke findFirst.
        params.action =
          action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
        args.where = scopeWhere(args.where);
        params.args = args;
        return next(params);
      }

      case 'update':
      case 'delete': {
        // `where` pada update/delete harus unique sehingga tidak bisa disuntik
        // tenantId secara langsung — verifikasi kepemilikan terlebih dahulu
        // dengan probe findFirst yang sudah di-scope ke tenant aktif.
        const probe = await next({
          ...params,
          action: 'findFirst',
          args: { where: scopeWhere(args.where), select: { id: true } },
        });
        if (!probe) {
          throw new ForbiddenException(
            'Akses lintas tenant ditolak atau data tidak ditemukan.',
          );
        }
        return next(params);
      }

      default: {
        if (SCOPED_WHERE_ACTIONS.has(action)) {
          args.where = scopeWhere(args.where);
          params.args = args;
        }
        return next(params);
      }
    }
  };
}
