import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { TenantContextInterceptor } from './common/tenant/tenant-context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Semua endpoint berada di bawah prefix /api (mis. POST /api/auth/login).
  app.setGlobalPrefix('api');

  // Dibutuhkan untuk membaca cookie httpOnly 'refresh_token' pada /api/auth/refresh.
  app.use(cookieParser());

  // Validasi DTO global: buang properti tak dikenal & konversi tipe otomatis.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Menyimpan tenantId dari JWT ke AsyncLocalStorage selama request berlangsung,
  // agar Prisma tenant middleware dapat mengisolasi query per tenant.
  app.useGlobalInterceptors(new TenantContextInterceptor());

  // APP_PORT dari env, default 3000 bila tidak diisi.
  const port = parseInt(process.env.APP_PORT ?? '3000', 10);
  await app.listen(port);
  console.log(`[RekamEdu API] berjalan di http://localhost:${port}/api`);
}

void bootstrap();
