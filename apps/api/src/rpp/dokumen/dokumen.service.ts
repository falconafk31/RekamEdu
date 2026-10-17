import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import { CreateDokumenDto } from './dto/create-dokumen.dto';
import { DokumenQueryDto } from './dto/dokumen-query.dto';
import { UpdateDokumenDto } from './dto/update-dokumen.dto';
import { dokumenKeDocx, namaFileAman } from './export-docx';

const LABEL_JENIS: Record<string, string> = {
  RPP: 'RPP',
  SILABUS: 'Silabus',
  MODUL_AJAR: 'Modul Ajar',
  LKPD: 'LKPD',
  SOAL: 'Soal',
  LAINNYA: 'Lainnya',
};

@Injectable()
export class DokumenService {
  constructor(private readonly prisma: PrismaService) {}

  // Daftar dokumen pembelajaran dengan filter jenis/status, pencarian, & paginasi.
  async findAll(query: DokumenQueryDto) {
    const { jenis, status, q, page = 1, limit = 20 } = query;

    const where: Prisma.DokumenPembelajaranWhereInput = {};
    if (jenis) where.jenis = jenis;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { judul: { contains: q, mode: 'insensitive' } },
        { konten: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.dokumenPembelajaran.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dokumenPembelajaran.count({ where }),
    ]);

    return { data, total };
  }

  async create(user: RequestUser, dto: CreateDokumenDto) {
    const dokumen = await this.prisma.dokumenPembelajaran.create({
      data: denganTenant(user, {
        jenis: dto.jenis,
        judul: dto.judul.trim(),
        konten: dto.konten,
        ...(dto.metadata !== undefined
          ? { metadata: dto.metadata as Prisma.InputJsonValue }
          : {}),
        status: dto.status ?? undefined,
        aiModelId: dto.aiModelId ?? null,
        createdBy: user.userId,
      }),
    });
    await catatAudit(this.prisma, user, 'tambah_dokumen', 'dokumen_pembelajaran', dokumen.id, {
      jenis: dokumen.jenis,
      judul: dokumen.judul,
    });
    return dokumen;
  }

  async findOne(id: string) {
    const dokumen = await this.prisma.dokumenPembelajaran.findFirst({
      where: { id },
    });
    if (!dokumen) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }
    return dokumen;
  }

  // Ekspor dokumen ke DOCX (bisa diedit ulang di Word/WPS/Google Docs).
  // Isolasi tenant ikut findOne (middleware Prisma).
  async exportDocx(id: string): Promise<{ buffer: Buffer; namaFile: string }> {
    const dokumen = await this.findOne(id);
    const meta = (dokumen.metadata ?? {}) as Record<string, unknown>;
    const bagian: string[] = [];
    if (meta['jenjang']) bagian.push(String(meta['jenjang']));
    if (meta['kelas']) bagian.push(`Kelas ${meta['kelas']}`);
    if (meta['mapel']) bagian.push(String(meta['mapel']));
    const tanggal = dokumen.updatedAt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const subjudul = [
      LABEL_JENIS[dokumen.jenis] ?? dokumen.jenis,
      ...bagian,
      tanggal,
    ].join(' · ');
    const buffer = await dokumenKeDocx({
      judul: dokumen.judul,
      subjudul,
      konten: dokumen.konten,
    });
    return { buffer, namaFile: namaFileAman(dokumen.judul, 'docx') };
  }

  // Setiap update isi/judul menaikkan versi +1 (riwayat versi ringan).
  async update(user: RequestUser, id: string, dto: UpdateDokumenDto) {
    await this.findOne(id);
    const dokumen = await this.prisma.dokumenPembelajaran.update({
      where: { id },
      data: {
        ...(dto.judul !== undefined ? { judul: dto.judul.trim() } : {}),
        ...(dto.konten !== undefined ? { konten: dto.konten } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.metadata !== undefined
          ? { metadata: dto.metadata as Prisma.InputJsonValue }
          : {}),
        versi: { increment: 1 },
      },
    });
    await catatAudit(this.prisma, user, 'update_dokumen', 'dokumen_pembelajaran', dokumen.id, {
      judul: dokumen.judul,
      versi: dokumen.versi,
    });
    return dokumen;
  }

  async remove(user: RequestUser, id: string) {
    const dokumen = await this.findOne(id);
    await this.prisma.dokumenPembelajaran.delete({ where: { id } });
    await catatAudit(this.prisma, user, 'hapus_dokumen', 'dokumen_pembelajaran', id, {
      judul: dokumen.judul,
    });
    return { id };
  }
}
