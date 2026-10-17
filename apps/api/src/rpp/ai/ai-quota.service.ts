import { ForbiddenException, Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Kuota token AI harian per tenant, berdasarkan paket:
// trial = 50.000, pro = 500.000, custom = tanpa batas.
// Penyimpanan: Redis bila tersedia (key harian), fallback Map in-memory.
// ioredis di-require dinamis di dalam try/catch — TIDAK ditambahkan ke
// package.json, jadi tsc tidak boleh menganggap package ini ada.
const KUOTA_HARIAN: Record<Plan, number> = {
  [Plan.trial]: 50_000,
  [Plan.pro]: 500_000,
  [Plan.custom]: Number.POSITIVE_INFINITY,
};

const memStore = new Map<string, number>();

let redisClient: any = null;
let redisTried = false;

function getRedis(): any {
  if (redisTried) return redisClient;
  redisTried = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    // Error koneksi diabaikan: setiap operasi dibungkus try/catch dan
    // jatuh ke Map in-memory.
    redisClient.on('error', (): void => undefined);
  } catch {
    redisClient = null; // ioredis tidak terpasang -> pakai memori
  }
  return redisClient;
}

function quotaKey(tenantId: string): string {
  const hari = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `rekamedu:aiquota:${tenantId}:${hari}`;
}

// Detik hingga tengah malam (WIB) agar key harian kedaluwarsa otomatis.
function detikHinggaTengahMalam(): number {
  const sekarang = new Date();
  const wib = new Date(
    sekarang.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }),
  );
  const tengahMalam = new Date(wib);
  tengahMalam.setHours(24, 0, 0, 0);
  return Math.max(60, Math.ceil((tengahMalam.getTime() - wib.getTime()) / 1000));
}

@Injectable()
export class AiQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  // Paket tenant dari tabel Subscription; default 'trial' bila belum ada.
  async planForTenant(tenantId: string): Promise<Plan> {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    return sub?.plan ?? Plan.trial;
  }

  // Cek kuota sebelum generate. Melempar ForbiddenException bila habis.
  async checkAndReserve(tenantId: string, plan: Plan): Promise<void> {
    const batas = KUOTA_HARIAN[plan];
    if (!Number.isFinite(batas)) return; // custom: tanpa batas
    const terpakai = await this.pemakaianHariIni(tenantId);
    if (terpakai >= batas) {
      throw new ForbiddenException(
        'Kuota AI harian sekolah habis. Coba lagi besok atau hubungi admin.',
      );
    }
  }

  // Catat token setelah generate selesai (input + output diakumulasi).
  async recordUsage(
    tenantId: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<void> {
    const total =
      Math.max(0, Math.floor(inputTokens)) + Math.max(0, Math.floor(outputTokens));
    if (total <= 0) return;
    const key = quotaKey(tenantId);
    const redis = getRedis();
    if (redis) {
      try {
        await redis.incrby(key, total);
        await redis.expire(key, detikHinggaTengahMalam());
        return;
      } catch {
        // jatuh ke memori
      }
    }
    memStore.set(key, (memStore.get(key) ?? 0) + total);
  }

  private async pemakaianHariIni(tenantId: string): Promise<number> {
    const key = quotaKey(tenantId);
    const redis = getRedis();
    if (redis) {
      try {
        const nilai = await redis.get(key);
        if (nilai !== null && nilai !== undefined) {
          const n = Number(nilai);
          if (Number.isFinite(n) && n >= 0) return n;
        }
        return 0;
      } catch {
        // jatuh ke memori
      }
    }
    return memStore.get(key) ?? 0;
  }
}
