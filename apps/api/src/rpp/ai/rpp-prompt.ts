// Template prompt penyusunan RPP kurikulum Indonesia (Bahasa Indonesia).

export interface RppPromptInput {
  jenjang: string; // mis. SD, SMP, SMA
  kelas: string; // mis. "4", "VII", "X"
  mapel: string; // mata pelajaran
  materiPokok: string;
  modelPembelajaran?: string; // mis. Problem Based Learning
  durasiMenit?: number; // mis. 70 (2 JP)
  tujuanTambahan?: string;
}

export function buildRppPrompt(input: RppPromptInput): {
  system: string;
  user: string;
} {
  const system =
    'Kamu adalah penulis Rencana Pelaksanaan Pembelajaran (RPP) profesional ' +
    'untuk kurikulum yang berlaku di Indonesia. Tulis SELURUH jawaban dalam ' +
    'Bahasa Indonesia yang baku, jelas, dan siap pakai oleh guru di kelas. ' +
    'Jangan gunakan istilah asing yang tidak perlu. Format jawaban memakai ' +
    'heading dan poin yang rapi dalam Markdown.';

  const barisOpsional: string[] = [];
  if (input.modelPembelajaran?.trim()) {
    barisOpsional.push(`- Model pembelajaran: ${input.modelPembelajaran.trim()}`);
  }
  if (input.durasiMenit && input.durasiMenit > 0) {
    barisOpsional.push(`- Alokasi waktu: ${input.durasiMenit} menit`);
  }
  if (input.tujuanTambahan?.trim()) {
    barisOpsional.push(`- Catatan tambahan dari guru: ${input.tujuanTambahan.trim()}`);
  }

  const user =
    'Susun RPP lengkap berdasarkan konteks berikut:\n\n' +
    `Konteks pembelajaran:\n` +
    `- Jenjang: ${input.jenjang}\n` +
    `- Kelas: ${input.kelas}\n` +
    `- Mata pelajaran: ${input.mapel}\n` +
    `- Materi pokok: ${input.materiPokok}\n` +
    (barisOpsional.length > 0 ? barisOpsional.join('\n') + '\n' : '') +
    '\nSusun RPP dengan komponen berikut, berurutan:\n\n' +
    '1. **Informasi Umum** — identitas sekolah (tulis "[Nama Sekolah]"), ' +
    'jenjang/kelas, mata pelajaran, materi pokok, dan alokasi waktu.\n' +
    '2. **Tujuan Pembelajaran** — 2-4 tujuan yang spesifik, terukur, dan ' +
    'sesuai jenjang, diawali kata kerja operasional.\n' +
    '3. **Pemahaman Bermakna** — 1-2 kalimat inti yang diharapkan dipahami ' +
    'murid setelah pembelajaran.\n' +
    '4. **Pertanyaan Pemantik** — 2-3 pertanyaan pembuka yang memancing rasa ' +
    'ingin tahu murid.\n' +
    '5. **Kegiatan Pembelajaran** — uraian langkah guru dan murid pada tiga ' +
    'tahap: Pendahuluan (maksimal 10 menit, termasuk apersepsi dan motivasi), ' +
    'Inti (langkah rinci sesuai model pembelajaran, cantumkan perkiraan waktu ' +
    'tiap langkah), dan Penutup (refleksi bersama, umpan balik, tindak lanjut).\n' +
    '6. **Asesmen** — teknik dan contoh instrumen penilaian (formatif dan ' +
    'sumatif sederhana) yang selaras dengan tujuan pembelajaran.\n' +
    '7. **Pengayaan dan Remedial** — kegiatan tindak lanjut untuk murid yang ' +
    'sudah tuntas dan yang belum tuntas.\n' +
    '8. **Refleksi Guru** — 3 pertanyaan refleksi untuk evaluasi diri guru ' +
    'setelah mengajar.\n\n' +
    'Pastikan isi materi benar secara keilmuan dan sesuai dengan tingkat ' +
    'perkembangan murid pada jenjang tersebut.';

  return { system, user };
}
