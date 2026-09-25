import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard autentikasi JWT: memvalidasi Bearer token lewat JwtStrategy.
// Hasil validate() strategi menjadi `request.user`:
// { userId, username, role, tenantId }.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
