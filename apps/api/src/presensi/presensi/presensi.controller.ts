import {
  Body,
  Controller,
  Get,
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
import { InputPresensiDto } from './dto/input-presensi.dto';
import { PresensiQueryDto } from './dto/presensi-query.dto';
import { ScanPresensiDto } from './dto/scan-presensi.dto';
import { PresensiService } from './presensi.service';

@Controller('presensi/presensi')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...PRESENSI_ROLES)
export class PresensiController {
  constructor(private readonly presensiService: PresensiService) {}

  @Get()
  getHarian(@Request() req: AuthenticatedRequest, @Query() query: PresensiQueryDto) {
    return this.presensiService.getHarian(req.user, query);
  }

  @Post()
  simpan(@Request() req: AuthenticatedRequest, @Body() dto: InputPresensiDto) {
    return this.presensiService.simpan(req.user, dto);
  }

  @Post('scan')
  scan(@Request() req: AuthenticatedRequest, @Body() dto: ScanPresensiDto) {
    return this.presensiService.scan(req.user, dto);
  }
}
