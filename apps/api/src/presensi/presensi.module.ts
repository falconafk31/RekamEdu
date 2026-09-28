import { Module } from '@nestjs/common';
import { AktivitasController } from './aktivitas/aktivitas.controller';
import { AktivitasService } from './aktivitas/aktivitas.service';
import { GuruController } from './guru/guru.controller';
import { GuruService } from './guru/guru.service';
import { KalenderController } from './kalender/kalender.controller';
import { KalenderService } from './kalender/kalender.service';
import { PengaturanController } from './pengaturan/pengaturan.controller';
import { PengaturanService } from './pengaturan/pengaturan.service';
import { PeriodeController } from './periode/periode.controller';
import { PeriodeService } from './periode/periode.service';
import { PresensiController } from './presensi/presensi.controller';
import { PresensiService } from './presensi/presensi.service';
import {
  RekapController,
  RekapSemesterController,
  StatistikController,
} from './rekap/rekap.controller';
import { RekapService } from './rekap/rekap.service';
import { RiwayatKelasController } from './riwayat-kelas/riwayat-kelas.controller';
import { RiwayatKelasService } from './riwayat-kelas/riwayat-kelas.service';
import { SiswaController } from './siswa/siswa.controller';
import { SiswaService } from './siswa/siswa.service';

// Modul 1 — Presensi Siswa.
// (Diwire ke AppModule oleh koordinator; file ini hanya mengekspor
// PresensiModule. PrismaModule bersifat global sehingga PrismaService
// tersedia tanpa import eksplisit.)
@Module({
  controllers: [
    SiswaController,
    GuruController,
    PresensiController,
    RekapController,
    RekapSemesterController,
    StatistikController,
    KalenderController,
    PeriodeController,
    RiwayatKelasController,
    AktivitasController,
    PengaturanController,
  ],
  providers: [
    SiswaService,
    GuruService,
    PresensiService,
    RekapService,
    KalenderService,
    PeriodeService,
    RiwayatKelasService,
    AktivitasService,
    PengaturanService,
  ],
})
export class PresensiModule {}
