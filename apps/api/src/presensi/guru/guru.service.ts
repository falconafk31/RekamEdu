import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { catatAudit } from '../common/audit.helper';
import { RequestUser } from '../common/request-user';
import { denganTenant } from '../common/tenant-data';
import { CreateGuruDto } from './dto/create-guru.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateGuruDto } from './dto/update-guru.dto';

// Kolom akun guru yang aman dikembalikan ke frontend (tanpa passwordHash).
const GURU_SELECT = {
  id: true,
  username: true,
  nama: true,
  kelas: true,
  isActive: true,
} as const;

@Injectable()
export class GuruService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const data = await this.prisma.user.findMany({
      where: { role: Role.GURU },
      select: GURU_SELECT,
      orderBy: { username: 'asc' },
    });
    return { data };
  }

  // Mengambil akun guru berdasarkan id; melempar 404 bila id bukan akun GURU
  // (melindungi akun ADMIN/KEPALA_SEKOLAH dari endpoint ini).
  private async findGuruOrThrow(id: string) {
    const guru = await this.prisma.user.findFirst({
      where: { id, role: Role.GURU },
      select: GURU_SELECT,
    });
    if (!guru) {
      throw new NotFoundException('Akun guru tidak ditemukan.');
    }
    return guru;
  }

  async create(user: RequestUser, dto: CreateGuruDto) {
    try {
      const guru = await this.prisma.user.create({
        data: denganTenant(user, {
          username: dto.username.trim(),
          nama: dto.nama.trim(),
          passwordHash: await argon2.hash(dto.password),
          role: Role.GURU,
          kelas: dto.kelas ?? null,
          isActive: true,
        }),
        select: GURU_SELECT,
      });
      await catatAudit(this.prisma, user, 'tambah_guru', 'users', guru.id, {
        username: guru.username,
        nama: guru.nama,
        kelas: guru.kelas,
      });
      return guru;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          `Username "${dto.username}" sudah dipakai di sekolah ini.`,
        );
      }
      throw err;
    }
  }

  async update(user: RequestUser, id: string, dto: UpdateGuruDto) {
    await this.findGuruOrThrow(id);
    const guru = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.nama !== undefined ? { nama: dto.nama.trim() } : {}),
        ...(dto.kelas !== undefined ? { kelas: dto.kelas } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: GURU_SELECT,
    });
    await catatAudit(this.prisma, user, 'update_guru', 'users', id, {
      username: guru.username,
      nama: guru.nama,
      kelas: guru.kelas,
      isActive: guru.isActive,
    });
    return guru;
  }

  async resetPassword(user: RequestUser, id: string, dto: ResetPasswordDto) {
    const guru = await this.findGuruOrThrow(id);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await argon2.hash(dto.password) },
    });
    await catatAudit(this.prisma, user, 'reset_password_guru', 'users', id, {
      username: guru.username,
    });
    return { id, username: guru.username, message: 'Password berhasil direset.' };
  }

  // Hapus lunak: akun dinonaktifkan, baris tetap ada untuk jejak audit.
  async remove(user: RequestUser, id: string) {
    const guru = await this.findGuruOrThrow(id);
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    await catatAudit(this.prisma, user, 'nonaktif_guru', 'users', id, {
      username: guru.username,
    });
    return { id, username: guru.username, isActive: false };
  }
}
