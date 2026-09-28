// Generator PDF RekamEdu (kop surat resmi) — gabungan port dari:
// pdfRekap.js, pdfRekapSemester.js, pdfPerpus.js, pdfKunjungan.js, pdfSirkulasi.js
// jsPDF & autotable di-import dinamis agar tidak menambah bundle awal.
// Teks kop memakai data `Pengaturan` yang di-pass sebagai argumen.

import { namaBulan } from './dates'
import type {
  Peminjaman,
  Pengaturan,
  Periode,
  RingkasanKehadiran,
  StatusKehadiran,
} from '../types'
import type { jsPDF as JsPdfType } from 'jspdf'
import type { CellHookData } from 'jspdf-autotable'

// ---------- Helper bersama ----------

async function gambarToDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 300
      let w = img.width || maxSize
      let h = img.height || maxSize
      if (w > maxSize || h > maxSize) {
        if (w > h) {
          h = Math.round((h * maxSize) / w)
          w = maxSize
        } else {
          w = Math.round((w * maxSize) / h)
          h = maxSize
        }
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function finalY(doc: JsPdfType): number {
  const d = doc as unknown as { lastAutoTable?: { finalY?: number } }
  return d.lastAutoTable?.finalY ?? 0
}

// Menggambar kop surat resmi; mengembalikan posisi Y garis bawah ganda.
async function gambarKop(
  doc: JsPdfType,
  pengaturan: Pengaturan | null | undefined,
  pageW: number,
  margin: number,
): Promise<number> {
  if (pengaturan?.logoUrl) {
    const logoData = await gambarToDataUrl(pengaturan.logoUrl)
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, 9, 22, 22)
      } catch {
        /* abaikan logo gagal */
      }
    }
  }

  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  doc.text(
    (pengaturan?.kopBaris1 || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA').toUpperCase(),
    pageW / 2,
    13,
    { align: 'center' },
  )

  if (pengaturan?.kopBaris2) {
    doc.setFontSize(12)
    doc.text(pengaturan.kopBaris2.toUpperCase(), pageW / 2, 19, { align: 'center' })
  }

  if (pengaturan?.kopBaris3) {
    doc.setFontSize(11)
    doc.text(pengaturan.kopBaris3.toUpperCase(), pageW / 2, 24.5, { align: 'center' })
  }

  if (pengaturan?.kopBaris4) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(pengaturan.kopBaris4, pageW / 2, 29.5, { align: 'center' })
  }

  if (pengaturan?.kopBaris5) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(pengaturan.kopBaris5, pageW / 2, 33.5, { align: 'center' })
  }

  const hasBaris5 = !!pengaturan?.kopBaris5
  const lineY = hasBaris5 ? 36.5 : 32.5

  // Garis bawah ganda (double border)
  doc.setLineWidth(0.8)
  doc.line(margin, lineY, pageW - margin, lineY)
  doc.setLineWidth(0.3)
  doc.line(margin, lineY + 1.2, pageW - margin, lineY + 1.2)

  return lineY
}

function tanggalCetakPanjang(): string {
  return new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function tempatTanggal(pengaturan: Pengaturan | null | undefined): string {
  const kota = pengaturan?.kotaTtd?.trim()
  const tgl = tanggalCetakPanjang()
  return kota ? `${kota}, ${tgl}` : tgl
}

// Blok tanda tangan dua kolom standar (dipakai varian generik).
function gambarTandaTangan(
  doc: JsPdfType,
  pengaturan: Pengaturan | null | undefined,
  pageW: number,
  margin: number,
  labelKanan: string,
  namaKanan?: string | null,
  nipKanan?: string | null,
): void {
  let y = finalY(doc) + 15
  const pageH = doc.internal.pageSize.getHeight()
  if (y > pageH - 40) {
    doc.addPage()
    y = 25
  }
  const colKiri = margin + 25
  const colKanan = pageW - margin - 55
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.text('Mengetahui,', colKiri, y, { align: 'center' })
  doc.text('Kepala Sekolah', colKiri, y + 5, { align: 'center' })
  doc.text(tempatTanggal(pengaturan), colKanan, y, { align: 'center' })
  doc.text(labelKanan, colKanan, y + 5, { align: 'center' })
  doc.setFont('times', 'bold')
  doc.text(pengaturan?.kepalaSekolah || '_________________', colKiri, y + 30, { align: 'center' })
  doc.text(namaKanan || '_________________', colKanan, y + 30, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  if (pengaturan?.nipKepalaSekolah) {
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah}`, colKiri, y + 35, { align: 'center' })
  }
  if (nipKanan) {
    doc.text(`NIP. ${nipKanan}`, colKanan, y + 35, { align: 'center' })
  }
}

const EMPTY_SUMMARY: RingkasanKehadiran = {
  H: 0, I: 0, S: 0, A: 0,
  persenH: 0, persenI: 0, persenS: 0, persenA: 0,
}

// ---------- 1. Rekap bulanan ----------

export interface CetakPdfRekapArgs {
  pengaturan?: Pengaturan | null
  period?: Periode | null
  /** Subjudul periode sebagai teks bebas (alternatif `period`). */
  periode?: string
  kelas: string
  waliKelas?: string | null
  nipWaliKelas?: string | null
  year?: number
  month?: number
  days?: string[]
  students?: { nisn: string; nama: string }[]
  matrix?: Record<string, Record<string, StatusKehadiran>>
  summary?: Record<string, RingkasanKehadiran>
  liburSet?: Set<string>
  submittedDatesSet?: Set<string> | null
  /** Varian generik: tabel langsung dari kolom & baris yang sudah dihitung. */
  columns?: string[]
  rows?: (string | number)[][]
}

export async function cetakPdfRekap({
  pengaturan,
  period,
  periode,
  kelas,
  waliKelas,
  nipWaliKelas,
  year,
  month,
  days = [],
  students = [],
  matrix = {},
  summary = {},
  liburSet = new Set<string>(),
  submittedDatesSet,
  columns,
  rows,
}: CetakPdfRekapArgs): Promise<string> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 8

  const lineY = await gambarKop(doc, pengaturan, pageW, margin)

  // ---------- JUDUL ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.text('REKAPITULASI KEHADIRAN SISWA', pageW / 2, lineY + 8.5, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  const periodeDariPeriod = period
    ? `Tahun Ajaran ${period.tahunAjaran} - Semester ${period.semester}`
    : ''
  const subJudul = rows
    ? [`Kelas ${kelas}`, periode ?? periodeDariPeriod].filter((s) => s).join('  |  ')
    : `Kelas ${kelas}  |  Bulan ${namaBulan(month ?? 0)} ${year ?? ''}  ${periodeDariPeriod ? '|  ' + periodeDariPeriod : ''}`
  doc.text(subJudul, pageW / 2, lineY + 14, { align: 'center' })

  // ---------- VARIAN GENERIK: kolom & baris sudah dihitung pemanggil ----------
  if (rows) {
    autoTable(doc, {
      head: [columns ?? []],
      body: rows,
      startY: lineY + 18.5,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { font: 'times', fontSize: 10, cellPadding: 1.5, lineColor: [120, 120, 120], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0] },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    })
    gambarTandaTangan(doc, pengaturan, pageW, margin, 'Wali Kelas', waliKelas, nipWaliKelas)
    const fileName = `Rekap_Absensi_Kelas-${kelas}.pdf`
    doc.save(fileName)
    return fileName
  }

  // ---------- TABEL MATRIKS ----------
  const head = [
    [
      { content: 'No' },
      { content: 'NISN' },
      { content: 'Nama Siswa' },
      ...days.map((d) => ({ content: String(Number(d.slice(8, 10))) })),
      { content: 'H' },
      { content: 'I' },
      { content: 'S' },
      { content: 'A' },
      { content: '%H' },
      { content: '%I' },
      { content: '%S' },
      { content: '%A' },
    ],
  ]

  const body = students.map((s, i) => {
    const row = matrix[s.nisn] || {}
    const sum = summary[s.nisn] || EMPTY_SUMMARY
    return [
      i + 1,
      s.nisn,
      s.nama,
      ...days.map((d) => {
        if (liburSet.has(d)) return 'L'
        if (submittedDatesSet && !submittedDatesSet.has(d)) return '-'
        return row[d] || 'H'
      }),
      sum.H,
      sum.I,
      sum.S,
      sum.A,
      `${sum.persenH}%`,
      `${sum.persenI}%`,
      `${sum.persenS}%`,
      `${sum.persenA}%`,
    ]
  })

  const dayColCount = days.length
  const columnStyles: Record<number, Record<string, unknown>> = {
    0: { cellWidth: 6, halign: 'center' },
    1: { cellWidth: 16, halign: 'center' },
    2: { cellWidth: 47, halign: 'left', cellPadding: 1 },
  }

  // Warna kolom libur (tanggal merah)
  for (let i = 0; i < dayColCount; i++) {
    const isHoliday = liburSet.has(days[i] as string)
    const isUnsubmitted = submittedDatesSet && !submittedDatesSet.has(days[i] as string)
    columnStyles[3 + i] = {
      cellWidth: 4.6,
      halign: 'center',
      fillColor: isHoliday ? [255, 230, 230] : isUnsubmitted ? [240, 240, 240] : undefined,
      textColor: isHoliday ? [200, 0, 0] : isUnsubmitted ? [150, 150, 150] : undefined,
    }
  }
  const sumStart = 3 + dayColCount
  columnStyles[sumStart] = { cellWidth: 6, fontStyle: 'bold', textColor: [5, 150, 105] } // H
  columnStyles[sumStart + 1] = { cellWidth: 6, textColor: [37, 99, 235] } // I
  columnStyles[sumStart + 2] = { cellWidth: 6, textColor: [217, 119, 6] } // S
  columnStyles[sumStart + 3] = { cellWidth: 6, textColor: [220, 38, 38] } // A
  columnStyles[sumStart + 4] = { cellWidth: 9.5, fontStyle: 'bold', textColor: [5, 150, 105] } // %H
  columnStyles[sumStart + 5] = { cellWidth: 9.5, textColor: [37, 99, 235] } // %I
  columnStyles[sumStart + 6] = { cellWidth: 9.5, textColor: [217, 119, 6] } // %S
  columnStyles[sumStart + 7] = { cellWidth: 9.5, textColor: [220, 38, 38] } // %A

  autoTable(doc, {
    head,
    body,
    startY: lineY + 18.5,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, cellPadding: 0.8, lineColor: [120, 120, 120], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0] },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles,
    didParseCell: (data: CellHookData) => {
      if (data.section === 'body') {
        const val = data.cell.raw
        if (val === 'H') data.cell.styles.textColor = [5, 150, 105]
        else if (val === 'I') data.cell.styles.textColor = [37, 99, 235]
        else if (val === 'S') data.cell.styles.textColor = [217, 119, 6]
        else if (val === 'A') data.cell.styles.textColor = [220, 38, 38]
      }
    },
  })

  // ---------- FOOTER REKAPITULASI HARI ----------
  let y = finalY(doc) + 8
  const totalLibur = liburSet ? liburSet.size : 0
  const hadirEfektif = days.filter((d) => !liburSet?.has(d) && submittedDatesSet?.has(d)).length

  doc.setFontSize(9)
  doc.setFont('times', 'bold')
  doc.text(`Total Hari Efektif Diabsen: ${hadirEfektif} Hari   |   Total Libur: ${totalLibur} Hari`, pageW / 2, y, { align: 'center' })

  doc.setFont('times', 'normal')
  doc.setFontSize(8)
  doc.text(`Keterangan: H = Hadir, I = Izin, S = Sakit, A = Alfa, L = Libur/Akhir Pekan, - = Belum Diabsen`, pageW / 2, y + 4, { align: 'center' })
  doc.text(`*Catatan: Persentase kehadiran diukur berdasarkan proporsi kehadiran terhadap hari efektif Kegiatan Belajar Mengajar (KBM).`, pageW / 2, y + 8, { align: 'center' })

  // ---------- TANDA TANGAN ----------
  y += 18
  const pageH = doc.internal.pageSize.getHeight()
  if (y > pageH - 40) {
    doc.addPage('a4', 'landscape')
    y = 25
  }

  const colKiri = margin + 25
  const colKanan = pageW - margin - 55

  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.text('Mengetahui,', colKiri, y, { align: 'center' })
  doc.text('Kepala Sekolah', colKiri, y + 5, { align: 'center' })

  doc.text(tempatTanggal(pengaturan), colKanan, y, { align: 'center' })
  doc.text('Wali Kelas', colKanan, y + 5, { align: 'center' })

  doc.setFont('times', 'bold')
  doc.text(pengaturan?.kepalaSekolah || '_________________', colKiri, y + 30, { align: 'center' })
  doc.text(waliKelas || '_________________', colKanan, y + 30, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  if (pengaturan?.nipKepalaSekolah) {
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah}`, colKiri, y + 35, { align: 'center' })
  }
  if (nipWaliKelas) {
    doc.text(`NIP. ${nipWaliKelas}`, colKanan, y + 35, { align: 'center' })
  }

  const fileName = `Rekap_Absensi_Kelas-${kelas}_${namaBulan(month ?? 0)}_${year ?? ''}.pdf`
  doc.save(fileName)
  return fileName
}

// ---------- 2. Rekap semester ----------

export interface CetakPdfRekapSemesterArgs {
  pengaturan?: Pengaturan | null
  kelas: string
  waliKelas?: string | null
  nipWaliKelas?: string | null
  tahun?: string
  semester?: string
  /** Subjudul periode sebagai teks bebas (alternatif `tahun`/`semester`). */
  periode?: string
  students?: { nisn: string; nama: string }[]
  summary?: Record<string, RingkasanKehadiran>
  /** Varian generik: tabel langsung dari kolom & baris yang sudah dihitung. */
  columns?: string[]
  rows?: (string | number)[][]
}

export async function cetakPdfRekapSemester({
  pengaturan,
  kelas,
  waliKelas,
  nipWaliKelas,
  tahun,
  semester,
  periode,
  students = [],
  summary = {},
  columns,
  rows,
}: CetakPdfRekapSemesterArgs): Promise<string> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 9

  const lineY = await gambarKop(doc, pengaturan, pageW, margin)

  // ---------- JUDUL ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.text('REKAPITULASI KEHADIRAN SISWA', pageW / 2, lineY + 10, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.text(
    `Kelas: ${kelas}   |   Periode: ${periode ?? semester ?? ''}`,
    pageW / 2,
    lineY + 16,
    { align: 'center' },
  )

  // ---------- VARIAN GENERIK: kolom & baris sudah dihitung pemanggil ----------
  if (rows) {
    autoTable(doc, {
      head: [columns ?? []],
      body: rows,
      startY: lineY + 22,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { font: 'times', fontSize: 10, cellPadding: 1.5, lineColor: [120, 120, 120], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0] },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    })
    gambarTandaTangan(doc, pengaturan, pageW, margin, 'Wali Kelas', waliKelas, nipWaliKelas)
    const fileName = `Rekap_Semester_${periode ?? semester ?? ''}_${tahun ?? ''}_Kelas-${kelas}.pdf`
    doc.save(fileName)
    return fileName
  }

  // ---------- TABEL ----------
  const head = [
    [
      { content: 'No' },
      { content: 'NISN' },
      { content: 'Nama Siswa' },
      { content: 'Hadir' },
      { content: 'Izin' },
      { content: 'Sakit' },
      { content: 'Alfa' },
      { content: '%H' },
      { content: '%I' },
      { content: '%S' },
      { content: '%A' },
    ],
  ]

  const body = students.map((s, i) => {
    const sum = summary[s.nisn] || EMPTY_SUMMARY
    return [
      i + 1,
      s.nisn,
      s.nama,
      sum.H,
      sum.I,
      sum.S,
      sum.A,
      `${sum.persenH}%`,
      `${sum.persenI}%`,
      `${sum.persenS}%`,
      `${sum.persenA}%`,
    ]
  })

  autoTable(doc, {
    head,
    body,
    startY: lineY + 22,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: 'times', fontSize: 11, cellPadding: 1.5, lineColor: [120, 120, 120], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0] },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 52, halign: 'left', cellPadding: 1.5 },
      3: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 16, halign: 'center' },
      9: { cellWidth: 16, halign: 'center' },
      10: { cellWidth: 16, halign: 'center' },
    },
  })

  // ---------- TANDA TANGAN ----------
  let y = finalY(doc) + 15
  const pageH = doc.internal.pageSize.getHeight()
  if (y > pageH - 40) {
    doc.addPage('a4', 'portrait')
    y = 25
  }

  const colKiri = margin + 25
  const colKanan = pageW - margin - 35

  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  doc.text('Mengetahui,', colKiri, y, { align: 'center' })
  doc.text('Kepala Sekolah', colKiri, y + 5, { align: 'center' })

  doc.text(tempatTanggal(pengaturan), colKanan, y, { align: 'center' })
  doc.text('Wali Kelas', colKanan, y + 5, { align: 'center' })

  doc.setFont('times', 'bold')
  doc.text(pengaturan?.kepalaSekolah || '_________________', colKiri, y + 30, { align: 'center' })
  doc.text(waliKelas || '_________________', colKanan, y + 30, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  if (pengaturan?.nipKepalaSekolah) {
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah}`, colKiri, y + 35, { align: 'center' })
  }
  if (nipWaliKelas) {
    doc.text(`NIP. ${nipWaliKelas}`, colKanan, y + 35, { align: 'center' })
  }

  const fileName = `Rekap_Semester_${semester}_${tahun}_Kelas-${kelas}.pdf`
  doc.save(fileName)
  return fileName
}

// ---------- 3. Laporan statistik perpustakaan ----------

export interface TopItem {
  nama?: string
  judul?: string
  kelas?: string | null
  count: number
  jumlah?: number
}

export interface CetakPdfPerpusArgs {
  topBooks: TopItem[]
  topStudents: TopItem[]
  totalDipinjamBulanIni?: number
  totalSiswaPeminjam?: number
  pengaturan?: Pengaturan | null
  periodeText?: string
}

export async function cetakPdfPerpus({
  topBooks,
  topStudents,
  totalDipinjamBulanIni,
  totalSiswaPeminjam,
  pengaturan,
  periodeText = 'KESELURUHAN',
}: CetakPdfPerpusArgs): Promise<string> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width

  const margin = 15
  const lineY = await gambarKop(doc, pengaturan, pageWidth, margin)

  // ---------- JUDUL LAPORAN ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  const namaPerpus = pengaturan?.namaPerpustakaan || 'Perpustakaan Sekolah'
  doc.text(`LAPORAN STATISTIK PERPUSTAKAAN ${namaPerpus.toUpperCase()}`, pageWidth / 2, lineY + 8.5, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  doc.text(`PERIODE: ${periodeText.toUpperCase()}`, pageWidth / 2, lineY + 14, { align: 'center' })
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, lineY + 19, { align: 'center' })

  let currentY = lineY + 28

  // ---------- SUMMARY BLOCK ----------
  doc.setFont('times', 'bold')
  doc.text(`Total Buku Dipinjam Bulan Ini : ${totalDipinjamBulanIni || 0} Buku`, 15, currentY)
  doc.text(`Total Siswa Pernah Meminjam   : ${totalSiswaPeminjam || 0} Siswa`, 15, currentY + 6)

  currentY += 16

  // ---------- BUKU TERLARIS ----------
  doc.setFont('times', 'bold')
  doc.text('Daftar Buku Paling Sering Dipinjam', 15, currentY)
  currentY += 5

  const booksHead = [['Peringkat', 'Judul Buku', 'Jumlah Peminjaman']]
  const booksBody: (string | number)[][] = topBooks.map((b, i) => [
    i + 1,
    b.judul ?? '-',
    `${b.count} kali`,
  ])

  if (!booksBody.length) booksBody.push(['-', 'Belum ada data peminjaman buku', '-'])

  autoTable(doc, {
    head: booksHead,
    body: booksBody,
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, halign: 'center', font: 'times' },
    bodyStyles: { font: 'times' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 40 },
    },
  })

  currentY = finalY(doc) + 15

  // ---------- SISWA TERAKTIF ----------
  doc.setFont('times', 'bold')
  doc.text('Daftar Siswa Teraktif Membaca', 15, currentY)
  currentY += 5

  const studentsHead = [['Peringkat', 'Nama Siswa', 'Kelas', 'Jumlah Buku Dipinjam']]
  const studentsBody: (string | number)[][] = topStudents.map((s, i) => [
    i + 1,
    s.nama ?? '-',
    s.kelas || '-',
    `${s.count} buku`,
  ])

  if (!studentsBody.length) studentsBody.push(['-', 'Belum ada data siswa meminjam', '-', '-'])

  autoTable(doc, {
    head: studentsHead,
    body: studentsBody,
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [2, 132, 199], textColor: 255, halign: 'center', font: 'times' },
    bodyStyles: { font: 'times' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 40 },
    },
  })

  // Tanda Tangan
  currentY = finalY(doc) + 20
  if (currentY > 250) {
    doc.addPage()
    currentY = 20
  }

  doc.setFont('times', 'normal')
  doc.text(tempatTanggal(pengaturan), pageWidth - 15, currentY, { align: 'right' })
  doc.text('Petugas Perpustakaan / Admin', pageWidth - 15, currentY + 6, { align: 'right' })

  doc.text('_____________________________', pageWidth - 15, currentY + 30, { align: 'right' })

  const fileName = `Laporan_Perpus_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
  return fileName
}

// ---------- 4. Laporan kunjungan perpustakaan ----------

export interface KunjunganRow {
  nama: string
  nisn?: string | null
  kelas?: string | null
}

export interface CetakPdfKunjunganArgs {
  pengaturan?: Pengaturan | null
  /** Judul laporan kustom (default: LAPORAN KUNJUNGAN PERPUSTAKAAN …). */
  judul?: string
  /** Subjudul tanggal/periode di bawah judul. */
  tanggal?: string
  /** Daftar kunjungan mentah (varian tabel detail). */
  rows?: KunjunganRow[]
  // --- varian ringkas (ranking pengunjung) ---
  topStudents?: TopItem[]
  totalKunjungan?: number
  totalSiswaUnik?: number
  periodeText?: string
}

export async function cetakPdfKunjungan({
  pengaturan,
  judul,
  tanggal,
  rows,
  topStudents = [],
  totalKunjungan,
  totalSiswaUnik,
  periodeText = 'KESELURUHAN',
}: CetakPdfKunjunganArgs): Promise<string> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width

  const margin = 15
  const lineY = await gambarKop(doc, pengaturan, pageWidth, margin)

  // ---------- JUDUL LAPORAN ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  const namaPerpus = pengaturan?.namaPerpustakaan || 'Perpustakaan Sekolah'
  doc.text(
    (judul ?? `LAPORAN KUNJUNGAN PERPUSTAKAAN ${namaPerpus}`).toUpperCase(),
    pageWidth / 2,
    lineY + 8.5,
    { align: 'center' },
  )

  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  doc.text(`PERIODE: ${(tanggal ?? periodeText).toUpperCase()}`, pageWidth / 2, lineY + 14, { align: 'center' })
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, lineY + 19, { align: 'center' })

  let currentY = lineY + 28

  if (rows) {
    // ---------- Varian tabel detail ----------
    const detailHead = [['No', 'Nama Siswa', 'NISN', 'Kelas']]
    const detailBody: (string | number)[][] = rows.map((r, i) => [
      i + 1,
      r.nama,
      r.nisn || '-',
      r.kelas || '-',
    ])
    if (!detailBody.length) detailBody.push(['-', 'Belum ada data kunjungan pada periode ini', '-', '-'])

    autoTable(doc, {
      head: detailHead,
      body: detailBody,
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, halign: 'center', font: 'times' },
      bodyStyles: { font: 'times' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 25 },
      },
    })
  } else {
    // ---------- Varian ringkas: summary + ranking ----------
    doc.setFont('times', 'bold')
    doc.text(`Total Kunjungan       : ${totalKunjungan || 0} Kali Kunjungan`, 15, currentY)
    doc.text(`Siswa Unik Berkunjung : ${totalSiswaUnik || 0} Anak`, 15, currentY + 6)

    currentY += 16

    const studentsHead = [['No', 'Nama Siswa', 'Kelas', 'Jumlah Kunjungan']]
    const studentsBody: (string | number)[][] = topStudents.map((s, i) => [
      i + 1,
      s.nama ?? '-',
      s.kelas || '-',
      `${s.count ?? s.jumlah ?? 0} kali`,
    ])

    if (!studentsBody.length) studentsBody.push(['-', 'Belum ada data kunjungan pada periode ini', '-', '-'])

    autoTable(doc, {
      head: studentsHead,
      body: studentsBody,
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, halign: 'center', font: 'times' },
      bodyStyles: { font: 'times' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 40 },
      },
    })
  }

  // Tanda Tangan
  currentY = finalY(doc) + 20
  if (currentY > 250) {
    doc.addPage()
    currentY = 20
  }

  doc.setFont('times', 'normal')
  doc.text(tempatTanggal(pengaturan), pageWidth - 15, currentY, { align: 'right' })
  doc.text('Petugas Perpustakaan / Admin', pageWidth - 15, currentY + 6, { align: 'right' })

  doc.text('_____________________________', pageWidth - 15, currentY + 30, { align: 'right' })

  const fileName = `Laporan_Kunjungan_Perpus_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
  return fileName
}

// ---------- 5. Laporan sirkulasi peminjaman ----------

export interface SirkulasiRow {
  peminjam: string
  kelas?: string | null
  buku: string
  tglPinjam: string
  batasKembali?: string | null
  status?: string | null
}

export interface CetakPdfSirkulasiArgs {
  pengaturan?: Pengaturan | null
  /** Judul laporan (alias: title). */
  judul?: string
  title?: string
  /** Subjudul periode di bawah judul. */
  periode?: string
  /** Daftar sirkulasi mentah (varian tabel detail). */
  rows?: SirkulasiRow[]
  // --- varian data API langsung ---
  loans?: Peminjaman[]
}

export async function cetakPdfSirkulasi({
  pengaturan,
  judul,
  title,
  periode,
  rows,
  loans = [],
}: CetakPdfSirkulasiArgs): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  const margin = 15
  const lineY = await gambarKop(doc, pengaturan, pageW, margin)

  // ---------- JUDUL LAPORAN ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  const namaPerpus = pengaturan?.namaPerpustakaan || 'Perpustakaan Sekolah'
  const judulLaporan = judul ?? title ?? 'Laporan Sirkulasi'
  doc.text(`${judulLaporan.toUpperCase()} PERPUSTAKAAN ${namaPerpus.toUpperCase()}`, pageW / 2, lineY + 8.5, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  const subJudul = periode
    ? `Periode: ${periode}`
    : `Dicetak pada: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`
  doc.text(subJudul, pageW / 2, lineY + 14, { align: 'center' })

  let tableData: (string | number)[][]
  let head: string[][]
  let columnStyles: Record<number, Record<string, unknown>>

  if (rows) {
    head = [['No', 'Peminjam', 'Kelas', 'Judul Buku', 'Tgl Pinjam', 'Batas Kembali', 'Status']]
    tableData = rows.map((r, i) => [
      i + 1,
      r.peminjam,
      r.kelas || '-',
      r.buku,
      r.tglPinjam,
      r.batasKembali || '-',
      r.status || '-',
    ])
    columnStyles = {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 90 },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 28, halign: 'center' },
      6: { cellWidth: 30, halign: 'center' },
    }
  } else {
    head = [['No', 'Tgl Pinjam', 'Peminjam', 'Judul Buku', 'Batas Kembali', 'Status']]
    tableData = loans.map((l, i) => [
      i + 1,
      l.tanggalPinjam,
      l.siswa?.nama || '-',
      l.buku?.judul || '-',
      l.tanggalKembaliSeharusnya,
      l.status === 'dikembalikan'
        ? `Dikembalikan (${l.tanggalKembaliAktual ?? '-'})`
        : 'Dipinjam',
    ])
    columnStyles = {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 60 },
      3: { cellWidth: 100 },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 40, halign: 'center' },
    }
  }

  autoTable(doc, {
    startY: lineY + 28,
    head,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles,
  })

  const fileName = 'Laporan_Sirkulasi_Perpus.pdf'
  doc.save(fileName)
  return fileName
}
