import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ADMIN_ROLES } from '../common/roles';
import { AktivitasService } from './aktivitas.service';
import { AktivitasQueryDto } from './dto/aktivitas-query.dto';

@Controller('presensi/aktivitas')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
export class AktivitasController {
  constructor(private readonly aktivitasService: AktivitasService) {}

  @Get()
  findAll(@Query() query: AktivitasQueryDto) {
    return this.aktivitasService.findAll(query);
  }
}
