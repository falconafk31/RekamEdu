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
import {
  RiwayatKelasQueryDto,
  UpsertRiwayatKelasDto,
} from './dto/riwayat-kelas.dto';
import { RiwayatKelasService } from './riwayat-kelas.service';

@Controller('presensi/riwayat-kelas')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...PRESENSI_ROLES)
export class RiwayatKelasController {
  constructor(private readonly riwayatKelasService: RiwayatKelasService) {}

  @Get()
  findAll(@Query() query: RiwayatKelasQueryDto) {
    return this.riwayatKelasService.findAll(query);
  }

  @Post()
  upsert(@Request() req: AuthenticatedRequest, @Body() dto: UpsertRiwayatKelasDto) {
    return this.riwayatKelasService.upsert(req.user, dto);
  }
}
