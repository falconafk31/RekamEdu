import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import { CreatePeriodeDto } from './dto/create-periode.dto';

@Injectable()
export class PeriodeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const data = await this.prisma.academicPeriod.findMany({
      orderBy: [{ tahunAjaran: 'desc' }, { semester: 'asc' }],
    });
    return { data };
  }

  async create(user: RequestUser, dto: CreatePeriodeDto) {
    try {
      const periode = await this.prisma.academicPeriod.create({
        data: denganTenant(user, {
          tahunAjaran: dto.tahunAjaran,
          semester: dto.semester,
        }),
      });
      await catatAudit(
        this.prisma,
        user,
        'tambah_periode',
        'academic_periods',
        periode.id,
        { tahunAjaran: periode.tahunAjaran, semester: periode.semester },
      );
      return periode;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          `Periode ${dto.tahunAjaran} semester ${dto.semester} sudah ada.`,
        );
      }
      throw err;
    }
  }

  // Aktifkan satu periode: nonaktifkan semua periode tenant dalam satu
  // transaksi, lalu aktifkan yang dipilih.
  async aktifkan(user: RequestUser, id: string) {
    const periode = await this.prisma.academicPeriod.findFirst({
      where: { id },
    });
    if (!periode) {
      throw new NotFoundException('Periode akademik tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      // updateMany di-scope otomatis ke tenant aktif oleh middleware.
      await tx.academicPeriod.updateMany({ data: { isActive: false } });
      await tx.academicPeriod.update({ where: { id }, data: { isActive: true } });
    });

    await catatAudit(
      this.prisma,
      user,
      'set_periode_aktif',
      'academic_periods',
      id,
      { tahunAjaran: periode.tahunAjaran, semester: periode.semester },
    );

    return { ...periode, isActive: true };
  }
}
