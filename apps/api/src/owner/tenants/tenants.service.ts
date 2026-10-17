import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // Daftar semua tenant untuk dashboard Owner: urut nama.
  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        kodeSekolah: true,
        nama: true,
        createdAt: true,
        subscription: {
          select: { plan: true, status: true, expiresAt: true },
        },
        _count: { select: { users: true } },
      },
    });
  }

  // Detail tenant: profil langganan + daftar user tenant.
  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        kodeSekolah: true,
        nama: true,
        npsn: true,
        alamat: true,
        telepon: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            startedAt: true,
            expiresAt: true,
          },
        },
        users: {
          orderBy: { username: 'asc' },
          select: {
            id: true,
            username: true,
            nama: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant tidak ditemukan.');
    }
    return tenant;
  }

  // Aktivasi / ubah paket tenant secara manual.
  // Bila tenant belum punya subscription → dibuat (upsert).
  async updateSubscription(id: string, dto: UpdateTenantDto) {
    await this.findOne(id); // 404 bila tenant tidak ada.

    const expiresAt = this.parseExpiresAt(dto.expiresAt);

    return this.prisma.subscription.upsert({
      where: { tenantId: id },
      create: {
        tenantId: id,
        plan: dto.plan ?? 'trial',
        status: dto.status ?? 'active',
        expiresAt,
      },
      update: {
        ...(dto.plan !== undefined ? { plan: dto.plan } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt } : {}),
      },
      select: {
        id: true,
        plan: true,
        status: true,
        startedAt: true,
        expiresAt: true,
      },
    });
  }

  // string ISO / null → Date | null; lempar 400 bila tidak valid.
  private parseExpiresAt(value: string | null | undefined): Date | null {
    if (value === undefined || value === null || value === '') return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(
        `expiresAt tidak valid: "${value}". Gunakan format ISO (mis. 2026-12-31).`,
      );
    }
    return d;
  }
}
