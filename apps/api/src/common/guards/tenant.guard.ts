import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

// Guard konteks tenant: memastikan request berjalan dalam konteks tenant.
// - Owner (platform, tenantId NULL) selalu lolos — namun Owner hanya boleh
//   mengakses route khusus Owner (kawinkan dengan OwnerGuard).
// - Role tenant (ADMIN, KEPALA_SEKOLAH, GURU, PUSTAKAWAN, TU) wajib punya
//   request.user.tenantId, bila tidak → ditolak.
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Belum terautentikasi.');
    }

    if (user.role === Role.OWNER) {
      return true;
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Konteks tenant tidak ditemukan.');
    }
    return true;
  }
}
