import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../common/request-user';
import { hariIni, parseTanggal } from '../common/tanggal.util';
import { toPagination } from '../dto/pagination.dto';
import { CreateKunjunganDto, KunjunganQueryDto } from '../dto/kunjungan.dto';

// Relasi yang disertakan pada respons kunjungan: student {nama, nisn, kelas}.
const KUNJUNGAN_INCLUDE: Prisma.LibraryVisitInclude = {
  student: { select: { nama: true, nisn: true, kelas: true } },
};

@Injectable()
export class KunjunganService {
  constructor(private readonly prisma: PrismaService) {}

  // Daftar kunjungan; filter: satu `tanggal` (prioritas) atau rentang
  // `dari`–`sampai`. Urutan terbaru dulu.
  async findAll(query: KunjunganQueryDto) {
    const { skip, take } = toPagination(query);
    const where: Prisma.LibraryVisitWhereInput = {};
    if (query.tanggal) {
      where.tanggal = parseTanggal(query.tanggal);
    } else if (query.dari || query.sampai) {
      const rentang: Prisma.DateTimeFilter = {};
      if (query.dari) {
        rentang.gte = parseTanggal(query.dari, 'dari');
      }
      if (query.sampai) {
        rentang.lte = parseTanggal(query.sampai, 'sampai');
      }
      where.tanggal = rentang;
    }

    const [total, data] = await Promise.all([
      this.prisma.libraryVisit.count({ where }),
      this.prisma.libraryVisit.findMany({
        where,
        include: KUNJUNGAN_INCLUDE,
        orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
    ]);
    return { data, total };
  }

  // Catat kunjungan. Kombinasi siswa+tanggal harus unik — duplikat
  // ditolak dengan 409 (aplikasi referensi mencegah input ganda per hari).
  // tenantId disematkan eksplisit dari JWT (bukan input user).
  async create(dto: CreateKunjunganDto, user: RequestUser) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException('Siswa tidak ditemukan.');
    }

    const tanggal = dto.tanggal ? parseTanggal(dto.tanggal) : hariIni();

    const duplikat = await this.prisma.libraryVisit.findFirst({
      where: { studentId: student.id, tanggal },
    });
    if (duplikat) {
      throw new ConflictException(
        'Siswa sudah tercatat berkunjung pada tanggal tersebut.',
      );
    }

    return this.prisma.libraryVisit.create({
      data: { studentId: student.id, tanggal, tenantId: user.tenantId },
      include: KUNJUNGAN_INCLUDE,
    });
  }

  async remove(id: string) {
    const visit = await this.prisma.libraryVisit.findUnique({ where: { id } });
    if (!visit) {
      throw new NotFoundException('Kunjungan tidak ditemukan.');
    }
    await this.prisma.libraryVisit.delete({ where: { id } });
    return { message: 'Kunjungan berhasil dihapus.' };
  }
}
