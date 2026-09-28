import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Data kartu anggota perpustakaan berdasarkan NISN.
// Identitas perpustakaan (nama, logo, kepala sekolah) diambil dari
// TenantSetting milik tenant aktif — 404 hanya bila siswanya tidak ada;
// bila setting belum diisi, field perpustakaan bernilai null.
@Injectable()
export class KartuService {
  constructor(private readonly prisma: PrismaService) {}

  async getKartu(nisn: string) {
    const siswa = await this.prisma.student.findFirst({
      where: { nisn },
      select: { nisn: true, nama: true, kelas: true },
    });
    if (!siswa) {
      throw new NotFoundException(
        'Siswa dengan NISN tersebut tidak ditemukan.',
      );
    }

    const setting = await this.prisma.tenantSetting.findFirst({
      select: {
        namaPerpustakaan: true,
        logoUrl: true,
        kepalaSekolah: true,
      },
    });

    return {
      siswa,
      perpustakaan: {
        nama: setting?.namaPerpustakaan ?? null,
        logoUrl: setting?.logoUrl ?? null,
        kepalaSekolah: setting?.kepalaSekolah ?? null,
      },
    };
  }
}
