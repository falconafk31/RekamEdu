import { Injectable } from '@nestjs/common';
import { StatusPinjaman } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { awalBulanIni, geserHari, hariIni } from '../common/tanggal.util';

// Agregat ringkas untuk halaman dashboard perpustakaan.
// Definisi "terlambat": status masih 'dipinjam' dan hari ini (WIB)
// sudah melewati tanggal kembali seharusnya — selaras dengan flag
// isTerlambat pada daftar peminjaman.
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const sekarang = hariIni();
    const tigaPuluhHariLalu = geserHari(sekarang, -30);

    const [
      totalJudul,
      agregatStok,
      dipinjamAktif,
      terlambat,
      kunjunganHariIni,
      kunjunganBulanIni,
      grupTerlaris,
    ] = await Promise.all([
      this.prisma.book.count(),
      this.prisma.book.aggregate({ _sum: { stok: true } }),
      this.prisma.bookLoan.count({
        where: { status: StatusPinjaman.dipinjam },
      }),
      this.prisma.bookLoan.count({
        where: {
          status: StatusPinjaman.dipinjam,
          tanggalKembaliSeharusnya: { lt: sekarang },
        },
      }),
      this.prisma.libraryVisit.count({ where: { tanggal: sekarang } }),
      this.prisma.libraryVisit.count({
        where: { tanggal: { gte: awalBulanIni() } },
      }),
      this.prisma.bookLoan.groupBy({
        by: ['bookId'],
        where: { tanggalPinjam: { gte: tigaPuluhHariLalu } },
        _count: { bookId: true },
        orderBy: { _count: { bookId: 'desc' } },
        take: 5,
      }),
    ]);

    const petaJudul = new Map(
      (
        await this.prisma.book.findMany({
          where: { id: { in: grupTerlaris.map((g) => g.bookId) } },
          select: { id: true, judul: true },
        })
      ).map((b) => [b.id, b.judul]),
    );

    return {
      totalJudul,
      totalEksemplar: agregatStok._sum.stok ?? 0,
      dipinjamAktif,
      terlambat,
      kunjunganHariIni,
      kunjunganBulanIni,
      bukuTerlaris: grupTerlaris.map((g) => ({
        bookId: g.bookId,
        judul: petaJudul.get(g.bookId) ?? '(buku telah dihapus)',
        jumlahPinjam: g._count.bookId,
      })),
    };
  }
}
