import { BadRequestException } from '@nestjs/common';

// Kolom @db.Date di Prisma: selalu bangun Date dari string YYYY-MM-DD
// sebagai tengah malam UTC agar tidak bergeser zona waktu.
export function parseTanggalISO(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(
      `Format tanggal tidak valid: "${value}". Gunakan YYYY-MM-DD.`,
    );
  }
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Tanggal tidak valid: "${value}".`);
  }
  return d;
}

// Date (hasil kolom @db.Date) → "YYYY-MM-DD".
export function formatTanggalISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Hari ini sebagai string YYYY-MM-DD (UTC).
export function hariIniISO(): string {
  return new Date().toISOString().slice(0, 10);
}
