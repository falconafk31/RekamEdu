import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Semester, StatusPresensi } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { formatTanggalISO, hariIniISO, parseTanggalISO } from '../common/date.helper';
import { RekapQueryDto } from './dto/rekap-query.dto';
import { RekapSemesterQueryDto } from './dto/rekap-semester-query.dto';

const STATUS_LIST: StatusPresensi[] = [
  StatusPresensi.Hadir,
  StatusPresensi.Izin,
  StatusPresensi.Sakit,
  StatusPresensi.Alfa,
];

type Agregat = Record<StatusPresensi, number>;

function agregatKosong(): Agregat {
  return { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 };
}

@Injectable()
export class RekapService {
  constructor(private readonly prisma: PrismaService) {}

  private validasiRentang(dari: string, sampai: string) {
    if (dari > sampai) {
      throw new BadRequestException(
        'Tanggal "dari" tidak boleh lebih dari "sampai".',
      );
    }
  }

  // Rekap per siswa dalam satu kelas pada rentang tanggal.
  async rekap(query: RekapQueryDto) {
    this.validasiRentang(query.dari, query.sampai);
    const dari = parseTanggalISO(query.dari);
    const sampai = parseTanggalISO(query.sampai);

    const students = await this.prisma.student.findMany({
      where: { kelas: query.kelas },
      select: { id: true, nisn: true, nama: true, kelas: true },
      orderBy: { nama: 'asc' },
    });

    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        date: { gte: dari, lte: sampai },
        studentId: { in: students.map((s) => s.id) },
      },
      select: { studentId: true, status: true },
    });

    const hitung = new Map<string, Agregat>();
    for (const s of students) hitung.set(s.id, agregatKosong());
    for (const l of logs) {
      const a = hitung.get(l.studentId);
      if (a) a[l.status] += 1;
    }

    const data = students.map((s) => {
      const a = hitung.get(s.id) ?? agregatKosong();
      return {
        studentId: s.id,
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.kelas,
        ...a,
        total: STATUS_LIST.reduce((n, k) => n + a[k], 0),
      };
    });

    return { data, periode: { dari: query.dari, sampai: query.sampai } };
  }

  // Rekap satu semester: rentang tanggal diturunkan dari tahunAjaran
  // + semester periode. Konvensi kalender pendidikan Indonesia:
  // Ganjil = 1 Juli–31 Des tahun pertama; Genap = 1 Jan–30 Juni tahun kedua.
  // Batas akhir dijepit ke hari ini (data masa depan belum ada).
  async rekapSemester(query: RekapSemesterQueryDto) {
    const periode = await this.prisma.academicPeriod.findFirst({
      where: { id: query.periodeId },
    });
    if (!periode) {
      throw new NotFoundException('Periode akademik tidak ditemukan.');
    }

    const cocok = /^(\d{4})\/(\d{4})$/.exec(periode.tahunAjaran);
    if (!cocok) {
      throw new BadRequestException(
        `Format tahun ajaran tidak valid: "${periode.tahunAjaran}".`,
      );
    }
    const [, thn1, thn2] = cocok;

    const dari =
      periode.semester === Semester.Ganjil ? `${thn1}-07-01` : `${thn2}-01-01`;
    let sampai =
      periode.semester === Semester.Ganjil ? `${thn1}-12-31` : `${thn2}-06-30`;
    const hariIni = hariIniISO();
    if (sampai > hariIni) sampai = hariIni;

    const hasil = await this.rekap({ dari, sampai, kelas: query.kelas });
    return {
      ...hasil,
      periode: {
        id: periode.id,
        tahunAjaran: periode.tahunAjaran,
        semester: periode.semester,
        dari,
        sampai,
      },
    };
  }

  // Statistik agregat: total, harian, dan per kelas.
  async statistik(query: RekapQueryDto) {
    this.validasiRentang(query.dari, query.sampai);
    const dari = parseTanggalISO(query.dari);
    const sampai = parseTanggalISO(query.sampai);

    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        date: { gte: dari, lte: sampai },
        ...(query.kelas ? { kelas: query.kelas } : {}),
      },
      select: { date: true, status: true, kelas: true },
    });

    const total = agregatKosong();
    const harian = new Map<string, Agregat>();
    const perKelas = new Map<string, Agregat>();

    for (const l of logs) {
      total[l.status] += 1;

      const tgl = formatTanggalISO(l.date);
      if (!harian.has(tgl)) harian.set(tgl, agregatKosong());
      harian.get(tgl)![l.status] += 1;

      const k = l.kelas ?? '-';
      if (!perKelas.has(k)) perKelas.set(k, agregatKosong());
      perKelas.get(k)![l.status] += 1;
    }

    return {
      total,
      harian: [...harian.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([tanggal, a]) => ({ tanggal, ...a })),
      perKelas: [...perKelas.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([kelas, a]) => ({
          kelas,
          ...a,
          total: STATUS_LIST.reduce((n, k) => n + a[k], 0),
        })),
    };
  }
}
