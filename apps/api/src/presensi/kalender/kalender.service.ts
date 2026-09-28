import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import { formatTanggalISO, parseTanggalISO } from '../common/date.helper';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import { KalenderQueryDto, SetKalenderDto } from './dto/kalender.dto';

@Injectable()
export class KalenderService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: KalenderQueryDto) {
    const now = new Date();
    const tahun = query.tahun ?? now.getUTCFullYear();
    const bulan = query.bulan ?? now.getUTCMonth() + 1;

    const awal = new Date(Date.UTC(tahun, bulan - 1, 1));
    const akhir = new Date(Date.UTC(tahun, bulan, 0)); // hari terakhir bulan

    const rows = await this.prisma.academicCalendar.findMany({
      where: { date: { gte: awal, lte: akhir } },
      orderBy: { date: 'asc' },
    });

    const data = rows.map((r) => ({
      tanggal: formatTanggalISO(r.date),
      status: r.status,
    }));
    return { data };
  }

  // Tandai satu tanggal sebagai Masuk/Libur (upsert composite PK tenantId+date).
  async setTanggal(user: RequestUser, tanggal: string, dto: SetKalenderDto) {
    const date = parseTanggalISO(tanggal);
    // tenantId dari JWT (server-issued); middleware menolak bila tidak cocok.
    const tenantId = user.tenantId as string;

    const row = await this.prisma.academicCalendar.upsert({
      where: { tenantId_date: { tenantId, date } },
      update: { status: dto.status },
      create: denganTenant(user, { date, status: dto.status }),
    });

    await catatAudit(
      this.prisma,
      user,
      'update_kalender',
      'academic_calendar',
      tanggal,
      { status: dto.status },
    );

    return { tanggal: formatTanggalISO(row.date), status: row.status };
  }
}
