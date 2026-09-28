import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusPinjaman } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../common/request-user';
import { hariIni, parseTanggal } from '../common/tanggal.util';
import { toPagination } from '../dto/pagination.dto';
import {
  CreatePeminjamanDto,
  KembalikanPeminjamanDto,
  PeminjamanQueryDto,
} from '../dto/peminjaman.dto';

// Relasi yang selalu disertakan pada respons peminjaman,
// sesuai kontrak: book {id, judul}, student {id, nama, nisn, kelas}.
const PEMINJAMAN_INCLUDE: Prisma.BookLoanInclude = {
  book: { select: { id: true, judul: true } },
  student: { select: { id: true, nama: true, nisn: true, kelas: true } },
};

// Menandai flag turunan `isTerlambat`: true bila status masih 'dipinjam'
// dan hari ini (WIB) sudah melewati tanggal kembali seharusnya.
// Catatan: 'terlambat' sebagai STATUS tersimpan hanya dipakai saat buku
// dikembalikan melewati tenggat (lihat kembalikan()).
function tandaiKeterlambatan<
  T extends { status: StatusPinjaman; tanggalKembaliSeharusnya: Date },
>(loan: T, sekarang: Date): T & { isTerlambat: boolean } {
  const isTerlambat =
    loan.status === StatusPinjaman.dipinjam &&
    loan.tanggalKembaliSeharusnya.getTime() < sekarang.getTime();
  return { ...loan, isTerlambat };
}

@Injectable()
export class PeminjamanService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PeminjamanQueryDto) {
    const { skip, take } = toPagination(query);
    const where: Prisma.BookLoanWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.q) {
      const cari = query.q;
      where.OR = [
        { student: { nama: { contains: cari, mode: 'insensitive' } } },
        { student: { nisn: { contains: cari, mode: 'insensitive' } } },
        { book: { judul: { contains: cari, mode: 'insensitive' } } },
      ];
    }

    const sekarang = hariIni();
    const [total, loans] = await Promise.all([
      this.prisma.bookLoan.count({ where }),
      this.prisma.bookLoan.findMany({
        where,
        include: PEMINJAMAN_INCLUDE,
        orderBy: { tanggalPinjam: 'desc' },
        skip,
        take,
      }),
    ]);
    return {
      data: loans.map((l) => tandaiKeterlambatan(l, sekarang)),
      total,
    };
  }

  // Mencatat peminjaman baru dalam SATU transaksi:
  // verifikasi buku → verifikasi siswa → cek stok tersedia →
  // buat loan → tulis audit. Seluruhnya rollback bila satu langkah gagal.
  async create(dto: CreatePeminjamanDto, user: RequestUser) {
    const tanggalPinjam = hariIni();
    const tanggalKembaliSeharusnya = parseTanggal(
      dto.tanggalKembaliSeharusnya,
      'tanggalKembaliSeharusnya',
    );
    if (tanggalKembaliSeharusnya.getTime() < tanggalPinjam.getTime()) {
      throw new BadRequestException(
        'Tanggal kembali seharusnya tidak boleh sebelum tanggal pinjam.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // tenantId diambil dari JWT (bukan input user) dan disematkan eksplisit
      // pada query di dalam transaksi sebagai pertahanan berlapis — middleware
      // $use tidak dijamin berjalan pada klien transaksi interaktif.
      const tenantId = user.tenantId;

      const book = await tx.book.findFirst({
        where: { id: dto.bookId, tenantId },
      });
      if (!book) {
        throw new NotFoundException('Buku tidak ditemukan.');
      }

      const student = await tx.student.findFirst({
        where: { id: dto.studentId, tenantId },
      });
      if (!student) {
        throw new NotFoundException('Siswa tidak ditemukan.');
      }

      const aktif = await tx.bookLoan.count({
        where: {
          bookId: book.id,
          tenantId,
          status: StatusPinjaman.dipinjam,
        },
      });
      if (book.stok <= aktif) {
        throw new ConflictException(
          `Stok buku "${book.judul}" tidak tersedia ` +
            `(semua ${book.stok} eksemplar sedang dipinjam).`,
        );
      }

      const loan = await tx.bookLoan.create({
        data: {
          tenantId,
          bookId: book.id,
          studentId: student.id,
          tanggalPinjam,
          tanggalKembaliSeharusnya,
          status: StatusPinjaman.dipinjam,
          guruInput: user.username,
        },
        include: PEMINJAMAN_INCLUDE,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: user.userId,
          aksi: 'pinjam',
          tabelTerkait: 'book_loans',
          recordId: loan.id,
          detail: JSON.stringify({
            bookId: book.id,
            judul: book.judul,
            studentId: student.id,
            namaSiswa: student.nama,
            nisn: student.nisn,
            tanggalPinjam: tanggalPinjam.toISOString().slice(0, 10),
            tanggalKembaliSeharusnya: dto.tanggalKembaliSeharusnya,
          }),
        },
      });

      return tandaiKeterlambatan(loan, tanggalPinjam);
    });
  }

  // Pengembalian buku: status akhir 'dikembalikan', atau 'terlambat'
  // bila tanggal aktual melewati tanggal kembali seharusnya.
  async kembalikan(id: string, dto: KembalikanPeminjamanDto, user: RequestUser) {
    const loan = await this.prisma.bookLoan.findUnique({ where: { id } });
    if (!loan) {
      throw new NotFoundException('Peminjaman tidak ditemukan.');
    }
    if (loan.status !== StatusPinjaman.dipinjam) {
      throw new ConflictException(
        'Hanya peminjaman berstatus "dipinjam" yang dapat dikembalikan.',
      );
    }

    const aktual = dto.tanggalKembaliAktual
      ? parseTanggal(dto.tanggalKembaliAktual, 'tanggalKembaliAktual')
      : hariIni();
    if (aktual.getTime() < loan.tanggalPinjam.getTime()) {
      throw new BadRequestException(
        'Tanggal kembali aktual tidak boleh sebelum tanggal pinjam.',
      );
    }

    const status =
      aktual.getTime() > loan.tanggalKembaliSeharusnya.getTime()
        ? StatusPinjaman.terlambat
        : StatusPinjaman.dikembalikan;

    const updated = await this.prisma.bookLoan.update({
      where: { id },
      data: { tanggalKembaliAktual: aktual, status },
      include: PEMINJAMAN_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        aksi: 'kembali',
        tabelTerkait: 'book_loans',
        recordId: updated.id,
        detail: JSON.stringify({
          status,
          tanggalKembaliAktual: aktual.toISOString().slice(0, 10),
        }),
      },
    });

    return updated;
  }

  // Menandai buku hilang: status menjadi 'hilang' + audit.
  async tandaiHilang(id: string, user: RequestUser) {
    const loan = await this.prisma.bookLoan.findUnique({ where: { id } });
    if (!loan) {
      throw new NotFoundException('Peminjaman tidak ditemukan.');
    }
    if (loan.status !== StatusPinjaman.dipinjam) {
      throw new ConflictException(
        'Hanya peminjaman berstatus "dipinjam" yang dapat ditandai hilang.',
      );
    }

    const updated = await this.prisma.bookLoan.update({
      where: { id },
      data: { status: StatusPinjaman.hilang },
      include: PEMINJAMAN_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        aksi: 'hilang',
        tabelTerkait: 'book_loans',
        recordId: updated.id,
        detail: JSON.stringify({
          bookId: updated.bookId,
          studentId: updated.studentId,
        }),
      },
    });

    return updated;
  }
}
