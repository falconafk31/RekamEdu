import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusPinjaman } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../common/request-user';
import { toPagination } from '../dto/pagination.dto';
import { BukuQueryDto, CreateBukuDto, UpdateBukuDto } from '../dto/buku.dto';

// Status peminjaman yang menghalangi penghapusan buku:
// buku masih beredar (dipinjam) atau dikembalikan terlambat (terlambat).
const STATUS_BLOKIR_HAPUS = [
  StatusPinjaman.dipinjam,
  StatusPinjaman.terlambat,
];

@Injectable()
export class BukuService {
  constructor(private readonly prisma: PrismaService) {}

  // Daftar buku + paginasi. Setiap baris diperkaya `dipinjam` (eksemplar
  // sedang dipinjam) dan `tersedia` (stok − dipinjam), seperti kolom
  // Total/Sisa pada aplikasi referensi.
  async findAll(query: BukuQueryDto) {
    const { skip, take } = toPagination(query);
    const where: Prisma.BookWhereInput = {};
    if (query.q) {
      const cari = query.q;
      where.OR = [
        { judul: { contains: cari, mode: 'insensitive' } },
        { pengarang: { contains: cari, mode: 'insensitive' } },
        { isbn: { contains: cari, mode: 'insensitive' } },
      ];
    }
    if (query.kategori) {
      where.kategori = query.kategori;
    }

    const [total, books] = await Promise.all([
      this.prisma.book.count({ where }),
      this.prisma.book.findMany({
        where,
        orderBy: { judul: 'asc' },
        skip,
        take,
      }),
    ]);

    const aktif = await this.prisma.bookLoan.groupBy({
      by: ['bookId'],
      where: {
        bookId: { in: books.map((b) => b.id) },
        status: StatusPinjaman.dipinjam,
      },
      _count: { bookId: true },
    });
    const petaAktif = new Map(aktif.map((a) => [a.bookId, a._count.bookId]));

    const data = books.map((b) => {
      const dipinjam = petaAktif.get(b.id) ?? 0;
      return { ...b, dipinjam, tersedia: b.stok - dipinjam };
    });
    return { data, total };
  }

  // tenantId disematkan eksplisit dari JWT (bukan input user): tipe
  // CreateInput Prisma mewajibkannya, dan middleware memverifikasi
  // nilainya cocok dengan konteks tenant aktif.
  async create(dto: CreateBukuDto, user: RequestUser) {
    return this.prisma.book.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundException('Buku tidak ditemukan.');
    }
    const dipinjam = await this.prisma.bookLoan.count({
      where: { bookId: id, status: StatusPinjaman.dipinjam },
    });
    return { ...book, dipinjam, tersedia: book.stok - dipinjam };
  }

  async update(id: string, dto: UpdateBukuDto) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundException('Buku tidak ditemukan.');
    }
    return this.prisma.book.update({ where: { id }, data: { ...dto } });
  }

  // Hapus buku. Ditolak (409) bila masih ada peminjaman berstatus
  // 'dipinjam'/'terlambat' agar riwayat sirkulasi tidak yatim.
  async remove(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundException('Buku tidak ditemukan.');
    }
    const terkait = await this.prisma.bookLoan.count({
      where: { bookId: id, status: { in: STATUS_BLOKIR_HAPUS } },
    });
    if (terkait > 0) {
      throw new ConflictException(
        'Buku tidak dapat dihapus: masih ada peminjaman berstatus dipinjam/terlambat.',
      );
    }
    await this.prisma.book.delete({ where: { id } });
    return { message: 'Buku berhasil dihapus.' };
  }
}
