import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, REFRESH_COOKIE_NAME } from './auth.service';
import { LoginDto } from './dto/login.dto';

// Masa berlaku cookie refresh token: 7 hari (sinkron dengan JWT refresh).
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Endpoint auth (dengan global prefix menjadi /api/auth/*):
// - POST /api/auth/login   : kodeSekolah + username + password → access token.
// - POST /api/auth/refresh : refresh token dari cookie → access token baru.
// - POST /api/auth/logout  : hapus cookie refresh token.
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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
