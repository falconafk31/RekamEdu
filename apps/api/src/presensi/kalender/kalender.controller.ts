import {
  Body,
  Controller,
  Get,
  Param,
  Put,
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
import { KalenderQueryDto, SetKalenderDto } from './dto/kalender.dto';
import { KalenderService } from './kalender.service';

@Controller('presensi/kalender')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...PRESENSI_ROLES)
export class KalenderController {
  constructor(private readonly kalenderService: KalenderService) {}

  @Get()
  findAll(@Query() query: KalenderQueryDto) {
    return this.kalenderService.findAll(query);
  }

  @Put(':tanggal')
  setTanggal(
    @Request() req: AuthenticatedRequest,
    @Param('tanggal') tanggal: string,
    @Body() dto: SetKalenderDto,
  ) {
    return this.kalenderService.setTanggal(req.user, tanggal, dto);
  }
}
