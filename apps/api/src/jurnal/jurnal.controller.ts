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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/guards/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AuthenticatedRequest } from './common/authenticated-request';
import { JURNAL_ROLES } from './common/roles';
import { CreateJurnalDto } from './dto/create-jurnal.dto';
import { JurnalQueryDto } from './dto/jurnal-query.dto';
import { UpdateJurnalDto } from './dto/update-jurnal.dto';
import { JurnalService } from './jurnal.service';

@Controller('jurnal')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...JURNAL_ROLES)
export class JurnalController {
  constructor(private readonly jurnalService: JurnalService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query() query: JurnalQueryDto) {
    return this.jurnalService.findAll(req.user, query);
  }

  // Didefinisikan sebelum :id agar tidak tertelan param.
  @Get('rekap')
  rekap(
    @Request() req: AuthenticatedRequest,
    @Query('tanggalDari') tanggalDari?: string,
    @Query('tanggalSampai') tanggalSampai?: string,
  ) {
    return this.jurnalService.rekap(req.user, tanggalDari, tanggalSampai);
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateJurnalDto) {
    return this.jurnalService.create(req.user, dto);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jurnalService.findOne(req.user, id);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateJurnalDto,
  ) {
    return this.jurnalService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jurnalService.remove(req.user, id);
  }
}
