import { AsyncLocalStorage } from 'async_hooks';

// Konteks request yang dibawa sepanjang alur async (guard → service → Prisma).
// Diisi oleh TenantContextInterceptor dari request.user (payload JWT).
export interface TenantRequestContext {
  tenantId: string | null; // null untuk Owner platform
  userId: string;
  role: string;
}

const storage = new AsyncLocalStorage<TenantRequestContext>();

// Menjalankan fungsi di dalam konteks tenant tertentu.
export function runWithTenantContext<T>(
  ctx: TenantRequestContext,
  fn: () => T,
): T {
  return storage.run(ctx, fn);
}

// Dibaca oleh Prisma tenant middleware untuk mengisolasi query per tenant.
export function getTenantContext(): TenantRequestContext | undefined {
  return storage.getStore();
}
