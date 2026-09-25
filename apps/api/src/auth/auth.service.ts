import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

// Masa berlaku token: access 15 menit, refresh 7 hari.
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

// Nama cookie httpOnly untuk refresh token (diatur di AuthController).
export const REFRESH_COOKIE_NAME = 'refresh_token';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Login: kodeSekolah → tenant → user (tenantId + username) → verifikasi argon2.
  async login(dto: LoginDto) {
    // 1. Cari tenant berdasarkan kode sekolah.
    const tenant = await this.prisma.tenant.findUnique({
      where: { kodeSekolah: dto.kodeSekolah },
    });
    if (!tenant) {
      // Pesan generik agar tidak membocorkan tenant mana yang terdaftar.
      throw new UnauthorizedException('Kredensial tidak valid.');
    }

    // 2. Cari user di dalam tenant tersebut.
    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, username: dto.username },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kredensial tidak valid.');
    }

    // 3. Verifikasi password argon2id.
    let cocok = false;
    try {
      cocok = await argon2.verify(user.passwordHash, dto.password);
    } catch {
      cocok = false;
    }
    if (!cocok) {
      throw new UnauthorizedException('Kredensial tidak valid.');
    }

    // 4. Terbitkan pasangan token.
    const tokens = this.issueTokenPair(
      user.id,
      tenant.id,
      user.role,
      user.username,
    );
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: tenant.id,
      },
    };
  }

  // Refresh: baca refresh token (dari cookie), verifikasi, lalu rotasi
  // (terbitkan pasangan token baru).
  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token tidak ditemukan.');
    }

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau sudah kedaluwarsa.',
      );
    }

    // Pastikan akun masih aktif sebelum menerbitkan token baru.
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Akun tidak aktif.');
    }

    const tokens = this.issueTokenPair(
      user.id,
      user.tenantId,
      user.role,
      user.username,
    );
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  // Menerbitkan access token (15 menit) + refresh token (7 hari).
  // Payload: sub=userId, tenantId (null untuk Owner), role, username.
  private issueTokenPair(
    userId: string,
    tenantId: string | null,
    role: string,
    username: string,
  ) {
    const payload = { sub: userId, tenantId, role, username };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_TTL,
    });
    return { accessToken, refreshToken };
  }
}
