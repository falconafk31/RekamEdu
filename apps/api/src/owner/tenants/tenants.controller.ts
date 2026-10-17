import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

// Manajemen tenant untuk dashboard Owner platform.
// Catatan: SubscriptionGuard TIDAK dipasang di sini — Owner tidak punya
// subscription. TenantGuard tidak perlu karena OwnerGuard sudah memastikan
// hanya Owner yang masuk (Owner selalu lolos TenantGuard pun).
@Controller('owner/tenants')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  updateSubscription(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.updateSubscription(id, dto);
  }
}
