import type { Request } from 'express';
import { RequestUser } from './request-user';

// Request terautentikasi: JwtAuthGuard menjamin req.user terisi.
export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
