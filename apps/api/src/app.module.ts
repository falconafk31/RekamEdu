import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PresensiModule } from './presensi/presensi.module';
import { PerpusModule } from './perpus/perpus.module';
import { JurnalModule } from './jurnal/jurnal.module';
import { RppModule } from './rpp/rpp.module';
import { SuratModule } from './surat/surat.module';
import { OwnerModule } from './owner/owner.module';

@Module({
  imports: [
    // Konfigurasi global: membaca process.env
    // (DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
    //  ENCRYPTION_KEY, MINIO_*, APP_PORT, SEED_*).
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, // global: PrismaService tersedia di semua modul
    AuthModule,
    PresensiModule, // Tahap 1: Modul 1 — Presensi Siswa
    PerpusModule, // Tahap 1: Modul 4 — Perpustakaan
    JurnalModule, // Tahap 2+3: Modul 2 — Jurnal Harian Guru/Wali Kelas
    RppModule, // Tahap 2+3: Modul 3 — RPP & Perangkat Pembelajaran + AI
    SuratModule, // Tahap 2+3: Modul 5 — Surat Masuk & Keluar
    OwnerModule, // Tahap 2+3: Dashboard Owner (platform)
    // Rencana berikutnya: ThrottlerModule + Redis (REDIS_URL) untuk rate limit
    // per-tenant pada endpoint auth — Redis saat ini dipakai kuota AI (rpp/ai).
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
