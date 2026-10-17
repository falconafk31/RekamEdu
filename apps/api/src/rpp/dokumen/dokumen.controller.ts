import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RPP_ROLES } from '../common/roles';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { CreateDokumenDto } from './dto/create-dokumen.dto';
import { DokumenQueryDto } from './dto/dokumen-query.dto';
import { UpdateDokumenDto } from './dto/update-dokumen.dto';
import { DokumenService } from './dokumen.service';

@Controller('rpp/dokumen')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...RPP_ROLES)
export class DokumenController {
  constructor(private readonly dokumenService: DokumenService) {}

  @Get()
  findAll(@Query() query: DokumenQueryDto) {
    return this.dokumenService.findAll(query);
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateDokumenDto) {
    return this.dokumenService.create(req.user, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dokumenService.findOne(id);
  }

  // Unduh dokumen sebagai DOCX agar bisa diedit ulang.
  // Contoh: GET /rpp/dokumen/:id/export?format=docx
  @Get(':id/export')
  async export(
    @Param('id') id: string,
    @Query('format') format: string | undefined,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    if (format !== 'docx') {
      throw new BadRequestException(
        'Format tidak didukung. Gunakan format=docx.',
      );
    }
    const { buffer, namaFile } = await this.dokumenService.exportDocx(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${namaFile}"; filename*=UTF-8''${encodeURIComponent(namaFile)}`,
    );
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDokumenDto,
  ) {
    return this.dokumenService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dokumenService.remove(req.user, id);
  }
}
