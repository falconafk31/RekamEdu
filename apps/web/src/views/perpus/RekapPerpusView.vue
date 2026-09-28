<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { namaBulan } from '../../lib/dates'
import { cetakPdfPerpus, cetakPdfKunjungan } from '../../lib/pdf'
import { exportExcelKunjungan, exportExcelSirkulasi } from '../../lib/excel'
import {
  Users,
  UserRound,
  Trophy,
  Medal,
  BookOpen,
  Library,
  Download,
  FileSpreadsheet,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'

interface PinjamRow {
  tanggalPinjam: string
  bookId: string | number
  bookJudul: string
  studentNisn: string
  studentNama: string
  studentKelas: string
}

interface KunjungRow {
  tanggal: string
  studentNisn: string
  studentNama: string
  studentKelas: string
}

interface PeringkatBuku {
  id: string | number
  judul: string
  count: number
}

interface PeringkatSiswa {
  nisn: string
  nama: string
  kelas: string
  count: number
}

type ModePeriode = 'all' | 'yearly' | 'monthly' | 'daily'

const BATAS_AMBIL = 2000
const PER_HALAMAN = 20

const auth = useAuthStore()

const tabAktif = ref<'kunjungan' | 'sirkulasi'>('kunjungan')
const mode = ref<ModePeriode>('monthly')
const memuat = ref(false)
const galat = ref('')

const sekarang = new Date()
const tanggalDipilih = ref(sekarang.toISOString().slice(0, 10))
const bulanDipilih = ref(sekarang.getMonth() + 1)
const tahunDipilih = ref(sekarang.getFullYear())

const pinjamRows = ref<PinjamRow[]>([])
const kunjungRows = ref<KunjungRow[]>([])

const halBuku = ref(1)
const halPinjam = ref(1)
const halKunjung = ref(1)

const modeOptions: Array<{ value: ModePeriode; label: string }> = [
  { value: 'all', label: 'Sepanjang Waktu' },
  { value: 'yearly', label: 'Tahunan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'daily', label: 'Harian' },
]
const tabOptions = [
  { value: 'kunjungan', label: 'Laporan Kunjungan' },
  { value: 'sirkulasi', label: 'Laporan Sirkulasi' },
] as const

const bulanOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const tahunOptions = Array.from({ length: 5 }, (_, i) => sekarang.getFullYear() - 2 + i)

function pesanGalat(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.'
}

const rentang = computed<{ dari: string | null; sampai: string | null }>(() => {
  if (mode.value === 'monthly') {
    const b = String(bulanDipilih.value).padStart(2, '0')
    const akhir = new Date(tahunDipilih.value, bulanDipilih.value, 0).getDate()
    return {
      dari: `${tahunDipilih.value}-${b}-01`,
      sampai: `${tahunDipilih.value}-${b}-${String(akhir).padStart(2, '0')}`,
    }
  }
  if (mode.value === 'daily') return { dari: tanggalDipilih.value, sampai: tanggalDipilih.value }
  if (mode.value === 'yearly') return { dari: `${tahunDipilih.value}-01-01`, sampai: `${tahunDipilih.value}-12-31` }
  return { dari: null, sampai: null }
})

const teksPeriode = computed(() => {
  if (mode.value === 'monthly') return `Bulan ${namaBulan(bulanDipilih.value)} ${tahunDipilih.value}`
  if (mode.value === 'daily') {
    return `Tanggal ${new Date(tanggalDipilih.value + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  if (mode.value === 'yearly') return `Tahun ${tahunDipilih.value}`
  return 'Keseluruhan'
})

async function muat(): Promise<void> {
  memuat.value = true
  galat.value = ''
  try {
    const { dari, sampai } = rentang.value
    const [resPinjam, resKunjung] = await Promise.all([
      api<{ data: Array<{
        tanggalPinjam: string
        bookId: string | number
        book: { judul: string } | null
        student: { nisn: string; nama: string; kelas: string } | null
      }>; total: number }>('/perpus/peminjaman', { query: { limit: BATAS_AMBIL, page: 1 } }),
      api<{ data: Array<{
        tanggal: string
        student: { nisn: string; nama: string; kelas: string } | null
      }>; total: number }>('/perpus/kunjungan', {
        query: { dari: dari ?? undefined, sampai: sampai ?? undefined, limit: BATAS_AMBIL, page: 1 },
      }),
    ])

    let semuaPinjam: PinjamRow[] = (resPinjam.data ?? []).map((l) => ({
      tanggalPinjam: l.tanggalPinjam,
      bookId: l.bookId,
      bookJudul: l.book?.judul ?? 'Buku dihapus',
      studentNisn: l.student?.nisn ?? '-',
      studentNama: l.student?.nama ?? '-',
      studentKelas: l.student?.kelas ?? '-',
    }))
    if (dari && sampai) {
      semuaPinjam = semuaPinjam.filter((l) => l.tanggalPinjam >= dari && l.tanggalPinjam <= sampai)
    }
    pinjamRows.value = semuaPinjam

    kunjungRows.value = (resKunjung.data ?? []).map((v) => ({
      tanggal: v.tanggal,
      studentNisn: v.student?.nisn ?? '-',
      studentNama: v.student?.nama ?? '-',
      studentKelas: v.student?.kelas ?? '-',
    }))
  } catch (e) {
    galat.value = 'Gagal memuat laporan: ' + pesanGalat(e)
  } finally {
    memuat.value = false
  }
}

watch([mode, tanggalDipilih, bulanDipilih, tahunDipilih], () => {
  halBuku.value = 1
  halPinjam.value = 1
  halKunjung.value = 1
  muat()
})

// --- Agregasi sirkulasi ---
const bukuTerlaris = computed<PeringkatBuku[]>(() => {
  const hitung = new Map<string | number, { judul: string; count: number }>()
  for (const l of pinjamRows.value) {
    const ada = hitung.get(l.bookId)
    if (ada) ada.count += 1
    else hitung.set(l.bookId, { judul: l.bookJudul, count: 1 })
  }
  return [...hitung.entries()]
    .map(([id, v]) => ({ id, judul: v.judul, count: v.count }))
    .sort((a, b) => b.count - a.count)
})

const peminjamTeraktif = computed<PeringkatSiswa[]>(() => {
  const hitung = new Map<string, { nama: string; kelas: string; count: number }>()
  for (const l of pinjamRows.value) {
    const ada = hitung.get(l.studentNisn)
    if (ada) ada.count += 1
    else hitung.set(l.studentNisn, { nama: l.studentNama, kelas: l.studentKelas, count: 1 })
  }
  return [...hitung.entries()]
    .map(([nisn, v]) => ({ nisn, nama: v.nama, kelas: v.kelas, count: v.count }))
    .sort((a, b) => b.count - a.count)
})

const totalPinjamPeriode = computed(() => pinjamRows.value.length)
const totalPeminjamUnik = computed(() => new Set(pinjamRows.value.map((l) => l.studentNisn)).size)

// --- Agregasi kunjungan ---
const pengunjungTeraktif = computed<PeringkatSiswa[]>(() => {
  const hitung = new Map<string, { nama: string; kelas: string; count: number }>()
  for (const v of kunjungRows.value) {
    const ada = hitung.get(v.studentNisn)
    if (ada) ada.count += 1
    else hitung.set(v.studentNisn, { nama: v.studentNama, kelas: v.studentKelas, count: 1 })
  }
  return [...hitung.entries()]
    .map(([nisn, v]) => ({ nisn, nama: v.nama, kelas: v.kelas, count: v.count }))
    .sort((a, b) => b.count - a.count)
})

const totalKunjungPeriode = computed(() => kunjungRows.value.length)
const totalPengunjungUnik = computed(() => new Set(kunjungRows.value.map((v) => v.studentNisn)).size)

// --- Paginasi client ---
function halamanDari<T>(arr: T[], hal: number): T[] {
  const awal = (hal - 1) * PER_HALAMAN
  return arr.slice(awal, awal + PER_HALAMAN)
}
const bukuHalaman = computed(() => halamanDari(bukuTerlaris.value, halBuku.value))
const pinjamHalaman = computed(() => halamanDari(peminjamTeraktif.value, halPinjam.value))
const kunjungHalaman = computed(() => halamanDari(pengunjungTeraktif.value, halKunjung.value))

function peringkatCls(pos: number): string {
  return pos < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
}

// --- Unduhan ---
async function unduhPdfSirkulasi(): Promise<void> {
  try {
    await cetakPdfPerpus({
      topBooks: bukuTerlaris.value,
      topStudents: peminjamTeraktif.value,
      totalDipinjamBulanIni: totalPinjamPeriode.value,
      totalSiswaPeminjam: totalPeminjamUnik.value,
      periodeText: teksPeriode.value,
    })
  } catch (e) {
    galat.value = 'Gagal membuat PDF sirkulasi: ' + pesanGalat(e)
  }
}

async function unduhPdfKunjungan(): Promise<void> {
  try {
    await cetakPdfKunjungan({
      topStudents: pengunjungTeraktif.value,
      totalKunjungan: totalKunjungPeriode.value,
      totalSiswaUnik: totalPengunjungUnik.value,
      periodeText: teksPeriode.value,
    })
  } catch (e) {
    galat.value = 'Gagal membuat PDF kunjungan: ' + pesanGalat(e)
  }
}

async function unduhExcelSirkulasi(): Promise<void> {
  try {
    await exportExcelSirkulasi({
      topBooks: bukuTerlaris.value,
      topStudents: peminjamTeraktif.value,
      periodeText: teksPeriode.value,
    })
  } catch (e) {
    galat.value = 'Gagal membuat Excel sirkulasi: ' + pesanGalat(e)
  }
}

async function unduhExcelKunjungan(): Promise<void> {
  try {
    await exportExcelKunjungan({
      topStudents: pengunjungTeraktif.value,
      periodeText: teksPeriode.value,
    })
  } catch (e) {
    galat.value = 'Gagal membuat Excel kunjungan: ' + pesanGalat(e)
  }
}

onMounted(muat)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Kepala halaman -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Laporan Perpustakaan</h1>
        <p class="mt-0.5 text-sm text-slate-500">Periode: {{ teksPeriode }}</p>
      </div>
      <div v-if="auth.canPerpus" class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          @click="tabAktif === 'kunjungan' ? unduhExcelKunjungan() : unduhExcelSirkulasi()"
        >
          <FileSpreadsheet class="h-4 w-4" aria-hidden="true" />
          Excel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brandgreen px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          @click="tabAktif === 'kunjungan' ? unduhPdfKunjungan() : unduhPdfSirkulasi()"
        >
          <Download class="h-4 w-4" aria-hidden="true" />
          PDF
        </button>
      </div>
    </div>

    <div v-if="galat" class="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      <p class="flex items-start gap-2">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {{ galat }}
      </p>
      <button type="button" class="shrink-0 font-medium underline" @click="galat = ''">Tutup</button>
    </div>

    <!-- Tab jenis laporan -->
    <div class="inline-flex self-start rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Jenis laporan">
      <button
        v-for="t in tabOptions"
        :key="t.value"
        type="button"
        role="tab"
        :aria-selected="tabAktif === t.value"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        :class="tabAktif === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
        @click="tabAktif = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Filter periode -->
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="inline-flex flex-wrap rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Filter periode">
        <button
          v-for="m in modeOptions"
          :key="m.value"
          type="button"
          role="tab"
          :aria-selected="mode === m.value"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="mode === m.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="mode = m.value"
        >
          {{ m.label }}
        </button>
      </div>
      <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
        <template v-if="mode === 'monthly'">
          <select v-model.number="bulanDipilih" class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-brandgreen focus:outline-none" aria-label="Pilih bulan">
            <option v-for="b in bulanOptions" :key="b" :value="b">{{ namaBulan(b) }}</option>
          </select>
          <select v-model.number="tahunDipilih" class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:border-brandgreen focus:outline-none" aria-label="Pilih tahun">
            <option v-for="t in tahunOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </template>
        <select v-else-if="mode === 'yearly'" v-model.number="tahunDipilih" class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:border-brandgreen focus:outline-none" aria-label="Pilih tahun">
          <option v-for="t in tahunOptions" :key="t" :value="t">{{ t }}</option>
        </select>
        <input v-else-if="mode === 'daily'" v-model="tanggalDipilih" type="date" class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:border-brandgreen focus:outline-none" aria-label="Pilih tanggal" />
      </div>
    </div>

    <div v-if="memuat" class="space-y-2" aria-live="polite">
      <div v-for="i in 6" :key="i" class="h-14 animate-pulse rounded-xl bg-slate-200/70" />
    </div>

    <template v-else>
      <!-- Laporan kunjungan -->
      <template v-if="tabAktif === 'kunjungan'">
        <div class="grid grid-cols-2 gap-3">
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <Users class="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p class="text-xs text-slate-500">Total Kunjungan</p>
              <p class="font-mono text-xl font-bold text-slate-900">{{ totalKunjungPeriode }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              <UserRound class="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p class="text-xs text-slate-500">Siswa Unik</p>
              <p class="font-mono text-xl font-bold text-slate-900">{{ totalPengunjungUnik }}</p>
            </div>
          </div>
        </div>

        <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div class="border-b border-slate-200 px-4 py-3">
            <h2 class="text-sm font-bold text-slate-900">Peringkat Pengunjung Teraktif</h2>
            <p class="text-xs text-slate-500">{{ teksPeriode }}</p>
          </div>
          <div v-if="!pengunjungTeraktif.length" class="flex flex-col items-center gap-2 p-10 text-center">
            <Users class="h-10 w-10 text-slate-300" aria-hidden="true" />
            <p class="text-sm font-semibold text-slate-700">Belum ada data kunjungan</p>
            <p class="text-sm text-slate-500">Tidak ada kunjungan tercatat pada periode ini.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th class="w-20 px-4 py-2.5 text-center font-semibold">Peringkat</th>
                  <th class="px-4 py-2.5 font-semibold">Nama Siswa</th>
                  <th class="px-4 py-2.5 font-semibold">Kelas</th>
                  <th class="px-4 py-2.5 text-center font-semibold">Frekuensi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in kunjungHalaman" :key="s.nisn" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td class="px-4 py-2.5 text-center">
                    <span class="inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold" :class="peringkatCls((halKunjung - 1) * PER_HALAMAN + i)">
                      {{ (halKunjung - 1) * PER_HALAMAN + i + 1 }}
                    </span>
                  </td>
                  <td class="px-4 py-2.5 font-medium text-slate-800">{{ s.nama }}</td>
                  <td class="px-4 py-2.5 text-slate-600">{{ s.kelas }}</td>
                  <td class="px-4 py-2.5 text-center font-mono font-semibold text-emerald-700">{{ s.count }}×</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="pengunjungTeraktif.length > PER_HALAMAN" class="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
            <p class="text-xs text-slate-500">Halaman <span class="font-mono font-semibold text-slate-700">{{ halKunjung }}</span></p>
            <div class="flex gap-1">
              <button type="button" :disabled="halKunjung <= 1" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman sebelumnya" @click="halKunjung--">
                <ChevronLeft class="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" :disabled="halKunjung * PER_HALAMAN >= pengunjungTeraktif.length" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman berikutnya" @click="halKunjung++">
                <ChevronRight class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </template>

      <!-- Laporan sirkulasi -->
      <template v-else>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <BookOpen class="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p class="text-xs text-slate-500">Buku Dipinjam</p>
              <p class="font-mono text-xl font-bold text-slate-900">{{ totalPinjamPeriode }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              <UserRound class="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p class="text-xs text-slate-500">Peminjam Aktif</p>
              <p class="font-mono text-xl font-bold text-slate-900">{{ totalPeminjamUnik }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Buku Terfavorit</h2>
                <p class="text-xs text-slate-500">Paling sering dipinjam</p>
              </div>
              <Trophy class="h-5 w-5 text-amber-500" aria-hidden="true" />
            </div>
            <div v-if="!bukuTerlaris.length" class="flex flex-col items-center gap-2 p-8 text-center">
              <Library class="h-10 w-10 text-slate-300" aria-hidden="true" />
              <p class="text-sm font-semibold text-slate-700">Belum ada data</p>
              <p class="text-sm text-slate-500">Belum ada peminjaman buku pada periode ini.</p>
            </div>
            <ol v-else class="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              <li v-for="(b, i) in bukuHalaman" :key="b.id" class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-2.5">
                <div class="flex min-w-0 items-center gap-2.5">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold" :class="peringkatCls((halBuku - 1) * PER_HALAMAN + i)">
                    {{ (halBuku - 1) * PER_HALAMAN + i + 1 }}
                  </span>
                  <p class="truncate text-sm font-medium text-slate-800">{{ b.judul }}</p>
                </div>
                <span class="shrink-0 font-mono text-[13px] font-semibold text-emerald-700">{{ b.count }}×</span>
              </li>
            </ol>
            <div v-if="bukuTerlaris.length > PER_HALAMAN" class="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5">
              <p class="text-xs text-slate-500">Halaman <span class="font-mono font-semibold text-slate-700">{{ halBuku }}</span></p>
              <div class="flex gap-1">
                <button type="button" :disabled="halBuku <= 1" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman sebelumnya" @click="halBuku--">
                  <ChevronLeft class="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" :disabled="halBuku * PER_HALAMAN >= bukuTerlaris.length" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman berikutnya" @click="halBuku++">
                  <ChevronRight class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Peminjam Teraktif</h2>
                <p class="text-xs text-slate-500">Siswa paling sering meminjam</p>
              </div>
              <Medal class="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
            <div v-if="!peminjamTeraktif.length" class="flex flex-col items-center gap-2 p-8 text-center">
              <UserRound class="h-10 w-10 text-slate-300" aria-hidden="true" />
              <p class="text-sm font-semibold text-slate-700">Belum ada data</p>
              <p class="text-sm text-slate-500">Belum ada siswa meminjam pada periode ini.</p>
            </div>
            <ol v-else class="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              <li v-for="(s, i) in pinjamHalaman" :key="s.nisn" class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-2.5">
                <div class="flex min-w-0 items-center gap-2.5">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold" :class="peringkatCls((halPinjam - 1) * PER_HALAMAN + i)">
                    {{ (halPinjam - 1) * PER_HALAMAN + i + 1 }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-slate-800">{{ s.nama }}</p>
                    <p class="text-xs text-slate-400">Kelas {{ s.kelas }}</p>
                  </div>
                </div>
                <span class="shrink-0 font-mono text-[13px] font-semibold text-emerald-700">{{ s.count }} buku</span>
              </li>
            </ol>
            <div v-if="peminjamTeraktif.length > PER_HALAMAN" class="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5">
              <p class="text-xs text-slate-500">Halaman <span class="font-mono font-semibold text-slate-700">{{ halPinjam }}</span></p>
              <div class="flex gap-1">
                <button type="button" :disabled="halPinjam <= 1" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman sebelumnya" @click="halPinjam--">
                  <ChevronLeft class="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" :disabled="halPinjam * PER_HALAMAN >= peminjamTeraktif.length" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman berikutnya" @click="halPinjam++">
                  <ChevronRight class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </template>
    </template>
  </div>
</template>
