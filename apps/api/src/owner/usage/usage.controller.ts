import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';
import { UsageQueryDto } from './dto/usage-query.dto';
import { UsageService } from './usage.service';

// Laporan pemakaian AI lintas tenant — khusus Owner platform.
@Controller('owner/usage')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  findUsage(@Query() query: UsageQueryDto) {
    return this.usageService.findUsage(query);
  }

  @Get('ringkasan')
  ringkasan() {
    return this.usageService.ringkasan();
  }
}
