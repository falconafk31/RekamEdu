import { Controller, Get, Param } from '@nestjs/common';
import { PerpusAuth } from '../common/perpus-auth';
import { KartuService } from './kartu.service';

@PerpusAuth()
@Controller('perpus/anggota')
export class KartuController {
  constructor(private readonly kartuService: KartuService) {}

  @Get(':nisn/kartu')
  kartu(@Param('nisn') nisn: string) {
    return this.kartuService.getKartu(nisn);
  }
}
