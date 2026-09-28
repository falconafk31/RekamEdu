import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { CreatePeriodeDto } from './dto/create-periode.dto';
import { PeriodeService } from './periode.service';

@Controller('presensi/periode')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...PRESENSI_ROLES)
export class PeriodeController {
  constructor(private readonly periodeService: PeriodeService) {}

  @Get()
  findAll() {
    return this.periodeService.findAll();
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreatePeriodeDto) {
    return this.periodeService.create(req.user, dto);
  }

  @Patch(':id/aktifkan')
  aktifkan(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.periodeService.aktifkan(req.user, id);
  }
}
