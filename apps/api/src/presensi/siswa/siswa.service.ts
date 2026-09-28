import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusSiswa } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import { parseTanggalISO } from '../common/date.helper';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import { CreateSiswaDto } from './dto/create-siswa.dto';
import { SiswaQueryDto } from './dto/siswa-query.dto';
import { UpdateSiswaDto } from './dto/update-siswa.dto';

@Injectable()
export class SiswaService {
  constructor(private readonly prisma: PrismaService) {}

  // Daftar siswa dengan pencarian & paginasi.
  async findAll(query: SiswaQueryDto) {
    const { q, kelas, status, page = 1, limit = 20 } = query;

    const where: Prisma.StudentWhereInput = {};
    if (kelas) where.kelas = kelas;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { nisn: { contains: q, mode: 'insensitive' } },
        { nama: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: { nama: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, total };
  }

  async create(user: RequestUser, dto: CreateSiswaDto) {
    try {
      const siswa = await this.prisma.student.create({
        data: denganTenant(user, {
          nisn: dto.nisn.trim(),
          nama: dto.nama.trim(),
          jk: dto.jk ?? null,
          kelas: dto.kelas ?? null,
          tanggalMasuk: dto.tanggalMasuk
            ? parseTanggalISO(dto.tanggalMasuk)
            : null,
          keterangan: dto.keterangan ?? null,
        }),
      });
      await catatAudit(this.prisma, user, 'tambah_siswa', 'students', siswa.id, {
        nisn: siswa.nisn,
        nama: siswa.nama,
      });
      return siswa;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          `NISN "${dto.nisn}" sudah terdaftar di sekolah ini.`,
        );
      }
      throw err;
    }
  }

  async findOne(id: string) {
    const siswa = await this.prisma.student.findFirst({ where: { id } });
    if (!siswa) {
      throw new NotFoundException('Siswa tidak ditemukan.');
    }
    return siswa;
  }

  async update(user: RequestUser, id: string, dto: UpdateSiswaDto) {
    await this.findOne(id);
    try {
      const siswa = await this.prisma.student.update({
        where: { id },
        data: {
          ...(dto.nisn !== undefined ? { nisn: dto.nisn.trim() } : {}),
          ...(dto.nama !== undefined ? { nama: dto.nama.trim() } : {}),
          ...(dto.jk !== undefined ? { jk: dto.jk } : {}),
          ...(dto.kelas !== undefined ? { kelas: dto.kelas } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.tanggalMasuk !== undefined
            ? { tanggalMasuk: parseTanggalISO(dto.tanggalMasuk) }
            : {}),
          ...(dto.tanggalKeluar !== undefined
            ? { tanggalKeluar: parseTanggalISO(dto.tanggalKeluar) }
            : {}),
          ...(dto.keterangan !== undefined ? { keterangan: dto.keterangan } : {}),
        },
      });
      await catatAudit(this.prisma, user, 'update_siswa', 'students', siswa.id, {
        nisn: siswa.nisn,
        nama: siswa.nama,
      });
      return siswa;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          `NISN "${dto.nisn}" sudah dipakai siswa lain di sekolah ini.`,
        );
      }
      throw err;
    }
  }

  // Hapus lunak: siswa dinonaktifkan, status menjadi "keluar".
  async remove(user: RequestUser, id: string) {
    const siswa = await this.findOne(id);
    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        active: false,
        status: StatusSiswa.keluar,
        tanggalKeluar: new Date(),
      },
    });
    await catatAudit(this.prisma, user, 'hapus_siswa', 'students', id, {
      nisn: siswa.nisn,
      nama: siswa.nama,
    });
    return updated;
  }
}
