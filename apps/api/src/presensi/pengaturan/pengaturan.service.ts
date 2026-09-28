import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import { UpdatePengaturanDto } from './dto/update-pengaturan.dto';

// Nilai bawaan TenantSetting saat tenant belum pernah menyimpan pengaturan.
const DEFAULT_DAFTAR_KELAS = [
  '1A', '1B',
  '2A', '2B',
  '3A', '3B',
  '4A', '4B',
  '5A', '5B',
  '6A', '6B',
];
const DEFAULT_HARI_LIBUR_MINGGUAN = [0, 6]; // Minggu & Sabtu

@Injectable()
export class PengaturanService {
  constructor(private readonly prisma: PrismaService) {}

  // Ambil pengaturan tenant; buat baris default bila belum ada.
  async get(user: RequestUser) {
    let setting = await this.prisma.tenantSetting.findFirst();
    if (!setting) {
      setting = await this.prisma.tenantSetting.create({
        data: denganTenant(user, {
          daftarKelas: DEFAULT_DAFTAR_KELAS,
          hariLiburMingguan: DEFAULT_HARI_LIBUR_MINGGUAN,
        }),
      });
      await catatAudit(
        this.prisma,
        user,
        'inisialisasi_pengaturan',
        'tenant_settings',
        setting.id,
      );
    }
    return setting;
  }

  async update(user: RequestUser, dto: UpdatePengaturanDto) {
    // Pastikan baris ada (auto-create default bila belum).
    const existing = await this.get(user);

    const updated = await this.prisma.tenantSetting.update({
      where: { id: existing.id },
      data: {
        ...(dto.namaSekolah !== undefined ? { namaSekolah: dto.namaSekolah } : {}),
        ...(dto.alamat !== undefined ? { alamat: dto.alamat } : {}),
        ...(dto.kepalaSekolah !== undefined
          ? { kepalaSekolah: dto.kepalaSekolah }
          : {}),
        ...(dto.nipKepalaSekolah !== undefined
          ? { nipKepalaSekolah: dto.nipKepalaSekolah }
          : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.daftarKelas !== undefined ? { daftarKelas: dto.daftarKelas } : {}),
        ...(dto.kopBaris2 !== undefined ? { kopBaris2: dto.kopBaris2 } : {}),
        ...(dto.kopBaris3 !== undefined ? { kopBaris3: dto.kopBaris3 } : {}),
        ...(dto.kopBaris4 !== undefined ? { kopBaris4: dto.kopBaris4 } : {}),
        ...(dto.kopBaris5 !== undefined ? { kopBaris5: dto.kopBaris5 } : {}),
        ...(dto.namaPerpustakaan !== undefined
          ? { namaPerpustakaan: dto.namaPerpustakaan }
          : {}),
        ...(dto.hariLiburMingguan !== undefined
          ? { hariLiburMingguan: dto.hariLiburMingguan }
          : {}),
      },
    });

    await catatAudit(
      this.prisma,
      user,
      'update_pengaturan',
      'tenant_settings',
      updated.id,
    );
    return updated;
  }
}
