import { Module } from '@nestjs/common';
import { JurnalController } from './jurnal.controller';
import { JurnalService } from './jurnal.service';

// Modul 2 — Jurnal Harian Guru/Wali Kelas.
// (Diwire ke AppModule oleh koordinator; file ini hanya mengekspor
// JurnalModule. PrismaModule bersifat global sehingga PrismaService
// tersedia tanpa import eksplisit.)
@Module({
  controllers: [JurnalController],
  providers: [JurnalService],
})
export class JurnalModule {}
