import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import {
  RiwayatKelasQueryDto,
  UpsertRiwayatKelasDto,
} from './dto/riwayat-kelas.dto';

@Injectable()
export class RiwayatKelasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: RiwayatKelasQueryDto) {
    const data = await this.prisma.classHistory.findMany({
      where: {
        ...(query.tahunAjaran ? { tahunAjaran: query.tahunAjaran } : {}),
        ...(query.kelas ? { kelas: query.kelas } : {}),
      },
      include: {
        student: { select: { nisn: true, nama: true } },
      },
      orderBy: [{ tahunAjaran: 'desc' }, { kelas: 'asc' }],
    });
    return { data };
  }

  // Snapshot riwayat kelas per siswa per tahun ajaran
  // (upsert pada @@unique(tenantId, studentId, tahunAjaran)).
  async upsert(user: RequestUser, dto: UpsertRiwayatKelasDto) {
    const siswa = await this.prisma.student.findFirst({
      where: { id: dto.studentId },
      select: { id: true, nisn: true, nama: true },
    });
    if (!siswa) {
      throw new NotFoundException('Siswa tidak ditemukan.');
    }

    // tenantId dari JWT (server-issued); middleware menolak bila tidak cocok.
    const tenantId = user.tenantId as string;

    try {
      const riwayat = await this.prisma.classHistory.upsert({
        where: {
          tenantId_studentId_tahunAjaran: {
            tenantId,
            studentId: dto.studentId,
            tahunAjaran: dto.tahunAjaran,
          },
        },
        update: {
          kelas: dto.kelas ?? null,
          waliKelas: dto.waliKelas ?? null,
          status: dto.status ?? null,
        },
        create: denganTenant(user, {
          studentId: dto.studentId,
          tahunAjaran: dto.tahunAjaran,
          kelas: dto.kelas ?? null,
          waliKelas: dto.waliKelas ?? null,
          status: dto.status ?? null,
        }),
      });
      await catatAudit(
        this.prisma,
        user,
        'simpan_riwayat_kelas',
        'class_history',
        riwayat.id,
        { nisn: siswa.nisn, tahunAjaran: dto.tahunAjaran, kelas: dto.kelas },
      );
      return riwayat;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new NotFoundException('Siswa tidak ditemukan.');
      }
      throw err;
    }
  }
}
