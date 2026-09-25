import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Bentuk payload JWT RekamEdu.
export interface JwtPayload {
  sub: string; // userId
  username: string;
  role: string; // nilai enum Role
  tenantId: string | null; // null untuk Owner platform
}

// Strategi JWT: mengekstrak Bearer token dari header Authorization,
// memverifikasi dengan JWT_ACCESS_SECRET.
// Hasil validate() menjadi `request.user` di seluruh aplikasi.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token tidak valid.');
    }
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      tenantId: payload.tenantId ?? null,
    };
  }
}
