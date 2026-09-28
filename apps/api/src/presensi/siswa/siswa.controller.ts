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
import { PRESENSI_ROLES } from '../common/roles';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { CreateSiswaDto } from './dto/create-siswa.dto';
import { SiswaQueryDto } from './dto/siswa-query.dto';
import { UpdateSiswaDto } from './dto/update-siswa.dto';
import { SiswaService } from './siswa.service';

@Controller('presensi/siswa')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...PRESENSI_ROLES)
export class SiswaController {
  constructor(private readonly siswaService: SiswaService) {}

  @Get()
  findAll(@Query() query: SiswaQueryDto) {
    return this.siswaService.findAll(query);
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateSiswaDto) {
    return this.siswaService.create(req.user, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.siswaService.findOne(id);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSiswaDto,
  ) {
    return this.siswaService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.siswaService.remove(req.user, id);
  }
}
