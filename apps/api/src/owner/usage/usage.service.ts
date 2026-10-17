import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsageQueryDto } from './dto/usage-query.dto';

// Laporan pemakaian AI lintas tenant — khusus Owner platform.
// AiUsageLog tidak punya relasi ke Tenant, jadi nama tenant digabungkan
// secara manual dari hasil query tenant terpisah.
@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  // Agregat per (tenant, model): total token input/output + jumlah request.
  async findUsage(query: UsageQueryDto) {
    const where = this.buildWhere(query);

    const agregat = await this.prisma.aiUsageLog.groupBy({
      by: ['tenantId', 'aiModelId'],
      where,
      _sum: { tokensInput: true, tokensOutput: true },
      _count: { _all: true },
      orderBy: [{ tenantId: 'asc' }, { aiModelId: 'asc' }],
    });

    const tenantIds = [...new Set(agregat.map((a) => a.tenantId))];
    const modelIds = [...new Set(agregat.map((a) => a.aiModelId))];

    const [tenants, models] = await Promise.all([
      tenantIds.length > 0
        ? this.prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, kodeSekolah: true, nama: true },
          })
        : [],
      modelIds.length > 0
        ? this.prisma.aiModel.findMany({
            where: { id: { in: modelIds } },
            select: { id: true, displayName: true, provider: true, model: true },
          })
        : [],
    ]);

    const tenantMap = new Map(tenants.map((t) => [t.id, t]));
    const modelMap = new Map(models.map((m) => [m.id, m]));

    return agregat.map((a) => {
      const tenant = tenantMap.get(a.tenantId);
      const model = modelMap.get(a.aiModelId);
      return {
        tenantId: a.tenantId,
        kodeSekolah: tenant?.kodeSekolah ?? null,
        namaTenant: tenant?.nama ?? '(tenant dihapus)',
        aiModelId: a.aiModelId,
        displayName: model?.displayName ?? '(model dihapus)',
        totalInput: a._sum.tokensInput ?? 0,
        totalOutput: a._sum.tokensOutput ?? 0,
        jumlahRequest: a._count._all,
      };
    });
  }

  // Ringkasan global 30 hari terakhir:
  // jumlah tenant yang memakai AI + total token input/output.
  async ringkasan() {
    const sejak = new Date();
    sejak.setUTCDate(sejak.getUTCDate() - 30);

    const perTenant = await this.prisma.aiUsageLog.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: sejak } },
      _sum: { tokensInput: true, tokensOutput: true },
      _count: { _all: true },
    });

    return {
      jumlahTenantMemakaiAI: perTenant.length,
      totalInput: perTenant.reduce(
        (s, r) => s + (r._sum.tokensInput ?? 0),
        0,
      ),
      totalOutput: perTenant.reduce(
        (s, r) => s + (r._sum.tokensOutput ?? 0),
        0,
      ),
      jumlahRequest: perTenant.reduce((s, r) => s + r._count._all, 0),
      periodeHari: 30,
    };
  }

  private buildWhere(query: UsageQueryDto): Prisma.AiUsageLogWhereInput {
    const where: Prisma.AiUsageLogWhereInput = {};
    if (query.tenantId) where.tenantId = query.tenantId;

    const createdAt: Prisma.DateTimeFilter = {};
    if (query.dari) {
      createdAt.gte = this.parseTanggal(query.dari, 'dari');
    }
    if (query.sampai) {
      // sampai bersifat inklusif: batas atas = tengah malam hari berikutnya.
      const batas = this.parseTanggal(query.sampai, 'sampai');
      batas.setUTCDate(batas.getUTCDate() + 1);
      createdAt.lt = batas;
    }
    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }
    return where;
  }

  private parseTanggal(value: string, nama: string): Date {
    const d = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`${nama} tidak valid: "${value}".`);
    }
    return d;
  }
}
