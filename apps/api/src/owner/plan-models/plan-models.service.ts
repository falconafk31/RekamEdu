import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanModelDto } from './dto/create-plan-model.dto';
import { PlanModelQueryDto } from './dto/plan-model-query.dto';

// Izin model AI per paket langganan (tabel plan_ai_models).
// Tenant hanya bisa memakai model yang diizinkan paketnya.
@Injectable()
export class PlanModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PlanModelQueryDto) {
    const where: Prisma.PlanAiModelWhereInput = {};
    if (query.plan) where.plan = query.plan;
    return this.prisma.planAiModel.findMany({
      where,
      orderBy: [{ plan: 'asc' }, { aiModel: { displayName: 'asc' } }],
      select: {
        id: true,
        plan: true,
        aiModel: {
          select: {
            id: true,
            provider: true,
            model: true,
            displayName: true,
            isActive: true,
          },
        },
      },
    });
  }

  // Izinkan model untuk sebuah paket.
  async create(dto: CreatePlanModelDto) {
    const aiModel = await this.prisma.aiModel.findUnique({
      where: { id: dto.aiModelId },
      select: { id: true },
    });
    if (!aiModel) {
      throw new NotFoundException('Model AI tidak ditemukan.');
    }
    try {
      return await this.prisma.planAiModel.create({
        data: { plan: dto.plan, aiModelId: dto.aiModelId },
        select: {
          id: true,
          plan: true,
          aiModel: {
            select: {
              id: true,
              provider: true,
              model: true,
              displayName: true,
            },
          },
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Model ini sudah diizinkan untuk paket tersebut.',
        );
      }
      throw err;
    }
  }

  // Cabut izin model untuk sebuah paket.
  async remove(id: string) {
    const link = await this.prisma.planAiModel.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!link) {
      throw new NotFoundException('Izin model tidak ditemukan.');
    }
    await this.prisma.planAiModel.delete({ where: { id } });
    return { id, deleted: true };
  }
}
