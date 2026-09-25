import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { runWithTenantContext } from './tenant-context';

// Interceptor global: membaca request.user (diisi JwtAuthGuard dari payload JWT)
// lalu menyimpannya ke AsyncLocalStorage selama request berlangsung.
// Dipasang di main.ts via app.useGlobalInterceptors().
// Catatan: interceptor berjalan SETELAH guard, sehingga request.user sudah tersedia
// pada route terlindungi; pada route publik (mis. /api/auth/login) konteks
// berjalan tanpa tenant dan Prisma middleware akan melewatinya.
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user?.userId) {
      return next.handle();
    }

    return new Observable((subscriber) =>
      runWithTenantContext(
        {
          tenantId: user.tenantId ?? null,
          userId: user.userId,
          role: user.role,
        },
        () => next.handle().subscribe(subscriber),
      ),
    );
  }
}
