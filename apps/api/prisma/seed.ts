// ============================================================================
// Seed Tahap 0 — idempotent (aman dijalankan berulang kali).
// Membuat: 1 Owner platform, 1 tenant demo ("DEMO") + subscription trial 14 hari
//          + 1 admin tenant demo.
// Jalankan: npm run prisma:seed   (DATABASE_URL harus valid & migrasi sudah jalan)
// Catatan: seed memakai PrismaClient mentah (tanpa tenant middleware) karena
//          berjalan di luar konteks request HTTP.
// ============================================================================

import { Plan, PrismaClient, Role, SubscriptionStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // --- 1. Owner platform (tenantId = null) ---
  const ownerUsername = process.env.SEED_OWNER_USERNAME ?? 'owner';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? '';

  if (!ownerPassword) {
    console.warn(
      '[seed] PERINGATAN: SEED_OWNER_PASSWORD kosong — pembuatan akun Owner DILEWATI.',
    );
  } else {
    const existingOwner = await prisma.user.findFirst({
      where: { tenantId: null, username: ownerUsername },
    });
    if (existingOwner) {
      console.log(`[seed] Owner "${ownerUsername}" sudah ada — dilewati.`);
    } else {
      await prisma.user.create({
        data: {
          tenantId: null, // Owner adalah entitas platform, bukan bagian tenant.
          username: ownerUsername,
          passwordHash: await argon2.hash(ownerPassword),
          role: Role.OWNER,
        },
      });
      console.log(`[seed] Owner "${ownerUsername}" berhasil dibuat.`);
    }
  }

  // --- 2. Tenant demo ---
  const tenant = await prisma.tenant.upsert({
    where: { kodeSekolah: 'DEMO' },
    update: { nama: 'Sekolah Demo' },
    create: {
      kodeSekolah: 'DEMO',
      nama: 'Sekolah Demo',
    },
  });
  console.log(`[seed] Tenant demo "DEMO" siap (id=${tenant.id}).`);

  // --- 3. Subscription trial 14 hari untuk tenant demo ---
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: { plan: Plan.trial, status: SubscriptionStatus.active, expiresAt },
    create: {
      tenantId: tenant.id,
      plan: Plan.trial,
      status: SubscriptionStatus.active,
      expiresAt,
    },
  });
  console.log('[seed] Subscription tenant DEMO: paket trial, status active, 14 hari.');

  // --- 4. Admin tenant demo ---
  const adminPassword = process.env.SEED_DEMO_ADMIN_PASSWORD ?? '';
  if (!adminPassword) {
    console.warn(
      '[seed] PERINGATAN: SEED_DEMO_ADMIN_PASSWORD kosong — pembuatan admin demo DILEWATI.',
    );
  } else {
    await prisma.user.upsert({
      where: { tenantId_username: { tenantId: tenant.id, username: 'admin' } },
      update: {},
      create: {
        tenantId: tenant.id,
        username: 'admin',
        passwordHash: await argon2.hash(adminPassword),
        role: Role.ADMIN,
      },
    });
    console.log('[seed] Admin tenant demo (username "admin") siap.');
  }

  console.log('[seed] Selesai.');
}

main()
  .catch((e) => {
    console.error('[seed] Gagal:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
