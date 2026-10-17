// Penomoran otomatis surat masuk/keluar.
// Format: "007/SMK-RE/K/III/2026"  →
// urut(3 digit)/kodeSekolah/jenis(M=masuk,K=keluar)/bulan romawi/tahun.
export function romawi(bulan: number): string {
  const tabel = [
    'I',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VII',
    'VIII',
    'IX',
    'X',
    'XI',
    'XII',
  ];
  if (bulan < 1 || bulan > 12) {
    throw new Error(`Bulan tidak valid untuk angka romawi: ${bulan}`);
  }
  return tabel[bulan - 1];
}

export function formatNomorSurat(args: {
  urut: number;
  kodeSekolah: string;
  jenis: 'MASUK' | 'KELUAR';
  tanggal: Date;
}): string {
  const urut = String(args.urut).padStart(3, '0');
  const kode = args.kodeSekolah.trim() || 'SKL';
  const jenisHuruf = args.jenis === 'MASUK' ? 'M' : 'K';
  const bulan = romawi(args.tanggal.getUTCMonth() + 1);
  const tahun = args.tanggal.getUTCFullYear();
  return `${urut}/${kode}/${jenisHuruf}/${bulan}/${tahun}`;
}
