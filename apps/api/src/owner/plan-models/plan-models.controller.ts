import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';
import { CreatePlanModelDto } from './dto/create-plan-model.dto';
import { PlanModelQueryDto } from './dto/plan-model-query.dto';
import { PlanModelsService } from './plan-models.service';

// Izin model AI per paket langganan — khusus Owner platform.
@Controller('owner/plan-models')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class PlanModelsController {
  constructor(private readonly planModelsService: PlanModelsService) {}

  @Get()
  findAll(@Query() query: PlanModelQueryDto) {
    return this.planModelsService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreatePlanModelDto) {
    return this.planModelsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planModelsService.remove(id);
  }
}
