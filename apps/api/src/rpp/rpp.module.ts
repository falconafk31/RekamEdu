import { Module } from '@nestjs/common';
import { AiController } from './ai/ai.controller';
import { AiProviderService } from './ai/ai-provider.service';
import { AiQuotaService } from './ai/ai-quota.service';
import { DokumenController } from './dokumen/dokumen.controller';
import { DokumenService } from './dokumen/dokumen.service';

// Modul 3 — RPP & Perangkat Pembelajaran + AI.
// (Diwire ke AppModule oleh koordinator; file ini hanya mengekspor
// RppModule. PrismaModule bersifat global sehingga PrismaService
// tersedia tanpa import eksplisit.)
@Module({
  controllers: [DokumenController, AiController],
  providers: [DokumenService, AiQuotaService, AiProviderService],
})
export class RppModule {}
