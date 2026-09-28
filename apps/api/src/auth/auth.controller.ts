import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, REFRESH_COOKIE_NAME } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

// Masa berlaku cookie refresh token: 7 hari (sinkron dengan JWT refresh).
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Endpoint auth (dengan global prefix menjadi /api/auth/*):
// - POST /api/auth/login   : kodeSekolah + username + password → access token.
// - POST /api/auth/refresh : refresh token dari cookie → access token baru.
// - POST /api/auth/logout  : hapus cookie refresh token.
// - GET  /api/auth/me      : profil user dari access token (Tahap 1).
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  // Profil user pemilik access token — dipakai frontend untuk hydrate sesi
  // (nama & kelas tidak ada di payload JWT).
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const jwtUser = req.user as
      | { userId: string; username: string; role: string; tenantId: string | null }
      | undefined;
    const user = await this.prisma.user.findFirst({
      where: { id: jwtUser?.userId ?? '' },
      select: {
        id: true,
        username: true,
        nama: true,
        role: true,
        kelas: true,
        tenantId: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive) {
      return { user: null };
    }
    const { isActive: _nonaktif, ...profil } = user;
    return { user: profil };
  }

  // Refresh token hanya dikirim lewat cookie httpOnly — tidak pernah di body.
  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      path: '/api/auth',
      // secure: true, // aktifkan saat sudah HTTPS di produksi
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    // Refresh token TIDAK dikembalikan di body — hanya lewat cookie httpOnly.
    const { refreshToken: _tidakDikirim, ...body } = result;
    return body;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE_NAME]);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _tidakDikirim, ...body } = result;
    return body;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return { message: 'Berhasil keluar.' };
  }
}
