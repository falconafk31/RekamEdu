import { Module } from '@nestjs/common';
import { AiModelsController } from './ai-models/ai-models.controller';
import { AiModelsService } from './ai-models/ai-models.service';
import { PlanModelsController } from './plan-models/plan-models.controller';
import { PlanModelsService } from './plan-models/plan-models.service';
import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';
import { UsageController } from './usage/usage.controller';
import { UsageService } from './usage/usage.service';

// Modul dashboard Owner platform.
// (Diwire ke AppModule oleh koordinator; file ini hanya mengekspor
// OwnerModule. PrismaModule bersifat global sehingga PrismaService
// tersedia tanpa import eksplisit.)
@Module({
  controllers: [
    TenantsController,
    AiModelsController,
    PlanModelsController,
    UsageController,
  ],
  providers: [TenantsService, AiModelsService, PlanModelsService, UsageService],
})
export class OwnerModule {}
