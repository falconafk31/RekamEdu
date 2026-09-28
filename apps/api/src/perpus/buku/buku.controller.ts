import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { PerpusAuth } from '../common/perpus-auth';
import { RequestUser } from '../common/request-user';
import { BukuService } from './buku.service';
import { BukuQueryDto, CreateBukuDto, UpdateBukuDto } from '../dto/buku.dto';

@PerpusAuth()
@Controller('perpus/buku')
export class BukuController {
  constructor(private readonly bukuService: BukuService) {}

  @Get()
  daftar(@Query() query: BukuQueryDto) {
    return this.bukuService.findAll(query);
  }

  @Post()
  buat(@Body() dto: CreateBukuDto, @Request() req: { user: RequestUser }) {
    return this.bukuService.create(dto, req.user);
  }

  @Get(':id')
  satu(@Param('id') id: string) {
    return this.bukuService.findOne(id);
  }

  @Patch(':id')
  ubah(@Param('id') id: string, @Body() dto: UpdateBukuDto) {
    return this.bukuService.update(id, dto);
  }

  @Delete(':id')
  hapus(@Param('id') id: string) {
    return this.bukuService.remove(id);
  }
}
