import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { SURAT_ROLES } from '../common/roles';
import { AuthenticatedRequest } from '../common/authenticated-request';
import {
  CreateSuratTemplateDto,
  UpdateSuratTemplateDto,
} from './dto/surat-template.dto';
import { SuratTemplateService } from './template.service';

@Controller('surat/template')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...SURAT_ROLES)
export class SuratTemplateController {
  constructor(private readonly templateService: SuratTemplateService) {}

  @Get()
  findAll() {
    return this.templateService.findAll();
  }

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateSuratTemplateDto,
  ) {
    return this.templateService.create(req.user, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSuratTemplateDto,
  ) {
    return this.templateService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.templateService.remove(req.user, id);
  }
}
