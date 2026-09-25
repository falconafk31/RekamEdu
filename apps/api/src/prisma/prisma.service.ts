import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantPrismaMiddleware } from '../common/prisma/tenant.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
    // Terapkan isolasi tenant ke semua query pada model yang punya kolom tenantId.
    // Middleware dilewati otomatis bila tidak ada konteks tenant
    // (mis. proses seed, job internal, atau request Owner).
    this.$use(tenantPrismaMiddleware());
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
