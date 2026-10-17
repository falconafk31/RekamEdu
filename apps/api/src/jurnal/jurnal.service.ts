import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseTanggalISO } from './common/date.helper';
import { RequestUser } from './common/request-user';
import { denganTenant } from './common/tenant-data';
import { CreateJurnalDto } from './dto/create-jurnal.dto';
import { JurnalQueryDto } from './dto/jurnal-query.dto';
import { UpdateJurnalDto } from './dto/update-jurnal.dto';

// Bentuk satu entri jurnal untuk list/rekap.
export interface JurnalDenganGuru {
  id: string;
  tanggal: Date;
  userId: string;
  kelas: string | null;
  mapel: string | null;
  materi: string | null;
  catatan: string | null;
  kehadiran: Prisma.JsonValue;
  namaGuru: string | null;
}

@Injectable()
export class JurnalService {
  constructor(private readonly prisma: PrismaService) {}

  // Guru hanya melihat jurnal miliknya sendiri;
  // ADMIN / KEPALA_SEKOLAH melihat semua jurnal tenant.
  private batasiAksesGuru(user: RequestUser, where: Prisma.JurnalWhereInput) {
    if (user.role === Role.GURU) {
      where.userId = user.userId;
    }
    return where;
  }

  private bangunFilterTanggal(
    query: Pick<JurnalQueryDto, 'tanggal' | 'tanggalDari' | 'tanggalSampai'>,
  ): Prisma.JurnalWhereInput['tanggal'] | undefined {
    const { tanggal, tanggalDari, tanggalSampai } = query;
    if (tanggal) {
      return parseTanggalISO(tanggal);
    }
    const rentang: Prisma.DateTimeFilter = {};
    if (tanggalDari) rentang.gte = parseTanggalISO(tanggalDari);
    if (tanggalSampai) rentang.lte = parseTanggalISO(tanggalSampai);
    return Object.keys(rentang).length > 0 ? rentang : undefined;
  }

  private async lengkapiNamaGuru(
    rows: Array<Omit<JurnalDenganGuru, 'namaGuru'>>,
  ): Promise<JurnalDenganGuru[]> {
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, nama: true, username: true },
          })
        : [];
    const namaById = new Map(users.map((u) => [u.id, u.nama || u.username]));
    return rows.map((r) => ({ ...r, namaGuru: namaById.get(r.userId) ?? null }));
  }

  // Daftar jurnal dengan filter & paginasi.
  async findAll(user: RequestUser, query: JurnalQueryDto) {
    const {
      q,
      kelas,
      mapel,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.JurnalWhereInput = this.batasiAksesGuru(user, {});
    const filterTanggal = this.bangunFilterTanggal(query);
    if (filterTanggal) where.tanggal = filterTanggal;
    if (kelas) where.kelas = kelas;
    if (mapel) where.mapel = { contains: mapel, mode: 'insensitive' };
    if (q) {
      where.OR = [
        { kelas: { contains: q, mode: 'insensitive' } },
        { mapel: { contains: q, mode: 'insensitive' } },
        { materi: { contains: q, mode: 'insensitive' } },
        { catatan: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.jurnal.findMany({
        where,
        orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.jurnal.count({ where }),
    ]);

    const data = await this.lengkapiNamaGuru(
      rows.map((r) => ({
        id: r.id,
        tanggal: r.tanggal,
        userId: r.userId,
        kelas: r.kelas,
        mapel: r.mapel,
        materi: r.materi,
        catatan: r.catatan,
        kehadiran: r.kehadiran,
      })),
    );
    return { data, total };
  }

  // Ringkasan: jumlah jurnal per guru dan per kelas pada periode tertentu.
  async rekap(
    user: RequestUser,
    tanggalDari: string | undefined,
    tanggalSampai: string | undefined,
  ) {
    const where: Prisma.JurnalWhereInput = this.batasiAksesGuru(user, {});
    const filterTanggal = this.bangunFilterTanggal({ tanggalDari, tanggalSampai });
    if (filterTanggal) where.tanggal = filterTanggal;

    const rows = await this.prisma.jurnal.findMany({
      where,
      select: { userId: true, kelas: true },
    });

    const perGuruMap = new Map<string, number>();
    const perKelasMap = new Map<string, number>();
    for (const r of rows) {
      perGuruMap.set(r.userId, (perGuruMap.get(r.userId) ?? 0) + 1);
      const kelas = (r.kelas ?? '').trim();
      if (kelas) perKelasMap.set(kelas, (perKelasMap.get(kelas) ?? 0) + 1);
    }

    const userIds = [...perGuruMap.keys()];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, nama: true, username: true },
          })
        : [];
    const namaById = new Map(users.map((u) => [u.id, u.nama || u.username]));

    const perGuru = [...perGuruMap.entries()]
      .map(([userId, total]) => ({
        userId,
        nama: namaById.get(userId) ?? '(guru tidak dikenal)',
        total,
      }))
      .sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama));

    const perKelas = [...perKelasMap.entries()]
      .map(([kelas, total]) => ({ kelas, total }))
      .sort((a, b) => b.total - a.total || a.kelas.localeCompare(b.kelas));

    return {
      periode: { tanggalDari: tanggalDari ?? null, tanggalSampai: tanggalSampai ?? null },
      totalJurnal: rows.length,
      perGuru,
      perKelas,
    };
  }

  async create(user: RequestUser, dto: CreateJurnalDto) {
    const jurnal = await this.prisma.jurnal.create({
      data: denganTenant(user, {
        tanggal: parseTanggalISO(dto.tanggal),
        userId: user.userId,
        kelas: dto.kelas?.trim() || null,
        mapel: dto.mapel?.trim() || null,
        materi: dto.materi?.trim() || null,
        catatan: dto.catatan?.trim() || null,
        kehadiran: (dto.kehadiran ? { ...dto.kehadiran } : {}) as Prisma.InputJsonValue,
      }),
    });
    return jurnal;
  }

  // Ambil satu jurnal; GURU hanya boleh melihat miliknya sendiri.
  async findOne(user: RequestUser, id: string) {
    const jurnal = await this.prisma.jurnal.findFirst({ where: { id } });
    if (!jurnal) {
      throw new NotFoundException('Jurnal tidak ditemukan.');
    }
    this.pastikanBolehAkses(user, jurnal);
    return jurnal;
  }

  async update(user: RequestUser, id: string, dto: UpdateJurnalDto) {
    const jurnal = await this.findOne(user, id);
    const updated = await this.prisma.jurnal.update({
      where: { id: jurnal.id },
      data: {
        ...(dto.tanggal !== undefined ? { tanggal: parseTanggalISO(dto.tanggal) } : {}),
        ...(dto.kelas !== undefined ? { kelas: dto.kelas?.trim() || null } : {}),
        ...(dto.mapel !== undefined ? { mapel: dto.mapel?.trim() || null } : {}),
        ...(dto.materi !== undefined ? { materi: dto.materi?.trim() || null } : {}),
        ...(dto.catatan !== undefined ? { catatan: dto.catatan?.trim() || null } : {}),
        ...(dto.kehadiran !== undefined
          ? { kehadiran: { ...dto.kehadiran } as Prisma.InputJsonValue }
          : {}),
      },
    });
    return updated;
  }

  async remove(user: RequestUser, id: string) {
    const jurnal = await this.findOne(user, id);
    await this.prisma.jurnal.delete({ where: { id: jurnal.id } });
    return { id: jurnal.id, deleted: true };
  }

  // Kepemilikan jurnal: middleware tenant menjamin record se-tenant;
  // GURU hanya boleh menyentuh jurnal yang ia buat sendiri.
  private pastikanBolehAkses(
    user: RequestUser,
    jurnal: { userId: string },
  ) {
    if (user.role === Role.GURU && jurnal.userId !== user.userId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke jurnal ini.');
    }
  }
}
