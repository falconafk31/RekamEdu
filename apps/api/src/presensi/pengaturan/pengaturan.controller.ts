import {
  Body,
  Controller,
  Get,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ADMIN_ROLES } from '../common/roles';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { UpdatePengaturanDto } from './dto/update-pengaturan.dto';
import { PengaturanService } from './pengaturan.service';

@Controller('presensi/pengaturan')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
export class PengaturanController {
  constructor(private readonly pengaturanService: PengaturanService) {}

  @Get()
  get(@Request() req: AuthenticatedRequest) {
    return this.pengaturanService.get(req.user);
  }

  @Put()
  update(@Request() req: AuthenticatedRequest, @Body() dto: UpdatePengaturanDto) {
    return this.pengaturanService.update(req.user, dto);
  }
}
