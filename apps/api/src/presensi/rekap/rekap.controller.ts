import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PRESENSI_ROLES } from '../common/roles';
import { RekapQueryDto } from './dto/rekap-query.dto';
import { RekapSemesterQueryDto } from './dto/rekap-semester-query.dto';
import { RekapService } from './rekap.service';

const guards = [JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard];

@Controller('presensi/rekap')
@UseGuards(...guards)
@Roles(...PRESENSI_ROLES)
export class RekapController {
  constructor(private readonly rekapService: RekapService) {}

  @Get()
  rekap(@Query() query: RekapQueryDto) {
    return this.rekapService.rekap(query);
  }
}

@Controller('presensi/rekap-semester')
@UseGuards(...guards)
@Roles(...PRESENSI_ROLES)
export class RekapSemesterController {
  constructor(private readonly rekapService: RekapService) {}

  @Get()
  rekapSemester(@Query() query: RekapSemesterQueryDto) {
    return this.rekapService.rekapSemester(query);
  }
}

@Controller('presensi/statistik')
@UseGuards(...guards)
@Roles(...PRESENSI_ROLES)
export class StatistikController {
  constructor(private readonly rekapService: RekapService) {}

  @Get()
  statistik(@Query() query: RekapQueryDto) {
    return this.rekapService.statistik(query);
  }
}
