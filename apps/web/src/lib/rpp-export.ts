// Ekspor dokumen pembelajaran: unduh DOCX (via backend) dan cetak PDF
// (dibangun di browser memakai jsPDF, mengikuti pola lib/pdf.ts).
// Parser Markdown: heading (#/##/###), bullet, numbered list, tabel pipa,
// bold (**), italic (*), dan paragraf biasa.

import { getApiToken } from './api'
import type { jsPDF as JsPdfType } from 'jspdf'

export interface DokumenEkspor {
  id?: string
  judul: string
  jenis: string
  konten: string
  metadata?: Record<string, unknown> | null
}

const JENIS_LABEL: Record<string, string> = {
  RPP: 'RPP',
  SILABUS: 'Silabus',
  MODUL_AJAR: 'Modul Ajar',
  LKPD: 'LKPD',
  SOAL: 'Soal',
  LAINNYA: 'Lainnya',
}

export function labelJenisDokumen(jenis: string): string {
  return JENIS_LABEL[jenis] ?? jenis
}

function namaFileAman(judul: string, ekstensi: string): string {
  const dasar = judul
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return `${dasar || 'dokumen'}.${ekstensi}`
}

/** Unduh DOCX dari backend (dokumen harus sudah tersimpan). */
export async function unduhDocxDokumen(id: string, judul: string): Promise<void> {
  const token = getApiToken()
  if (!token) throw new Error('Sesi Anda berakhir. Silakan masuk kembali.')
  const res = await fetch(`/api/rpp/dokumen/${encodeURIComponent(id)}/export?format=docx`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Gagal mengunduh DOCX (kode ${res.status}).`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFileAman(judul, 'docx')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ---------- Parser Markdown ringan ----------

interface Run {
  text: string
  bold: boolean
  italic: boolean
}

/** Pecah baris menjadi run dengan bold/italic inline. */
function parseRuns(baris: string): Run[] {
  const hasil: Run[] = []
  const pola = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g
  let terakhir = 0
  let cocok: RegExpExecArray | null
  while ((cocok = pola.exec(baris)) !== null) {
    if (cocok.index > terakhir) {
      hasil.push({ text: baris.slice(terakhir, cocok.index), bold: false, italic: false })
    }
    const mentah = cocok[0]
    if (mentah.startsWith('**')) {
      hasil.push({ text: mentah.slice(2, -2), bold: true, italic: false })
    } else {
      hasil.push({ text: mentah.slice(1, -1), bold: false, italic: true })
    }
    terakhir = cocok.index + mentah.length
  }
  if (terakhir < baris.length) {
    hasil.push({ text: baris.slice(terakhir), bold: false, italic: false })
  }
  return hasil.filter((r) => r.text !== '')
}

function barisTabel(baris: string): boolean {
  return /^\s*\|.*\|\s*$/.test(baris)
}

function barisPemisahTabel(baris: string): boolean {
  return /^\s*\|?[\s:|-]+\|?[\s:|-]*$/.test(baris) && baris.includes('-')
}

function selBersih(sel: string): string {
  return sel.trim().replace(/\*\*/g, '').replace(/(^|\s)\*(\S)/g, '$1$2').replace(/(\S)\*(\s|$)/g, '$1$2')
}

// ---------- Perender PDF ----------

const MARGIN = 20
const LEBAR_KONTEN = 170 // A4 210mm - 2x20mm

function gayaHuruf(doc: JsPdfType, run: Run): void {
  doc.setFont('helvetica', run.bold ? 'bold' : run.italic ? 'italic' : 'normal')
}

function pastikanRuang(doc: JsPdfType, y: number, butuh: number): number {
  if (y + butuh > 277) {
    doc.addPage()
    return MARGIN
  }
  return y
}

/** Tulis paragraf rich-text dengan word-wrap; kembalikan posisi Y akhir. */
function tulisParagraf(
  doc: JsPdfType,
  runs: Run[],
  x: number,
  y: number,
  ukuran: number,
  spasiSetelah = 3,
): number {
  doc.setFontSize(ukuran)
  const tinggiBaris = ukuran * 0.5
  interface Kata extends Run { kata: string }
  const kata: Kata[] = []
  for (const r of runs) {
    for (const w of r.text.split(/(\s+)/)) {
      if (w !== '') kata.push({ ...r, kata: w })
    }
  }
  let cx = x
  let cy = pastikanRuang(doc, y, tinggiBaris)
  for (const k of kata) {
    gayaHuruf(doc, k)
    const lebar = doc.getTextWidth(k.kata)
    if (cx + lebar > x + LEBAR_KONTEN - (x - MARGIN) && cx > x) {
      cx = x
      cy += tinggiBaris
      cy = pastikanRuang(doc, cy, tinggiBaris)
    }
    doc.text(k.kata, cx, cy)
    cx += lebar
  }
  return cy + tinggiBaris + spasiSetelah
}

function tulisHeading(doc: JsPdfType, teks: string, level: 1 | 2 | 3, y: number): number {
  const ukuran = level === 1 ? 14 : level === 2 ? 12 : 11
  doc.setTextColor(15, 23, 42)
  y = pastikanRuang(doc, y + 2, ukuran * 0.5 + 4)
  const akhir = tulisParagraf(doc, [{ text: teks, bold: true, italic: false }], MARGIN, y, ukuran, 2)
  doc.setTextColor(0, 0, 0)
  return akhir
}

/** Cetak PDF dokumen pembelajaran; kembalikan nama file yang dipakai. */
export async function cetakPdfDokumen(dok: DokumenEkspor): Promise<string> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  // Kepala dokumen
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  for (const baris of doc.splitTextToSize(dok.judul, LEBAR_KONTEN) as string[]) {
    y = pastikanRuang(doc, y, 8)
    doc.text(baris, 105, y, { align: 'center' })
    y += 7
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  const meta = (dok.metadata ?? {}) as Record<string, unknown>
  const bagianMeta: string[] = [labelJenisDokumen(dok.jenis)]
  if (meta.jenjang) bagianMeta.push(String(meta.jenjang))
  if (meta.kelas) bagianMeta.push(`Kelas ${meta.kelas}`)
  if (meta.mapel) bagianMeta.push(String(meta.mapel))
  bagianMeta.push(
    new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
  )
  const barisMeta = bagianMeta.join(' · ')
  for (const baris of doc.splitTextToSize(barisMeta, LEBAR_KONTEN) as string[]) {
    y = pastikanRuang(doc, y, 6)
    doc.text(baris, 105, y, { align: 'center' })
    y += 5
  }
  doc.setTextColor(0, 0, 0)
  y = pastikanRuang(doc, y + 2, 4)
  doc.setDrawColor(203, 213, 225)
  doc.line(MARGIN, y, MARGIN + LEBAR_KONTEN, y)
  y += 6

  // Isi
  const baris = dok.konten.replace(/\r\n?/g, '\n').split('\n')
  let i = 0
  while (i < baris.length) {
    const b = baris[i]

    if (barisTabel(b)) {
      const mentah: string[] = []
      while (i < baris.length && barisTabel(baris[i])) {
        mentah.push(baris[i])
        i++
      }
      const isi = mentah.filter((r) => !barisPemisahTabel(r))
      if (isi.length > 0) {
        const data = isi.map((r) =>
          r.trim().replace(/^\||\|$/g, '').split('|').map(selBersih),
        )
        y = pastikanRuang(doc, y, 12)
        autoTable(doc, {
          head: [data[0]],
          body: data.slice(1),
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: [15, 23, 42] },
          headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        })
        const d = doc as unknown as { lastAutoTable?: { finalY?: number } }
        y = (d.lastAutoTable?.finalY ?? y) + 5
      }
      continue
    }

    const rapi = b.trim()
    if (!rapi || /^(-{3,}|\*{3,}|_{3,})$/.test(rapi)) {
      i++
      continue
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(rapi)
    if (heading) {
      y = tulisHeading(doc, heading[2], heading[1].length as 1 | 2 | 3, y)
      i++
      continue
    }

    const bullet = /^[-*]\s+(.*)$/.exec(rapi)
    if (bullet) {
      y = pastikanRuang(doc, y, 7)
      doc.setFontSize(10.5)
      doc.text('•', MARGIN + 2, y)
      y = tulisParagraf(doc, parseRuns(bullet[1]), MARGIN + 8, y, 10.5, 1.5)
      i++
      continue
    }

    const bernomor = /^(\d+)[.)]\s+(.*)$/.exec(rapi)
    if (bernomor) {
      y = pastikanRuang(doc, y, 7)
      const label = `${bernomor[1]}.`
      doc.setFontSize(10.5)
      doc.setFont('helvetica', 'normal')
      doc.text(label, MARGIN + 2, y)
      const geser = doc.getTextWidth(label) + 3
      y = tulisParagraf(doc, parseRuns(bernomor[2]), MARGIN + 2 + geser, y, 10.5, 1.5)
      i++
      continue
    }

    const kutip = /^>\s?(.*)$/.exec(rapi)
    if (kutip) {
      y = tulisParagraf(doc, [{ text: kutip[1], bold: false, italic: true }], MARGIN + 6, y, 10.5)
      i++
      continue
    }

    y = tulisParagraf(doc, parseRuns(rapi), MARGIN, y, 10.5)
    i++
  }

  // Nomor halaman
  const total = doc.getNumberOfPages()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  for (let h = 1; h <= total; h++) {
    doc.setPage(h)
    doc.text(`Halaman ${h} dari ${total}`, 105, 290, { align: 'center' })
  }

  const namaFile = namaFileAman(dok.judul, 'pdf')
  doc.save(namaFile)
  return namaFile
}
