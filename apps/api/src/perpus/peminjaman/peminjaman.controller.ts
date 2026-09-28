import { Body, Controller, Get, Param, Post, Query, Request } from '@nestjs/common';
import { PerpusAuth } from '../common/perpus-auth';
import { RequestUser } from '../common/request-user';
import { PeminjamanService } from './peminjaman.service';
import {
  CreatePeminjamanDto,
  KembalikanPeminjamanDto,
  PeminjamanQueryDto,
} from '../dto/peminjaman.dto';

@PerpusAuth()
@Controller('perpus/peminjaman')
export class PeminjamanController {
  constructor(private readonly peminjamanService: PeminjamanService) {}

  @Get()
  daftar(@Query() query: PeminjamanQueryDto) {
    return this.peminjamanService.findAll(query);
  }

  @Post()
  pinjam(
    @Body() dto: CreatePeminjamanDto,
    @Request() req: { user: RequestUser },
  ) {
    return this.peminjamanService.create(dto, req.user);
  }

  @Post(':id/kembali')
  kembali(
    @Param('id') id: string,
    @Body() dto: KembalikanPeminjamanDto,
    @Request() req: { user: RequestUser },
  ) {
    return this.peminjamanService.kembalikan(id, dto, req.user);
  }

  @Post(':id/hilang')
  hilang(@Param('id') id: string, @Request() req: { user: RequestUser }) {
    return this.peminjamanService.tandaiHilang(id, req.user);
  }
}
