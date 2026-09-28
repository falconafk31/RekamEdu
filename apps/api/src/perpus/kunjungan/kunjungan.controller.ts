import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { PerpusAuth } from '../common/perpus-auth';
import { RequestUser } from '../common/request-user';
import { KunjunganService } from './kunjungan.service';
import { CreateKunjunganDto, KunjunganQueryDto } from '../dto/kunjungan.dto';

@PerpusAuth()
@Controller('perpus/kunjungan')
export class KunjunganController {
  constructor(private readonly kunjunganService: KunjunganService) {}

  @Get()
  daftar(@Query() query: KunjunganQueryDto) {
    return this.kunjunganService.findAll(query);
  }

  @Post()
  catat(@Body() dto: CreateKunjunganDto, @Request() req: { user: RequestUser }) {
    return this.kunjunganService.create(dto, req.user);
  }

  @Delete(':id')
  hapus(@Param('id') id: string) {
    return this.kunjunganService.remove(id);
  }
}
