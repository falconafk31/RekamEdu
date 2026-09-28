import { Role } from '@prisma/client';

// Bentuk request.user yang dihasilkan JwtStrategy (lihat jwt.strategy.ts):
// { userId, username, role, tenantId }.
export interface RequestUser {
  userId: string;
  username: string;
  role: Role;
  tenantId: string | null;
}
