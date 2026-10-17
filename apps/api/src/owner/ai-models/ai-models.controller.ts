import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
import { AiModelsService } from './ai-models.service';

// Kelola model AI milik Owner (provider + API key terenkripsi).
// Key TIDAK PERNAH dikirim ke frontend — semua respons hanya memakai
// kolom aman (tanpa encryptedKey).
@Controller('owner/ai-models')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class AiModelsController {
  constructor(private readonly aiModelsService: AiModelsService) {}

  @Get()
  findAll() {
    return this.aiModelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiModelsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAiModelDto) {
    return this.aiModelsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAiModelDto) {
    return this.aiModelsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiModelsService.remove(id);
  }
}
