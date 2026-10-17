// Template prompt penyusunan RPP / Modul Ajar (Bahasa Indonesia).
//
// Builder menyuntik konteks dari master data (master-data.ts):
// - naungan: 'kemendikdasmen' (sekolah umum) | 'kemenag' (madrasah)
// - jenjang, kelas (+ fase Kurikulum Merdeka yang dipetakan otomatis),
//   mapel, kurikulum, dan materi pokok.
// - regulasi acuan + kekhasan bercabang per naungan:
//   Kemendikdasmen → Permendikbudristek 12/2024, CP 008/M/2022 jo. 262/M/2022,
//   P5 (Kepmendikbudristek 009/M/2022);
//   Kemenag → KMA 183/184/185/2019, KMA 347/2022 jo. 450/2024,
//   P5-PPRA (Profil Pelajar Pancasila + Rahmatan lil 'Alamin), dengan kekhasan
//   kurikulum PAI & Bahasa Arab madrasah untuk mapel agama.
//
// Struktur keluaran: CP → TP → ATP, pembelajaran berdiferensiasi,
// integrasi P5/P5-PPRA, asesmen formatif & sumatif (+ KKTP).
//
// TANPA fine-tuning model — tuning dilakukan murni lewat prompt engineering
// dan data master.

import {
  KodeNaungan,
  NaunganInfo,
  adalahMapelAgamaMadrasah,
  cariNaungan,
  faseUntuk,
} from './master-data';

export interface RppPromptInput {
  naungan: KodeNaungan;
  kurikulum?: string; // default: kurikulum aktif dari master data
  jenjang: string; // mis. SD, MI, SMP
  kelas: string; // mis. "4", "VII", "X"
  mapel: string; // mata pelajaran (dari master data)
  materiPokok: string;
  modelPembelajaran?: string; // mis. Problem Based Learning
  durasiMenit?: number; // mis. 70 (2 JP)
  tujuanTambahan?: string;
}

function blokRegulasi(naungan: NaunganInfo): string {
  const daftar = naungan.regulasi
    .map((r) => `  - ${r.nomor}: ${r.tentang}`)
    .join('\n');
  return `Regulasi acuan yang dipakai (${naungan.label}):\n${daftar}`;
}

function blokKekhasanMadrasah(mapel: string): string {
  if (!adalahMapelAgamaMadrasah(mapel)) return '';
  return (
    '\nKekhasan madrasah: karena mata pelajaran ini termasuk rumpun PAI/Bahasa ' +
    'Arab madrasah, selaraskan muatan keagamaan dengan kurikulum PAI dan Bahasa ' +
    'Arab pada Madrasah (KMA 183/2019) serta penguatan moderasi beragama ' +
    "dalam kerangka Profil Pelajar Rahmatan lil 'Alamin."
  );
}

export function buildRppPrompt(input: RppPromptInput): {
  system: string;
  user: string;
} {
  const naungan = cariNaungan(input.naungan);
  if (!naungan) {
    throw new Error(`Naungan tidak dikenal: ${input.naungan}`);
  }
  const kurikulum = input.kurikulum?.trim() || naungan.kurikulum;
  const fase = faseUntuk(input.jenjang, input.kelas);
  const mapelAgamaMadrasah =
    naungan.kode === 'kemenag' && adalahMapelAgamaMadrasah(input.mapel);

  // ------------------------------------------------------------------
  // SYSTEM — peran + kerangka acuan bercabang per naungan.
  // ------------------------------------------------------------------
  const system =
    'Kamu adalah penyusun perangkat pembelajaran profesional untuk ' +
    `${kurikulum} di Indonesia (naungan ${naungan.label}). ` +
    'Tulis SELURUH jawaban dalam Bahasa Indonesia yang baku, jelas, dan siap ' +
    'pakai oleh guru di kelas. Jangan gunakan istilah asing yang tidak perlu. ' +
    'Format jawaban memakai heading dan poin yang rapi dalam Markdown.\n\n' +
    `${blokRegulasi(naungan)}${blokKekhasanMadrasah(input.mapel)}\n\n` +
    'Prinsip yang WAJIB diterapkan:\n' +
    '- Alur perencanaan: Capaian Pembelajaran (CP) → Tujuan Pembelajaran ' +
    '(TP) → Alur Tujuan Pembelajaran (ATP). TP diturunkan dari CP yang ' +
    'relevan; ATP mengurutkan TP secara logis antarpertemuan.\n' +
    '- Pembelajaran berdiferensiasi: rancang diferensiasi konten, proses, ' +
    'dan/atau produk sesuai kesiapan, minat, dan profil belajar murid.\n' +
    `- ${naungan.deskripsiProjekProfil}\n` +
    '- Asesmen: bedakan asesmen FORMATIF (selama proses, untuk umpan balik) ' +
    'dan SUMATIF (akhir pembelajaran), lengkap dengan contoh instrumen dan ' +
    'Kriteria Ketercapaian Tujuan Pembelajaran (KKTP).\n' +
    '- Pastikan isi materi benar secara keilmuan dan sesuai tingkat ' +
    'perkembangan murid pada jenjang dan fase tersebut.';

  // ------------------------------------------------------------------
  // USER — konteks pembelajaran + struktur keluaran.
  // ------------------------------------------------------------------
  const barisKonteks: string[] = [
    `- Naungan: ${naungan.label}`,
    `- Kurikulum: ${kurikulum}`,
    `- Jenjang: ${input.jenjang}${fase ? ` (Fase ${fase})` : ''}`,
    `- Kelas: ${input.kelas}`,
    `- Mata pelajaran: ${input.mapel}`,
    `- Materi pokok: ${input.materiPokok}`,
  ];
  if (input.modelPembelajaran?.trim()) {
    barisKonteks.push(`- Model pembelajaran: ${input.modelPembelajaran.trim()}`);
  }
  if (input.durasiMenit && input.durasiMenit > 0) {
    barisKonteks.push(`- Alokasi waktu: ${input.durasiMenit} menit`);
  }
  if (input.tujuanTambahan?.trim()) {
    barisKonteks.push(`- Catatan tambahan dari guru: ${input.tujuanTambahan.trim()}`);
  }

  const user =
    'Susun RPP / Modul Ajar lengkap berdasarkan konteks berikut:\n\n' +
    'Konteks pembelajaran:\n' +
    barisKonteks.join('\n') +
    '\n\nSusun dengan komponen berikut, berurutan:\n\n' +
    '1. **Informasi Umum** — identitas satuan pendidikan (tulis "[Nama ' +
    `${mapelAgamaMadrasah ? 'Madrasah' : 'Sekolah'}]"), naungan, jenjang/kelas` +
    `${fase ? `/fase ${fase}` : ''}, mata pelajaran, materi pokok, dan alokasi ` +
    'waktu.\n' +
    '2. **Capaian Pembelajaran (CP)** — tulis CP yang relevan dengan materi ' +
    'pada fase ini (ringkas, sesuai regulasi acuan).\n' +
    '3. **Tujuan Pembelajaran (TP)** — 2-4 tujuan yang spesifik, terukur, ' +
    'diawali kata kerja operasional, dan jelas diturunkan dari CP di atas.\n' +
    '4. **Alur Tujuan Pembelajaran (ATP)** — urutan logis TP antarpertemuan ' +
    'sampai materi tuntas.\n' +
    '5. **Pemahaman Bermakna** — 1-2 kalimat inti yang diharapkan dipahami ' +
    'murid setelah pembelajaran.\n' +
    '6. **Pertanyaan Pemantik** — 2-3 pertanyaan pembuka yang memancing rasa ' +
    'ingin tahu murid.\n' +
    '7. **Kegiatan Pembelajaran** — uraian langkah guru dan murid pada tiga ' +
    'tahap: Pendahuluan (maksimal 10 menit, termasuk apersepsi dan motivasi), ' +
    'Inti (langkah rinci sesuai model pembelajaran, cantumkan perkiraan waktu ' +
    'tiap langkah, sertakan bentuk diferensiasi konten/proses/produk), dan ' +
    `Penutup (refleksi bersama, umpan balik, tindak lanjut, serta kaitan ${naungan.labelProjekProfil} bila relevan).\n` +
    '8. **Asesmen** — (a) FORMATIF: teknik dan contoh instrumen selama proses ' +
    'pembelajaran; (b) SUMATIF: teknik dan contoh instrumen di akhir ' +
    'pembelajaran; keduanya selaras dengan TP, plus KKTP.\n' +
    '9. **Pengayaan dan Remedial** — kegiatan tindak lanjut untuk murid yang ' +
    'sudah tuntas dan yang belum tuntas (sesuai KKTP).\n' +
    '10. **Refleksi Guru** — 3 pertanyaan refleksi untuk evaluasi diri guru ' +
    'setelah mengajar.';

  return { system, user };
}
