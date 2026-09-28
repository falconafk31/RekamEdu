import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AktivitasQueryDto } from './dto/aktivitas-query.dto';

@Injectable()
export class AktivitasService {
  constructor(private readonly prisma: PrismaService) {}

  // Log aktivitas tenant, urut terbaru — setara "Riwayat Aktivitas" di aplikasi.
  async findAll(query: AktivitasQueryDto) {
    const { page = 1, limit = 20 } = query;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        select: {
          id: true,
          aksi: true,
          tabelTerkait: true,
          recordId: true,
          detail: true,
          createdAt: true,
          userId: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);

    return { data, total };
  }
}
