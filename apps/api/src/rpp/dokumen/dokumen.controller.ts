import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { RPP_ROLES } from '../common/roles';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { CreateDokumenDto } from './dto/create-dokumen.dto';
import { DokumenQueryDto } from './dto/dokumen-query.dto';
import { UpdateDokumenDto } from './dto/update-dokumen.dto';
import { DokumenService } from './dokumen.service';

@Controller('rpp/dokumen')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...RPP_ROLES)
export class DokumenController {
  constructor(private readonly dokumenService: DokumenService) {}

  @Get()
  findAll(@Query() query: DokumenQueryDto) {
    return this.dokumenService.findAll(query);
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateDokumenDto) {
    return this.dokumenService.create(req.user, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dokumenService.findOne(id);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDokumenDto,
  ) {
    return this.dokumenService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dokumenService.remove(req.user, id);
  }
}
