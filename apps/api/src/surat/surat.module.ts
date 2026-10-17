import { Module } from '@nestjs/common';
import { SuratController } from './surat/surat.controller';
import { SuratService } from './surat/surat.service';
import { SuratTemplateController } from './template/template.controller';
import { SuratTemplateService } from './template/template.service';

// Modul 5 — Surat Masuk & Keluar.
// Route berada di bawah /api/surat/* (global prefix /api) dan
// /api/surat/template/* untuk template. Koordinator melakukan wiring ke
// AppModule; file ini hanya mengekspor SuratModule beserta service-nya.
@Module({
  controllers: [SuratController, SuratTemplateController],
  providers: [SuratService, SuratTemplateService],
  exports: [SuratService, SuratTemplateService],
})
export class SuratModule {}
