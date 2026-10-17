import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { encrypt } from '../../common/crypto/aes-gcm';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';

// Kolom yang aman dikembalikan ke frontend — encryptedKey TIDAK PERNAH
// disertakan; API key tidak pernah ditampilkan.
const SAFE_SELECT = {
  id: true,
  provider: true,
  model: true,
  displayName: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AiModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.aiModel.findMany({
      orderBy: { displayName: 'asc' },
      select: {
        ...SAFE_SELECT,
        _count: { select: { planLinks: true, usageLogs: true } },
      },
    });
  }

  async findOne(id: string) {
    const model = await this.prisma.aiModel.findUnique({
      where: { id },
      select: {
        ...SAFE_SELECT,
        _count: { select: { planLinks: true, usageLogs: true } },
      },
    });
    if (!model) {
      throw new NotFoundException('Model AI tidak ditemukan.');
    }
    return model;
  }

  // apiKey plaintext → dienkripsi, lalu disimpan sebagai encryptedKey.
  async create(dto: CreateAiModelDto) {
    try {
      return await this.prisma.aiModel.create({
        data: {
          provider: dto.provider.trim(),
          model: dto.model.trim(),
          displayName: dto.displayName.trim(),
          encryptedKey: encrypt(dto.apiKey),
          isActive: dto.isActive ?? true,
        },
        select: SAFE_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Model "${dto.provider}/${dto.model}" sudah terdaftar.`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAiModelDto) {
    await this.findOne(id); // 404 bila tidak ada.
    try {
      return await this.prisma.aiModel.update({
        where: { id },
        data: {
          ...(dto.displayName !== undefined
            ? { displayName: dto.displayName.trim() }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          // Key lama hanya diganti bila apiKey baru diisi.
          ...(dto.apiKey ? { encryptedKey: encrypt(dto.apiKey) } : {}),
        },
        select: SAFE_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Kombinasi provider/model sudah dipakai.');
      }
      throw err;
    }
  }

  // Relasi planLinks & usageLogs terhapus otomatis (onDelete: Cascade di skema).
  async remove(id: string) {
    await this.findOne(id); // 404 bila tidak ada.
    await this.prisma.aiModel.delete({ where: { id } });
    return { id, deleted: true };
  }
}
