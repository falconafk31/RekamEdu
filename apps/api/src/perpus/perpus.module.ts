import { Module } from '@nestjs/common';
import { BukuController } from './buku/buku.controller';
import { BukuService } from './buku/buku.service';
import { PeminjamanController } from './peminjaman/peminjaman.controller';
import { PeminjamanService } from './peminjaman/peminjaman.service';
import { KunjunganController } from './kunjungan/kunjungan.controller';
import { KunjunganService } from './kunjungan/kunjungan.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { KartuController } from './kartu/kartu.controller';
import { KartuService } from './kartu/kartu.service';

// Modul 4 — Perpustakaan (Tahap 1).
// Seluruh route berada di bawah /api/perpus/* (global prefix /api).
// Koordinator melakukan wiring ke AppModule; file ini hanya
// mengekspor PerpusModule beserta service-nya.
@Module({
  controllers: [
    BukuController,
    PeminjamanController,
    KunjunganController,
    DashboardController,
    KartuController,
  ],
  providers: [
    BukuService,
    PeminjamanService,
    KunjunganService,
    DashboardService,
    KartuService,
  ],
  exports: [
    BukuService,
    PeminjamanService,
    KunjunganService,
    DashboardService,
    KartuService,
  ],
})
export class PerpusModule {}
