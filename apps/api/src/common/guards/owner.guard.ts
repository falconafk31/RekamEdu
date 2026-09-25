import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';

// Guard khusus Owner platform: hanya role OWNER yang boleh lewat.
// Dipakai pada route administrasi platform (mis. kelola tenant, AI key).
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    if (req.user?.role !== Role.OWNER) {
      throw new ForbiddenException(
        'Hanya Owner platform yang boleh mengakses resource ini.',
      );
    }
    return true;
  }
}
