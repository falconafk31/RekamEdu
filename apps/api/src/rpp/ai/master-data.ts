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
  /**
   * Pengganti P5/P5-PPRA (dihapus per Permendikdasmen 10/2025):
   * 8 Dimensi Profil Lulusan.
   */
  labelProfilLulusan: string;
  dimensiProfilLulusan: string[];
  /** Pendekatan pembelajaran yang didorong regulasi terbaru. */
  pendekatanPembelajaran: string;
  /** Instruksi operasional untuk disuntik ke system prompt AI. */
  deskripsiIntegrasiProfil: string;
  /** Kekhasan tambahan per naungan (mis. moderasi beragama untuk madrasah). */
  kekhasanTambahan?: string;
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
// 8 Dimensi Profil Lulusan — pengganti P5/Profil Pelajar Pancasila per
// Permendikdasmen No. 10 Tahun 2025 (mencabut Permendikbudristek 5/2022).
// ---------------------------------------------------------------------------
const DIMENSI_PROFIL_LULUSAN: string[] = [
  'Keimanan dan ketakwaan kepada Tuhan Yang Maha Esa',
  'Kewargaan',
  'Penalaran kritis',
  'Kreativitas',
  'Kolaborasi',
  'Kemandirian',
  'Kesehatan',
  'Komunikasi',
];

const PENDEKATAN_PEMBELAJARAN_MENDALAM =
  'Pembelajaran Mendalam (berkesadaran, bermakna, menggembirakan)';

const INTEGRASI_PROFIL_UMUM =
  'Integrasikan 8 Dimensi Profil Lulusan ke dalam RPP (bukan sebagai dokumen ' +
  'terpisah seperti P5 dulu): cantumkan dimensi yang menjadi target pada tiap ' +
  'komponen — tujuan pembelajaran memuat ranah afektif/psikomotorik yang ' +
  'merangkum dimensi relevan (mis. [Kolaborasi] pada kerja kelompok, ' +
  '[Penalaran kritis] pada analisis), dan rubrik asesmen menilai sikap serta ' +
  'keterampilan sosial selain penguasaan materi. Terapkan pendekatan ' +
  'Pembelajaran Mendalam: berkesadaran (murid memahami tujuan dan proses ' +
  'belajarnya), bermakna (materi dikaitkan dengan kehidupan nyata), dan ' +
  'menggembirakan (suasana belajar positif dan memotivasi). Bila relevan, ' +
  'sarankan kegiatan kokurikuler (pembelajaran kolaboratif lintas disiplin ' +
  'ilmu dan/atau Gerakan 7 Kebiasaan Anak Indonesia Hebat) sebagai penguat.';

// ---------------------------------------------------------------------------
// Mapel baru: Koding dan Kecerdasan Artifisial (KKA) — mapel pilihan mulai
// kelas 4 SD tahun ajaran 2025/2026 (diarahkan menjadi wajib).
// ---------------------------------------------------------------------------
const MAPEL_KKA = 'Koding dan Kecerdasan Artifisial (Pilihan)';

export function adalahMapelKKA(mapel: string): boolean {
  const rapi = mapel.trim().toLowerCase();
  return (
    rapi === MAPEL_KKA.toLowerCase() ||
    rapi === 'koding dan kecerdasan artifisial' ||
    rapi === 'koding dan kecerdasan artifisial (kka)'
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
    labelProfilLulusan: '8 Dimensi Profil Lulusan',
    dimensiProfilLulusan: DIMENSI_PROFIL_LULUSAN,
    pendekatanPembelajaran: PENDEKATAN_PEMBELAJARAN_MENDALAM,
    deskripsiIntegrasiProfil: INTEGRASI_PROFIL_UMUM,
    regulasi: [
      {
        nomor: 'Permendikdasmen No. 10 Tahun 2025',
        tentang:
          'Standar Kompetensi Lulusan — 8 Dimensi Profil Lulusan ' +
          '(menggantikan P5; mencabut Permendikbudristek 5/2022)',
      },
      {
        nomor: 'Permendikdasmen No. 13 Tahun 2025',
        tentang:
          'Struktur Kurikulum — kokurikuler (pembelajaran kolaboratif lintas ' +
          'disiplin ilmu, Gerakan 7 Kebiasaan Anak Indonesia Hebat) dan ' +
          'pendekatan Pembelajaran Mendalam (perubahan atas ' +
          'Permendikbudristek 12/2024)',
      },
      {
        nomor: 'Kepmendikbudristek No. 008/M/2022 jo. 262/M/2022',
        tentang:
          'Capaian Pembelajaran (CP) Pendidikan Anak Usia Dini, ' +
          'Pendidikan Dasar, dan Pendidikan Menengah',
      },
    ],
    jenjang: [
      { kode: 'SD', nama: 'Sekolah Dasar', kelas: KELAS_DASAR, mapel: [...MAPEL_SD, MAPEL_KKA] },
      {
        kode: 'SMP',
        nama: 'Sekolah Menengah Pertama',
        kelas: KELAS_MENENGAH_PERTAMA,
        mapel: [...MAPEL_SMP, MAPEL_KKA],
      },
      {
        kode: 'SMA',
        nama: 'Sekolah Menengah Atas',
        kelas: KELAS_MENENGAH_ATAS,
        mapel: [...MAPEL_SMA_DASAR, ...MAPEL_PEMINATAN_SAINTEK, ...MAPEL_PEMINATAN_SOSHUM, MAPEL_KKA],
      },
      {
        kode: 'SMK',
        nama: 'Sekolah Menengah Kejuruan',
        kelas: KELAS_MENENGAH_ATAS,
        mapel: [...MAPEL_SMK_NORMATIF_ADAPTIF, MAPEL_KKA],
      },
    ],
  },
  {
    kode: 'kemenag',
    label: 'Kemenag (Madrasah)',
    kurikulum: 'Kurikulum Merdeka',
    labelProfilLulusan: '8 Dimensi Profil Lulusan',
    dimensiProfilLulusan: DIMENSI_PROFIL_LULUSAN,
    pendekatanPembelajaran: PENDEKATAN_PEMBELAJARAN_MENDALAM,
    deskripsiIntegrasiProfil: INTEGRASI_PROFIL_UMUM,
    kekhasanTambahan:
      'Kekhasan madrasah: P5-PPRA sudah gugur mengikuti SKL nasional, tetapi ' +
      'tetap kuatkan nilai moderasi beragama (berkeadaban, keteladanan, ' +
      'kewarganegaraan dan kebangsaan, mengambil jalan tengah, berimbang, ' +
      'lurus dan tegas, kesetaraan, musyawarah, toleransi, dinamis dan ' +
      'inovatif) sebagai latar moral dalam setiap aktivitas pembelajaran. ' +
      'Hindari muatan sekuler murni; selaraskan dengan identitas keagamaan ' +
      'madrasah (MI/MTs/MA).',
    regulasi: [
      {
        nomor: 'Permendikdasmen No. 10 Tahun 2025',
        tentang:
          'Standar Kompetensi Lulusan — 8 Dimensi Profil Lulusan ' +
          '(berlaku nasional, termasuk madrasah; menggantikan P5/P5-PPRA)',
      },
      {
        nomor: 'Permendikdasmen No. 13 Tahun 2025',
        tentang:
          'Struktur Kurikulum — kokurikuler dan pendekatan Pembelajaran ' +
          'Mendalam (perubahan atas Permendikbudristek 12/2024)',
      },
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
        tentang: 'Pedoman Implementasi Kurikulum Merdeka pada Madrasah',
      },
    ],
    jenjang: [
      {
        kode: 'MI',
        nama: 'Madrasah Ibtidaiyah',
        kelas: KELAS_DASAR,
        mapel: [...MAPEL_MI, MAPEL_KKA],
      },
      {
        kode: 'MTs',
        nama: 'Madrasah Tsanawiyah',
        kelas: KELAS_MENENGAH_PERTAMA,
        mapel: [...MAPEL_MTS, MAPEL_KKA],
      },
      {
        kode: 'MA',
        nama: 'Madrasah Aliyah',
        kelas: KELAS_MENENGAH_ATAS,
        mapel: [...MAPEL_MA_DASAR, ...MAPEL_PEMINATAN_SAINTEK, ...MAPEL_PEMINATAN_SOSHUM, ...MAPEL_PEMINATAN_KEAGAMAAN, MAPEL_KKA],
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
