import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JenisSurat, Prisma, Surat } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import { formatTanggalIndonesia, parseTanggalISO } from '../common/date.helper';
import { RequestUser } from '../common/request-user';
import { formatNomorSurat } from '../surat-nomor.service';
import { CreateSuratDto } from './dto/create-surat.dto';
import { SuratQueryDto } from './dto/surat-query.dto';
import { UpdateSuratDto } from './dto/update-surat.dto';

@Injectable()
export class SuratService {
  constructor(private readonly prisma: PrismaService) {}

  // Daftar surat dengan filter jenis, pencarian (perihal/nomor/pengirim/
  // penerima), rentang tanggal, dan paginasi.
  async findAll(query: SuratQueryDto) {
    const {
      jenis,
      q,
      tanggalDari,
      tanggalSampai,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.SuratWhereInput = {};
    if (jenis) where.jenis = jenis;
    if (q) {
      where.OR = [
        { perihal: { contains: q, mode: 'insensitive' } },
        { nomorSurat: { contains: q, mode: 'insensitive' } },
        { pengirim: { contains: q, mode: 'insensitive' } },
        { penerima: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (tanggalDari || tanggalSampai) {
      where.tanggal = {};
      if (tanggalDari) where.tanggal.gte = parseTanggalISO(tanggalDari);
      if (tanggalSampai) where.tanggal.lte = parseTanggalISO(tanggalSampai);
    }

    const [data, total] = await Promise.all([
      this.prisma.surat.findMany({
        where,
        orderBy: [{ tanggal: 'desc' }, { nomorUrut: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.surat.count({ where }),
    ]);

    return { data, total };
  }

  // Buat surat baru dengan penomoran otomatis. Counter dinaikkan dalam SATU
  // transaksi agar dua request bersamaan tidak mendapat nomor urut yang sama.
  async create(user: RequestUser, dto: CreateSuratDto): Promise<Surat> {
    if (!user.tenantId) {
      throw new BadRequestException('Konteks tenant tidak ditemukan.');
    }
    const tanggal = parseTanggalISO(dto.tanggal);
    const tahun = tanggal.getUTCFullYear();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { kodeSekolah: true },
    });
    if (!tenant) {
      throw new BadRequestException('Data sekolah tidak ditemukan.');
    }

    const surat = await this.prisma.$transaction(async (tx) => {
      const counter = await tx.suratCounter.upsert({
        where: {
          tenantId_tahun_jenis: {
            tenantId: user.tenantId as string,
            tahun,
            jenis: dto.jenis,
          },
        },
        create: {
          tenantId: user.tenantId as string,
          tahun,
          jenis: dto.jenis,
          terakhir: 1,
        },
        update: { terakhir: { increment: 1 } },
      });

      const nomorSurat = formatNomorSurat({
        urut: counter.terakhir,
        kodeSekolah: tenant.kodeSekolah,
        jenis: dto.jenis,
        tanggal,
      });

      return tx.surat.create({
        data: {
          tenantId: user.tenantId as string,
          jenis: dto.jenis,
          nomorSurat,
          tahun,
          nomorUrut: counter.terakhir,
          tanggal,
          pengirim: dto.pengirim?.trim() || null,
          penerima: dto.penerima?.trim() || null,
          perihal: dto.perihal.trim(),
          ringkasan: dto.ringkasan?.trim() || null,
          lampiranUrl: dto.lampiranUrl?.trim() || null,
          status: dto.status?.trim() || 'arsip',
          createdBy: user.userId,
        },
      });
    });

    await catatAudit(this.prisma, user, 'tambah_surat', 'surat', surat.id, {
      jenis: surat.jenis,
      nomorSurat: surat.nomorSurat,
      perihal: surat.perihal,
    });
    return surat;
  }

  async findOne(id: string): Promise<Surat> {
    const surat = await this.prisma.surat.findFirst({ where: { id } });
    if (!surat) {
      throw new NotFoundException('Surat tidak ditemukan.');
    }
    return surat;
  }

  async update(
    user: RequestUser,
    id: string,
    dto: UpdateSuratDto,
  ): Promise<Surat> {
    await this.findOne(id);
    const surat = await this.prisma.surat.update({
      where: { id },
      data: {
        ...(dto.tanggal !== undefined
          ? { tanggal: parseTanggalISO(dto.tanggal) }
          : {}),
        ...(dto.pengirim !== undefined
          ? { pengirim: dto.pengirim?.trim() || null }
          : {}),
        ...(dto.penerima !== undefined
          ? { penerima: dto.penerima?.trim() || null }
          : {}),
        ...(dto.perihal !== undefined ? { perihal: dto.perihal.trim() } : {}),
        ...(dto.ringkasan !== undefined
          ? { ringkasan: dto.ringkasan?.trim() || null }
          : {}),
        ...(dto.lampiranUrl !== undefined
          ? { lampiranUrl: dto.lampiranUrl?.trim() || null }
          : {}),
        ...(dto.status !== undefined
          ? { status: dto.status?.trim() || 'arsip' }
          : {}),
      },
    });
    await catatAudit(this.prisma, user, 'update_surat', 'surat', surat.id, {
      nomorSurat: surat.nomorSurat,
      perihal: surat.perihal,
    });
    return surat;
  }

  async remove(user: RequestUser, id: string): Promise<Surat> {
    const surat = await this.findOne(id);
    const deleted = await this.prisma.surat.delete({ where: { id } });
    await catatAudit(this.prisma, user, 'hapus_surat', 'surat', id, {
      jenis: surat.jenis,
      nomorSurat: surat.nomorSurat,
      perihal: surat.perihal,
    });
    return deleted;
  }

  // Render isi template dengan placeholder terisi dari data surat.
  // Placeholder yang dikenal: {{nomor}}, {{tanggal}} (dd/mm/yyyy),
  // {{perihal}}, {{pengirim}}, {{penerima}}, {{namaSekolah}}, {{tahun}}.
  // Placeholder tak dikenal dibiarkan apa adanya.
  async render(
    user: RequestUser,
    id: string,
    templateId: string,
  ): Promise<{ hasil: string }> {
    if (!user.tenantId) {
      throw new BadRequestException('Konteks tenant tidak ditemukan.');
    }
    const surat = await this.findOne(id);
    const template = await this.prisma.suratTemplate.findFirst({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('Template surat tidak ditemukan.');
    }

    const setting = await this.prisma.tenantSetting.findFirst({
      where: { tenantId: user.tenantId },
      select: { namaSekolah: true },
    });
    let namaSekolah = setting?.namaSekolah?.trim() || '';
    if (!namaSekolah) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { nama: true },
      });
      namaSekolah = tenant?.nama ?? '';
    }

    const nilai: Record<string, string> = {
      nomor: surat.nomorSurat,
      tanggal: formatTanggalIndonesia(surat.tanggal),
      perihal: surat.perihal,
      pengirim: surat.pengirim ?? '',
      penerima: surat.penerima ?? '',
      namaSekolah,
      tahun: String(surat.tahun),
      jenis: surat.jenis === JenisSurat.MASUK ? 'masuk' : 'keluar',
    };

    const hasil = template.isi.replace(/\{\{(\w+)\}\}/g, (cocok, nama: string) =>
      Object.prototype.hasOwnProperty.call(nilai, nama) ? nilai[nama] : cocok,
    );

    return { hasil };
  }
}
