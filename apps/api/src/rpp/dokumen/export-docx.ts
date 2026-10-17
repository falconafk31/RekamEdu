// Konverter Markdown (keluaran AI) → dokumen DOCX yang bisa diedit ulang.
// Parser berbasis baris, menangani: heading (#/##/###), bullet, numbered
// list, tabel pipa Markdown, bold (**), italic (*), dan paragraf biasa.
// Dipakai endpoint GET /rpp/dokumen/:id/export?format=docx.

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const FONT = 'Calibri';

/** Pecah satu baris menjadi TextRun dengan bold/italic inline. */
function parseInline(teks: string): TextRun[] {
  const hasil: TextRun[] = [];
  const pola = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  let terakhir = 0;
  let cocok: RegExpExecArray | null;
  while ((cocok = pola.exec(teks)) !== null) {
    if (cocok.index > terakhir) {
      hasil.push(new TextRun({ text: teks.slice(terakhir, cocok.index), font: FONT }));
    }
    const mentah = cocok[0];
    if (mentah.startsWith('**')) {
      hasil.push(
        new TextRun({ text: mentah.slice(2, -2), bold: true, font: FONT }),
      );
    } else {
      hasil.push(
        new TextRun({ text: mentah.slice(1, -1), italics: true, font: FONT }),
      );
    }
    terakhir = cocok.index + mentah.length;
  }
  if (terakhir < teks.length) {
    hasil.push(new TextRun({ text: teks.slice(terakhir), font: FONT }));
  }
  return hasil.length > 0 ? hasil : [new TextRun({ text: teks, font: FONT })];
}

/** Baris tabel Markdown → sel teks (penanda bold/italic dilucuti). */
function barisKeSel(baris: string): string[] {
  return baris
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((s) => s.trim().replace(/\*\*/g, '').replace(/(^|\s)\*(\S)/g, '$1$2').replace(/(\S)\*(\s|$)/g, '$1$2'));
}

function barisTabel(baris: string): boolean {
  return /^\s*\|.*\|\s*$/.test(baris);
}

function barisPemisahTabel(baris: string): boolean {
  return /^\s*\|?[\s:|-]+\|?[\s:|-]*$/.test(baris) && baris.includes('-');
}

function paragrafBiasa(teks: string): Paragraph {
  return new Paragraph({
    children: parseInline(teks),
    spacing: { after: 160 },
  });
}

/** Ubah seluruh Markdown menjadi daftar blok docx (Paragraph/Table). */
export function markdownKeBlok(markdown: string): Array<Paragraph | Table> {
  const blok: Array<Paragraph | Table> = [];
  const baris = markdown.replace(/\r\n?/g, '\n').split('\n');

  let i = 0;
  while (i < baris.length) {
    const b = baris[i].trimEnd();

    // Blok tabel: kumpulkan baris pipa berurutan.
    if (barisTabel(b)) {
      const barisTabelMentah: string[] = [];
      while (i < baris.length && barisTabel(baris[i])) {
        barisTabelMentah.push(baris[i]);
        i++;
      }
      const barisIsi = barisTabelMentah.filter((r) => !barisPemisahTabel(r));
      if (barisIsi.length > 0) {
        const rows = barisIsi.map(
          (r, idx) =>
            new TableRow({
              children: barisKeSel(r).map(
                (sel) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: sel,
                            bold: idx === 0,
                            font: FONT,
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
              ),
            }),
        );
        blok.push(
          new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        );
        blok.push(new Paragraph({ spacing: { after: 160 } }));
      }
      continue;
    }

    const rapi = b.trim();
    if (!rapi || /^(-{3,}|\*{3,}|_{3,})$/.test(rapi)) {
      i++;
      continue; // baris kosong / garis horizontal dilewati
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(rapi);
    if (heading) {
      const level =
        heading[1].length === 1
          ? HeadingLevel.HEADING_1
          : heading[1].length === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
      blok.push(
        new Paragraph({
          heading: level,
          children: parseInline(heading[2]),
          spacing: { before: 240, after: 120 },
        }),
      );
      i++;
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(rapi);
    if (bullet) {
      blok.push(
        new Paragraph({
          children: parseInline(bullet[1]),
          bullet: { level: 0 },
          spacing: { after: 80 },
        }),
      );
      i++;
      continue;
    }

    const bernomor = /^(\d+)[.)]\s+(.*)$/.exec(rapi);
    if (bernomor) {
      blok.push(
        new Paragraph({
          children: parseInline(`${bernomor[1]}. ${bernomor[2]}`),
          indent: { left: 360 },
          spacing: { after: 80 },
        }),
      );
      i++;
      continue;
    }

    const kutip = /^>\s?(.*)$/.exec(rapi);
    if (kutip) {
      blok.push(
        new Paragraph({
          children: [new TextRun({ text: kutip[1], italics: true, font: FONT })],
          indent: { left: 360 },
          spacing: { after: 160 },
        }),
      );
      i++;
      continue;
    }

    blok.push(paragrafBiasa(rapi));
    i++;
  }

  return blok;
}

export interface DocxInput {
  judul: string;
  subjudul: string;
  konten: string;
}

/** Bangun buffer DOCX lengkap dari judul + konten Markdown. */
export async function dokumenKeDocx(input: DocxInput): Promise<Buffer> {
  const kepala: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: input.judul, font: FONT })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: input.subjudul, font: FONT, size: 20, color: '64748B' }),
      ],
      spacing: { after: 320 },
    }),
  ];

  const dokumen = new Document({
    sections: [{ children: [...kepala, ...markdownKeBlok(input.konten)] }],
  });

  return Packer.toBuffer(dokumen);
}

/** Judul → nama file aman untuk Content-Disposition. */
export function namaFileAman(judul: string, ekstensi: string): string {
  const dasar = judul
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return `${dasar || 'dokumen'}.${ekstensi}`;
}
