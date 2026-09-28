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
import { ADMIN_ROLES } from '../common/roles';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { CreateGuruDto } from './dto/create-guru.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateGuruDto } from './dto/update-guru.dto';
import { GuruService } from './guru.service';

@Controller('presensi/guru')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
export class GuruController {
  constructor(private readonly guruService: GuruService) {}

  @Get()
  findAll() {
    return this.guruService.findAll();
  }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateGuruDto) {
    return this.guruService.create(req.user, dto);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateGuruDto,
  ) {
    return this.guruService.update(req.user, id, dto);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.guruService.resetPassword(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.guruService.remove(req.user, id);
  }
}
