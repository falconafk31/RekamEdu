// ============================================================================
// Master data naungan → jenjang → mata pelajaran untuk Modul 3 (RPP + AI).
//
// Sumber kebenaran tunggal (single source of truth):
// - backend memakainya untuk memvalidasi parameter generate,
// - frontend mengambilnya lewat GET /api/rpp/ai/master-data untuk membangun
//   dropdown berjenjang (naungan → jenjang → mapel).
// - builder prompt (rpp-prompt.ts) memakainya untuk menyuntik regulasi,
//   kekhasan madrasah, dan pemetaan fase Kurikulum Merdeka.
//
// Perubahan daftar mapel/regulasi cukup dilakukan DI FILE INI, bukan di
// komponen frontend maupun di string prompt yang tersebar.
// ============================================================================

export type KodeNaungan = 'kemendikdasmen' | 'kemenag';

export interface ReferensiRegulasi {
  nomor: string;
  tentang: string;
}

export interface JenjangInfo {
  /** Kode jenjang, mis. 'SD', 'MI'. */
  kode: string;
  /** Nama lengkap, mis. 'Sekolah Dasar'. */
  nama: string;
  /** Daftar kelas yang valid, mis. ['1', '2', ...] atau ['VII', 'VIII', 'IX']. */
  kelas: string[];
  /** Daftar mata pelajaran untuk jenjang ini. */
  mapel: string[];
}

export interface NaunganInfo {
  kode: KodeNaungan;
  /** Label tampilan, mis. 'Kemendikdasmen (Sekolah Umum)'. */
  label: string;
  /** Kurikulum aktif yang dipakai template prompt. */
  kurikulum: string;
  /** Label projek penguatan profil pelajar sesuai naungan. */
  labelProjekProfil: string;
  /** Penjelasan singkat projek profil untuk disuntik ke prompt. */
  deskripsiProjekProfil: string;
  /** Regulasi acuan yang disuntik ke prompt sesuai naungan. */
  regulasi: ReferensiRegulasi[];
  jenjang: JenjangInfo[];
}

// ---------------------------------------------------------------------------
// Mapel Kemenag (madrasah) — mengacu KMA 183/2019: Al-Qur'an Hadits,
// Akidah Akhlak, Fikih, Sejarah Kebudayaan Islam (SKI), dan Bahasa Arab.
// ---------------------------------------------------------------------------
const MAPEL_AGAMA_MADRASAH: string[] = [
  "Al-Qur'an Hadits",
  'Akidah Akhlak',
  'Fikih',
  'Sejarah Kebudayaan Islam (SKI)',
  'Bahasa Arab',
];

export function adalahMapelAgamaMadrasah(mapel: string): boolean {
  return MAPEL_AGAMA_MADRASAH.some(
    (m) => m.toLowerCase() === mapel.trim().toLowerCase(),
  );
}

// ---------------------------------------------------------------------------
// Mapel umum per jenjang (Kurikulum Merdeka).
// ---------------------------------------------------------------------------
const MAPEL_SD: string[] = [
  'Pendidikan Agama dan Budi Pekerti',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
  'PJOK',
  'Seni (Musik/Rupa/Tari/Teater)',
  'Bahasa Inggris',
  'Muatan Lokal',
];

const MAPEL_MI: string[] = [
  ...MAPEL_AGAMA_MADRASAH,
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
  'PJOK',
  'Seni (Musik/Rupa/Tari/Teater)',
  'Bahasa Inggris',
  'Muatan Lokal',
];

const MAPEL_SMP: string[] = [
  'Pendidikan Agama dan Budi Pekerti',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'IPA',
  'IPS',
  'Bahasa Inggris',
  'Informatika',
  'PJOK',
  'Seni (Musik/Rupa/Tari/Teater)',
  'Prakarya',
  'Muatan Lokal',
];

const MAPEL_MTS: string[] = [
  ...MAPEL_AGAMA_MADRASAH,
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'IPA',
  'IPS',
  'Bahasa Inggris',
  'Informatika',
  'PJOK',
  'Seni (Musik/Rupa/Tari/Teater)',
  'Prakarya',
  'Muatan Lokal',
];

const MAPEL_SMA_DASAR: string[] = [
  'Pendidikan Agama dan Budi Pekerti',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Bahasa Inggris',
  'Sejarah',
  'PJOK',
  'Seni (Musik/Rupa/Tari/Teater)',
  'Muatan Lokal',
];

const MAPEL_MA_DASAR: string[] = [
  ...MAPEL_AGAMA_MADRASAH,
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Bahasa Inggris',
  'Sejarah',
  'PJOK',
  'Seni (Musik/Rupa/Tari/Teater)',
  'Muatan Lokal',
];

const MAPEL_PEMINATAN_SAINTEK: string[] = [
  'Fisika (Peminatan)',
  'Kimia (Peminatan)',
  'Biologi (Peminatan)',
  'Informatika (Peminatan)',
];

const MAPEL_PEMINATAN_SOSHUM: string[] = [
  'Sosiologi (Peminatan)',
  'Ekonomi (Peminatan)',
  'Geografi (Peminatan)',
  'Antropologi (Peminatan)',
  'Bahasa dan Sastra Indonesia (Peminatan)',
  'Bahasa dan Sastra Inggris (Peminatan)',
];

const MAPEL_PEMINATAN_KEAGAMAAN: string[] = [
  'Ilmu Tafsir (Peminatan Keagamaan)',
  'Ilmu Hadits (Peminatan Keagamaan)',
  'Usul Fikih (Peminatan Keagamaan)',
  'Ilmu Kalam (Peminatan Keagamaan)',
  'Bahasa Arab (Peminatan Keagamaan)',
];

const MAPEL_SMK_NORMATIF_ADAPTIF: string[] = [
  'Pendidikan Agama dan Budi Pekerti',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Bahasa Inggris',
  'Sejarah Indonesia',
  'Informatika',
  'PJOK',
  'Muatan Lokal',
  'Produktif (sesuai konsentrasi keahlian)',
];

const KELAS_DASAR: string[] = ['1', '2', '3', '4', '5', '6'];
const KELAS_MENENGAH_PERTAMA: string[] = ['VII', 'VIII', 'IX'];
const KELAS_MENENGAH_ATAS: string[] = ['X', 'XI', 'XII'];

// ---------------------------------------------------------------------------
// Daftar naungan.
// ---------------------------------------------------------------------------
export const DAFTAR_NAUNGAN: NaunganInfo[] = [
  {
    kode: 'kemendikdasmen',
    label: 'Kemendikdasmen (Sekolah Umum)',
    kurikulum: 'Kurikulum Merdeka',
    labelProjekProfil: 'P5',
    deskripsiProjekProfil:
      'Projek Penguatan Profil Pelajar Pancasila (P5): pembelajaran berbasis ' +
      'projek lintas disiplin yang menguatkan enam dimensi profil pelajar ' +
      'Pancasila (beriman dan bertakwa kepada Tuhan YME serta berakhlak mulia, ' +
      'berkebinekaan global, bergotong royong, mandiri, bernalar kritis, dan ' +
      'kreatif).',
    regulasi: [
      {
        nomor: 'Permendikbudristek No. 12 Tahun 2024',
        tentang:
          'Kurikulum pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, ' +
          'dan Jenjang Pendidikan Menengah',
      },
      {
        nomor: 'Kepmendikbudristek No. 008/M/2022 jo. 262/M/2022',
        tentang: 'Capaian Pembelajaran (CP) Pendidikan Anak Usia Dini, ' +
          'Pendidikan Dasar, dan Pendidikan Menengah',
      },
      {
        nomor: 'Kepmendikbudristek No. 009/M/2022',
        tentang:
          'Dimensi, Elemen, dan Subelemen Profil Pelajar Pancasila pada ' +
          'Kurikulum Merdeka',
      },
    ],
    jenjang: [
      { kode: 'SD', nama: 'Sekolah Dasar', kelas: KELAS_DASAR, mapel: MAPEL_SD },
      {
        kode: 'SMP',
        nama: 'Sekolah Menengah Pertama',
        kelas: KELAS_MENENGAH_PERTAMA,
        mapel: MAPEL_SMP,
      },
      {
        kode: 'SMA',
        nama: 'Sekolah Menengah Atas',
        kelas: KELAS_MENENGAH_ATAS,
        mapel: [...MAPEL_SMA_DASAR, ...MAPEL_PEMINATAN_SAINTEK, ...MAPEL_PEMINATAN_SOSHUM],
      },
      {
        kode: 'SMK',
        nama: 'Sekolah Menengah Kejuruan',
        kelas: KELAS_MENENGAH_ATAS,
        mapel: MAPEL_SMK_NORMATIF_ADAPTIF,
      },
    ],
  },
  {
    kode: 'kemenag',
    label: 'Kemenag (Madrasah)',
    kurikulum: 'Kurikulum Merdeka',
    labelProjekProfil: 'P5-PPRA',
    deskripsiProjekProfil:
      "Projek Penguatan Profil Pelajar Pancasila dan Profil Pelajar Rahmatan " +
      "lil 'Alamin (P5-PPRA): pembelajaran berbasis projek yang menguatkan " +
      "profil pelajar Pancasila sekaligus nilai moderasi beragama " +
      "(berkeadaban, keteladanan, kewarganegaraan dan kebangsaan, mengambil " +
      'jalan tengah, berimbang, lurus dan tegas, kesetaraan, musyawarah, ' +
      'toleransi, dinamis dan inovatif).',
    regulasi: [
      {
        nomor: 'KMA 183 Tahun 2019',
        tentang:
          'Kurikulum Pendidikan Agama Islam dan Bahasa Arab pada Madrasah ' +
          "(Al-Qur'an Hadits, Akidah Akhlak, Fikih, SKI, Bahasa Arab)",
      },
      {
        nomor: 'KMA 184 Tahun 2019',
        tentang: 'Pedoman Implementasi Kurikulum pada Madrasah',
      },
      {
        nomor: 'KMA 185 Tahun 2019',
        tentang: 'Rangkaian regulasi implementasi kurikulum madrasah',
      },
      {
        nomor: 'KMA 347 Tahun 2022 jo. KMA 450 Tahun 2024',
        tentang:
          'Pedoman Implementasi Kurikulum Merdeka pada Madrasah ' +
          '(termasuk P5-PPRA)',
      },
    ],
    jenjang: [
      {
        kode: 'MI',
        nama: 'Madrasah Ibtidaiyah',
        kelas: KELAS_DASAR,
        mapel: MAPEL_MI,
      },
      {
        kode: 'MTs',
        nama: 'Madrasah Tsanawiyah',
        kelas: KELAS_MENENGAH_PERTAMA,
        mapel: MAPEL_MTS,
      },
      {
        kode: 'MA',
        nama: 'Madrasah Aliyah',
        kelas: KELAS_MENENGAH_ATAS,
        mapel: [...MAPEL_MA_DASAR, ...MAPEL_PEMINATAN_SAINTEK, ...MAPEL_PEMINATAN_SOSHUM, ...MAPEL_PEMINATAN_KEAGAMAAN],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Fungsi bantu pencarian & validasi.
// ---------------------------------------------------------------------------

export function cariNaungan(kode: string): NaunganInfo | undefined {
  return DAFTAR_NAUNGAN.find((n) => n.kode === kode.trim().toLowerCase());
}

export function cariJenjang(
  naungan: NaunganInfo,
  kodeJenjang: string,
): JenjangInfo | undefined {
  return naungan.jenjang.find(
    (j) => j.kode.toLowerCase() === kodeJenjang.trim().toLowerCase(),
  );
}

/**
 * Validasi kombinasi naungan → jenjang → kelas → mapel.
 * Mengembalikan daftar pesan galat (kosong bila valid).
 */
export function validasiKonteksRpp(
  naunganKode: string,
  jenjangKode: string,
  kelas: string,
  mapel: string,
): string[] {
  const galat: string[] = [];
  const naungan = cariNaungan(naunganKode);
  if (!naungan) {
    galat.push(
      `Naungan "${naunganKode}" tidak dikenal. Pilih: ${DAFTAR_NAUNGAN.map((n) => n.kode).join(', ')}.`,
    );
    return galat;
  }
  const jenjang = cariJenjang(naungan, jenjangKode);
  if (!jenjang) {
    galat.push(
      `Jenjang "${jenjangKode}" tidak tersedia untuk naungan ${naungan.label}. ` +
        `Pilihan: ${naungan.jenjang.map((j) => j.kode).join(', ')}.`,
    );
    return galat;
  }
  const kelasRapi = kelas.trim();
  if (
    !jenjang.kelas.some((k) => k.toLowerCase() === kelasRapi.toLowerCase())
  ) {
    galat.push(
      `Kelas "${kelas}" tidak valid untuk ${jenjang.kode}. ` +
        `Pilihan: ${jenjang.kelas.join(', ')}.`,
    );
  }
  if (
    !jenjang.mapel.some(
      (m) => m.toLowerCase() === mapel.trim().toLowerCase(),
    )
  ) {
    galat.push(
      `Mata pelajaran "${mapel}" tidak terdaftar untuk ${jenjang.kode} ` +
        `(${naungan.label}).`,
    );
  }
  return galat;
}

/**
 * Pemetaan fase Kurikulum Merdeka dari jenjang + kelas.
 * SD/MI: 1-2 → A, 3-4 → B, 5-6 → C. SMP/MTs: VII-IX → D.
 * SMA/SMK/MA: X → E, XI-XII → F.
 */
export function faseUntuk(
  kodeJenjang: string,
  kelas: string,
): string | undefined {
  const kode = kodeJenjang.trim().toUpperCase();
  const k = kelas.trim().toUpperCase();
  if (kode === 'SD' || kode === 'MI') {
    if (['1', '2'].includes(k)) return 'A';
    if (['3', '4'].includes(k)) return 'B';
    if (['5', '6'].includes(k)) return 'C';
    return undefined;
  }
  if (kode === 'SMP' || kode === 'MTS') return 'D';
  if (kode === 'SMA' || kode === 'SMK' || kode === 'MA') {
    if (k === 'X') return 'E';
    if (['XI', 'XII'].includes(k)) return 'F';
    return undefined;
  }
  return undefined;
}

/** Salinan aman master data untuk dikirim ke frontend (tanpa fungsi). */
export function masterDataUntukKlien(): NaunganInfo[] {
  return JSON.parse(JSON.stringify(DAFTAR_NAUNGAN)) as NaunganInfo[];
}
