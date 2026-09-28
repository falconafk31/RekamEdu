import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, StatusPresensi } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import {
  formatTanggalISO,
  hariIniISO,
  parseTanggalISO,
} from '../common/date.helper';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import { InputPresensiDto } from './dto/input-presensi.dto';
import { PresensiQueryDto } from './dto/presensi-query.dto';
import { ScanPresensiDto } from './dto/scan-presensi.dto';

@Injectable()
export class PresensiService {
  constructor(private readonly prisma: PrismaService) {}

  // Batasan guru: guru yang punya assignment kelas hanya boleh
  // membaca/menginput presensi kelasnya sendiri.
  private async batasiKelasGuru(user: RequestUser, kelas: string) {
    if (user.role !== Role.GURU) return;
    const guru = await this.prisma.user.findFirst({
      where: { id: user.userId },
      select: { kelas: true },
    });
    if (guru?.kelas && guru.kelas !== kelas) {
      throw new ForbiddenException(
        `Anda hanya boleh mengakses presensi kelas ${guru.kelas}.`,
      );
    }
  }

  // Daftar siswa aktif suatu kelas beserta status presensi hari itu
  // (null bila belum diinput).
  async getHarian(user: RequestUser, query: PresensiQueryDto) {
    await this.batasiKelasGuru(user, query.kelas);
    const date = parseTanggalISO(query.tanggal);

    const students = await this.prisma.student.findMany({
      where: { kelas: query.kelas, active: true },
      select: { id: true, nisn: true, nama: true },
      orderBy: { nama: 'asc' },
    });

    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        date,
        studentId: { in: students.map((s) => s.id) },
      },
      select: { studentId: true, status: true },
    });
    const statusByStudent = new Map(logs.map((l) => [l.studentId, l.status]));

    const data = students.map((s) => ({
      studentId: s.id,
      nisn: s.nisn,
      nama: s.nama,
      status: statusByStudent.get(s.id) ?? null,
    }));
    return { data };
  }

  // Simpan presensi harian: upsert per @@unique(tenantId, date, studentId).
  async simpan(user: RequestUser, dto: InputPresensiDto) {
    await this.batasiKelasGuru(user, dto.kelas);
    const date = parseTanggalISO(dto.tanggal);

    // tenantId diambil dari JWT (server-issued), bukan input user;
    // middleware menolak bila tidak cocok dengan konteks tenant.
    const tenantId = user.tenantId as string;

    for (const item of dto.items) {
      await this.prisma.attendanceLog.upsert({
        where: {
          tenantId_date_studentId: { tenantId, date, studentId: item.studentId },
        },
        update: {
          status: item.status,
          kelas: dto.kelas,
          guruInput: user.username,
        },
        create: denganTenant(user, {
          date,
          studentId: item.studentId,
          status: item.status,
          kelas: dto.kelas,
          guruInput: user.username,
        }),
      });
    }

    const recordId = `${dto.tanggal}:${dto.kelas}`;
    await catatAudit(
      this.prisma,
      user,
      'input_presensi',
      'attendance_logs',
      recordId,
      { tanggal: dto.tanggal, kelas: dto.kelas, jumlah: dto.items.length },
    );

    return {
      data: { tanggal: dto.tanggal, kelas: dto.kelas, jumlah: dto.items.length },
    };
  }

  // Scan QR: cari siswa by NISN lalu upsert kehadiran (default Hadir, hari ini).
  async scan(user: RequestUser, dto: ScanPresensiDto) {
    const tanggal = dto.tanggal ?? hariIniISO();
    const date = parseTanggalISO(tanggal);
    const status: StatusPresensi = dto.status ?? StatusPresensi.Hadir;

    const siswa = await this.prisma.student.findFirst({
      where: { nisn: dto.nisn.trim(), active: true },
      select: { id: true, nisn: true, nama: true, kelas: true },
    });
    if (!siswa) {
      throw new NotFoundException(
        `Siswa dengan NISN "${dto.nisn}" tidak ditemukan.`,
      );
    }

    const tenantId = user.tenantId as string;
    await this.prisma.attendanceLog.upsert({
      where: {
        tenantId_date_studentId: { tenantId, date, studentId: siswa.id },
      },
      update: { status, kelas: siswa.kelas, guruInput: user.username },
      create: denganTenant(user, {
        date,
        studentId: siswa.id,
        status,
        kelas: siswa.kelas,
        guruInput: user.username,
      }),
    });

    await catatAudit(
      this.prisma,
      user,
      'scan_qr_presensi',
      'attendance_logs',
      `${formatTanggalISO(date)}:${siswa.nisn}`,
      { nisn: siswa.nisn, nama: siswa.nama, status },
    );

    return {
      data: {
        studentId: siswa.id,
        nisn: siswa.nisn,
        nama: siswa.nama,
        tanggal: formatTanggalISO(date),
        status,
      },
    };
  }
}
