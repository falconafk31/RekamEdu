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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { SURAT_ROLES } from '../common/roles';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { CreateSuratDto } from './dto/create-surat.dto';
import { SuratQueryDto } from './dto/surat-query.dto';
import { UpdateSuratDto } from './dto/update-surat.dto';
import { SuratService } from './surat.service';

import { IsString } from 'class-validator';

class RenderSuratDto {
  @IsString()
  templateId!: string;
}

@Controller('surat')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...SURAT_ROLES)
export class SuratController {
  constructor(private readonly suratService: SuratService) {}

  @Get()
  findAll(@Query() query: SuratQueryDto) {
    return this.suratService.findAll(query);
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateSuratDto) {
    return this.suratService.create(req.user, dto);
  }

  @Post(':id/render')
  render(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RenderSuratDto,
  ) {
    return this.suratService.render(req.user, id, dto.templateId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suratService.findOne(id);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSuratDto,
  ) {
    return this.suratService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.suratService.remove(req.user, id);
  }
}
