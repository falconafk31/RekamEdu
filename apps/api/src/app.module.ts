import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Konfigurasi global: membaca process.env
    // (DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
    //  ENCRYPTION_KEY, MINIO_*, APP_PORT, SEED_*).
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, // global: PrismaService tersedia di semua modul
    AuthModule,
    // Rencana berikutnya: ThrottlerModule + Redis (REDIS_URL) untuk rate limit
    // per-tenant pada endpoint auth & AI — ditambahkan saat modul terkait dibangun.
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
