import { Controller, Get } from '@nestjs/common';
import { PerpusAuth } from '../common/perpus-auth';
import { DashboardService } from './dashboard.service';

@PerpusAuth()
@Controller('perpus/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  ringkasan() {
    return this.dashboardService.getDashboard();
  }
}
