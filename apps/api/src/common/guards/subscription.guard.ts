import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Guard langganan: memblokir request tenant yang subscription-nya
// berstatus expired / suspended (atau belum punya subscription).
// - Owner platform tidak terikat subscription tenant → selalu lolos.
// - Dipasang SETELAH JwtAuthGuard agar request.user tersedia.
// - TenantGuard sebaiknya juga dipasang agar tenantId terjamin ada.
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Belum terautentikasi.');
    }

    if (user.role === Role.OWNER) {
      return true;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
      select: { status: true },
    });

    if (!subscription || subscription.status !== SubscriptionStatus.active) {
      throw new ForbiddenException(
        'Langganan sekolah tidak aktif (expired/suspended). ' +
          'Hubungi administrator untuk perpanjangan.',
      );
    }
    return true;
  }
}
