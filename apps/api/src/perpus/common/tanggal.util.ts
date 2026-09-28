import { BadRequestException } from '@nestjs/common';

// Zona waktu bisnis aplikasi: Asia/Jakarta (WIB). Server berjalan di UTC,
// sehingga tanggal kalender "hari ini" harus dihitung eksplisit dalam WIB
// agar cocok dengan makna tanggal bagi sekolah di Indonesia.
const ZONA_WAKTU = 'Asia/Jakarta';

// Tanggal kalender "hari ini" (zona WIB) sebagai Date UTC-tengah-malam.
// Selaras dengan kolom @db.Date di Prisma yang menyimpan tanggal murni
// tanpa komponen waktu, sehingga perbandingan < / > / = antar-tanggal valid.
export function hariIni(): Date {
  const kalender = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_WAKTU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // "YYYY-MM-DD"
  return new Date(`${kalender}T00:00:00.000Z`);
}

// Menggeser tanggal sebanyak n hari kalender (n boleh negatif).
export function geserHari(tanggal: Date, n: number): Date {
  return new Date(tanggal.getTime() + n * 24 * 60 * 60 * 1000);
}

// Tanggal 1 pada bulan berjalan (zona WIB) sebagai Date UTC-tengah-malam.
export function awalBulanIni(): Date {
  const tahunBulan = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_WAKTU,
    year: 'numeric',
    month: '2-digit',
  }).format(new Date()); // "YYYY-MM"
  return new Date(`${tahunBulan}-01T00:00:00.000Z`);
}

// Pola tanggal kalender yang diterima API modul perpus: "YYYY-MM-DD".
export const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

// Mem-parse string "YYYY-MM-DD" menjadi Date UTC-tengah-malam.
// Melempar BadRequestException bila format salah atau tanggalnya fiktif
// (mis. 2026-02-30) — pemeriksaan komponen mencegah rollover diam-diam.
export function parseTanggal(value: string, namaField = 'tanggal'): Date {
  const cocok = POLA_TANGGAL.exec(value.trim());
  if (!cocok) {
    throw new BadRequestException(
      `Format ${namaField} tidak valid. Gunakan YYYY-MM-DD.`,
    );
  }
  const tahun = Number(cocok[1]);
  const bulan = Number(cocok[2]);
  const hari = Number(cocok[3]);
  const hasil = new Date(Date.UTC(tahun, bulan - 1, hari));
  if (
    hasil.getUTCFullYear() !== tahun ||
    hasil.getUTCMonth() !== bulan - 1 ||
    hasil.getUTCDate() !== hari
  ) {
    throw new BadRequestException(
      `${namaField} bukan tanggal kalender yang valid.`,
    );
  }
  return hasil;
}
