import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import {
  CreateSuratTemplateDto,
  UpdateSuratTemplateDto,
} from './dto/surat-template.dto';

@Injectable()
export class SuratTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.suratTemplate.findMany({
      orderBy: { nama: 'asc' },
    });
  }

  async create(user: RequestUser, dto: CreateSuratTemplateDto) {
    const ada = await this.prisma.suratTemplate.findFirst({
      where: { nama: dto.nama.trim() },
    });
    if (ada) {
      throw new ConflictException(
        `Template "${dto.nama.trim()}" sudah ada di sekolah ini.`,
      );
    }
    const template = await this.prisma.suratTemplate.create({
      data: denganTenant(user, {
        nama: dto.nama.trim(),
        isi: dto.isi,
      }),
    });
    await catatAudit(
      this.prisma,
      user,
      'tambah_template_surat',
      'surat_templates',
      template.id,
      { nama: template.nama },
    );
    return template;
  }

  async findOne(id: string) {
    const template = await this.prisma.suratTemplate.findFirst({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Template surat tidak ditemukan.');
    }
    return template;
  }

  async update(
    user: RequestUser,
    id: string,
    dto: UpdateSuratTemplateDto,
  ) {
    const existing = await this.findOne(id);
    try {
      const template = await this.prisma.suratTemplate.update({
        where: { id },
        data: {
          ...(dto.nama !== undefined ? { nama: dto.nama.trim() } : {}),
          ...(dto.isi !== undefined ? { isi: dto.isi } : {}),
        },
      });
      await catatAudit(
        this.prisma,
        user,
        'update_template_surat',
        'surat_templates',
        template.id,
        { nama: template.nama },
      );
      return template;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Template surat "${existing.nama}" tidak ditemukan.`,
        );
      }
      throw err;
    }
  }

  async remove(user: RequestUser, id: string) {
    const template = await this.findOne(id);
    await this.prisma.suratTemplate.delete({ where: { id } });
    await catatAudit(
      this.prisma,
      user,
      'hapus_template_surat',
      'surat_templates',
      id,
      { nama: template.nama },
    );
    return template;
  }
}
