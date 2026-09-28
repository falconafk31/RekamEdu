<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { cetakPdfSirkulasi } from '../../lib/pdf'
import type { Peminjaman as PeminjamanPdf } from '../../types'
import {
  Plus,
  Search,
  X,
  Download,
  BookOpen,
  Undo2,
  TriangleAlert,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'

type StatusPinjam = 'dipinjam' | 'dikembalikan' | 'terlambat' | 'hilang'

interface Peminjaman {
  id: string | number
  bookId: string | number
  studentId: string | number
  tanggalPinjam: string
  tanggalKembaliSeharusnya: string
  tanggalKembaliAktual: string | null
  status: StatusPinjam
  isTerlambat: boolean
  book: { id: string | number; judul: string }
  student: { id: string | number; nama: string; nisn: string; kelas: string }
}

interface PeminjamanPage {
  data: Peminjaman[]
  total: number
}

interface SiswaOpt {
  id: string | number
  nisn: string
  nama: string
  kelas: string
}

interface BukuOpt {
  id: string | number
  judul: string
  stok: number
}

const LIMIT = 20

const auth = useAuthStore()

const daftar = ref<Peminjaman[]>([])
const total = ref(0)
const memuat = ref(false)
const galat = ref('')
const sukses = ref('')

const tabStatus = ref<'dipinjam' | 'terlambat' | 'semua'>('dipinjam')
const q = ref('')
const halaman = ref(1)

const tabs = [
  { value: 'dipinjam', label: 'Sedang Dipinjam' },
  { value: 'terlambat', label: 'Terlambat' },
  { value: 'semua', label: 'Semua Riwayat' },
] as const

// --- Form peminjaman baru ---
const tampilPinjam = ref(false)
const menyimpan = ref(false)
const studentId = ref<string | number | ''>('')
const bookId = ref<string | number | ''>('')
const cariSiswa = ref('')
const cariBuku = ref('')
const hasilSiswa = ref<SiswaOpt[]>([])
const hasilBuku = ref<BukuOpt[]>([])
const mencariSiswa = ref(false)
const mencariBuku = ref(false)
const bukuTerpilih = ref<BukuOpt | null>(null)
const tglKembali = ref('')

let timerSiswa: ReturnType<typeof setTimeout> | null = null
let timerBuku: ReturnType<typeof setTimeout> | null = null
let timerCari: ReturnType<typeof setTimeout> | null = null

// --- Konfirmasi kembali / hilang ---
const tampilKembali = ref(false)
const tampilHilang = ref(false)
const targetPinjam = ref<Peminjaman | null>(null)
const memproses = ref(false)

function pesanGalat(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.'
}

function statusSiswa403(e: unknown): boolean {
  if (e instanceof ApiError) {
    const status = (e as unknown as { status?: number }).status
    return status === 403 || /403/.test(e.message)
  }
  return false
}

function formatTanggal(iso: string | null): string {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function tujuhHariLagi(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

const totalHalaman = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)))
const jumlahTerlambat = computed(() => daftar.value.filter((l) => l.isTerlambat && l.status === 'dipinjam').length)

async function muat(): Promise<void> {
  memuat.value = true
  galat.value = ''
  try {
    const res = await api<PeminjamanPage>('/perpus/peminjaman', {
      query: {
        status: tabStatus.value === 'semua' ? undefined : tabStatus.value,
        q: q.value.trim() || undefined,
        page: halaman.value,
        limit: LIMIT,
      },
    })
    daftar.value = res.data
    total.value = res.total
  } catch (e) {
    galat.value = 'Gagal memuat data sirkulasi: ' + pesanGalat(e)
  } finally {
    memuat.value = false
  }
}

watch([tabStatus, q], () => {
  if (timerCari) clearTimeout(timerCari)
  timerCari = setTimeout(() => {
    halaman.value = 1
    muat()
  }, 400)
})

function gantiHalaman(arah: number): void {
  const baru = halaman.value + arah
  if (baru >= 1 && baru <= totalHalaman.value) {
    halaman.value = baru
    muat()
  }
}

function labelStatus(l: Peminjaman): string {
  if (l.status === 'dikembalikan') return 'Dikembalikan'
  if (l.status === 'hilang') return 'Hilang'
  if (l.status === 'terlambat' || l.isTerlambat) return 'Terlambat'
  return 'Dipinjam'
}

function toneStatus(l: Peminjaman): string {
  if (l.status === 'dikembalikan') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (l.status === 'hilang') return 'bg-slate-100 text-slate-600 ring-slate-300'
  if (l.status === 'terlambat' || l.isTerlambat) return 'bg-rose-50 text-rose-700 ring-rose-200'
  return 'bg-sky-50 text-sky-700 ring-sky-200'
}

// --- Pencarian siswa & buku ---
watch(cariSiswa, (baru) => {
  if (timerSiswa) clearTimeout(timerSiswa)
  if (!baru.trim() || studentId.value !== '') {
    hasilSiswa.value = []
    return
  }
  timerSiswa = setTimeout(async () => {
    mencariSiswa.value = true
    try {
      const res = await api<{ data: SiswaOpt[]; total: number }>('/presensi/siswa', {
        query: { q: baru.trim(), limit: 5 },
      })
      hasilSiswa.value = res.data
    } catch (e) {
      galat.value = statusSiswa403(e)
        ? 'Akses data siswa ditolak (403). Akun pustakawan membutuhkan izin baca data siswa dari backend.'
        : 'Gagal mencari siswa: ' + pesanGalat(e)
      hasilSiswa.value = []
    } finally {
      mencariSiswa.value = false
    }
  }, 400)
})

watch(cariBuku, (baru) => {
  if (timerBuku) clearTimeout(timerBuku)
  if (!baru.trim() || bookId.value !== '') {
    hasilBuku.value = []
    return
  }
  timerBuku = setTimeout(async () => {
    mencariBuku.value = true
    try {
      const res = await api<{ data: BukuOpt[]; total: number }>('/perpus/buku', {
        query: { q: baru.trim(), limit: 5 },
      })
      hasilBuku.value = res.data
    } catch (e) {
      galat.value = 'Gagal mencari buku: ' + pesanGalat(e)
      hasilBuku.value = []
    } finally {
      mencariBuku.value = false
    }
  }, 400)
})

function pilihSiswa(s: SiswaOpt): void {
  studentId.value = s.id
  cariSiswa.value = `${s.nama} (Kelas ${s.kelas})`
  hasilSiswa.value = []
}

function pilihBuku(b: BukuOpt): void {
  bookId.value = b.id
  bukuTerpilih.value = b
  cariBuku.value = b.judul
  hasilBuku.value = []
}

function resetFormPinjam(): void {
  studentId.value = ''
  bookId.value = ''
  cariSiswa.value = ''
  cariBuku.value = ''
  hasilSiswa.value = []
  hasilBuku.value = []
  bukuTerpilih.value = null
  tglKembali.value = tujuhHariLagi()
}

function bukaPinjam(): void {
  resetFormPinjam()
  tampilPinjam.value = true
}

async function simpanPinjam(): Promise<void> {
  if (studentId.value === '' || bookId.value === '') {
    galat.value = 'Pilih siswa dan buku terlebih dahulu.'
    return
  }
  if (!tglKembali.value) {
    galat.value = 'Tanggal kembali harus diisi.'
    return
  }
  menyimpan.value = true
  galat.value = ''
  sukses.value = ''
  try {
    await api('/perpus/peminjaman', {
      method: 'POST',
      body: { bookId: bookId.value, studentId: studentId.value, tanggalKembaliSeharusnya: tglKembali.value },
    })
    sukses.value = 'Peminjaman berhasil dicatat.'
    tampilPinjam.value = false
    resetFormPinjam()
    halaman.value = 1
    await muat()
  } catch (e) {
    galat.value = 'Gagal mencatat peminjaman: ' + pesanGalat(e)
  } finally {
    menyimpan.value = false
  }
}

// --- Kembali & hilang ---
function konfirmasiKembali(l: Peminjaman): void {
  targetPinjam.value = l
  tampilKembali.value = true
}

function konfirmasiHilang(l: Peminjaman): void {
  targetPinjam.value = l
  tampilHilang.value = true
}

async function prosesKembali(): Promise<void> {
  if (!targetPinjam.value) return
  memproses.value = true
  galat.value = ''
  sukses.value = ''
  try {
    await api('/perpus/peminjaman/' + targetPinjam.value.id + '/kembali', { method: 'POST', body: {} })
    sukses.value = 'Buku berhasil dikembalikan.'
    tampilKembali.value = false
    targetPinjam.value = null
    await muat()
  } catch (e) {
    galat.value = 'Gagal memproses pengembalian: ' + pesanGalat(e)
  } finally {
    memproses.value = false
  }
}

async function prosesHilang(): Promise<void> {
  if (!targetPinjam.value) return
  memproses.value = true
  galat.value = ''
  sukses.value = ''
  try {
    await api('/perpus/peminjaman/' + targetPinjam.value.id + '/hilang', { method: 'POST', body: {} })
    sukses.value = 'Buku ditandai hilang.'
    tampilHilang.value = false
    targetPinjam.value = null
    await muat()
  } catch (e) {
    galat.value = 'Gagal menandai hilang: ' + pesanGalat(e)
  } finally {
    memproses.value = false
  }
}

async function unduhPdf(): Promise<void> {
  try {
    const loans: PeminjamanPdf[] = daftar.value.map((l) => ({
      id: String(l.id),
      tanggalPinjam: l.tanggalPinjam,
      tanggalKembaliSeharusnya: l.tanggalKembaliSeharusnya,
      tanggalKembaliAktual: l.tanggalKembaliAktual,
      status: l.status === 'hilang' ? 'dipinjam' : l.status,
      siswa: { nama: l.student.nama, kelas: l.student.kelas },
      buku: { judul: l.book.judul },
    }))
    await cetakPdfSirkulasi({
      loans,
      title: tabStatus.value === 'dipinjam' ? 'Laporan Buku Sedang Dipinjam' : 'Laporan Riwayat Sirkulasi',
    })
  } catch (e) {
    galat.value = 'Gagal membuat PDF: ' + pesanGalat(e)
  }
}

onMounted(muat)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Kepala halaman -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Sirkulasi</h1>
        <p class="mt-0.5 text-sm text-slate-500">
          <span class="font-mono font-semibold text-slate-700">{{ total }}</span> transaksi
        </p>
      </div>
      <div v-if="auth.canPerpus" class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          @click="unduhPdf"
        >
          <Download class="h-4 w-4" aria-hidden="true" />
          PDF
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brandgreen px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          @click="bukaPinjam"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          Pinjam Baru
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
    <div v-if="sukses" class="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
      <p class="flex items-start gap-2">
        <Check class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {{ sukses }}
      </p>
      <button type="button" class="shrink-0 font-medium underline" @click="sukses = ''">Tutup</button>
    </div>

    <!-- Filter -->
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <div class="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Filter status sirkulasi">
          <button
            v-for="t in tabs"
            :key="t.value"
            type="button"
            role="tab"
            :aria-selected="tabStatus === t.value"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="tabStatus === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            @click="tabStatus = t.value"
          >
            {{ t.label }}
          </button>
        </div>
        <span v-if="jumlahTerlambat > 0" class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
          {{ jumlahTerlambat }} terlambat
        </span>
      </div>
      <div class="relative">
        <label for="cari-sirkulasi" class="sr-only">Cari transaksi</label>
        <input
          id="cari-sirkulasi"
          v-model="q"
          type="text"
          placeholder="Cari nama peminjam / judul buku…"
          class="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30"
        />
        <Search class="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
        <button v-if="q" type="button" class="absolute bottom-2 right-2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Hapus pencarian" @click="q = ''">
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Tabel -->
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div v-if="memuat" class="space-y-2 p-4" aria-live="polite">
        <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div v-else-if="!daftar.length" class="flex flex-col items-center gap-2 p-10 text-center">
        <BookOpen class="h-10 w-10 text-slate-300" aria-hidden="true" />
        <p class="text-sm font-semibold text-slate-700">Tidak ada data sirkulasi</p>
        <p class="text-sm text-slate-500">Belum ada transaksi pada filter ini.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th class="px-4 py-2.5 font-semibold">Peminjam</th>
              <th class="px-4 py-2.5 font-semibold">Buku</th>
              <th class="px-4 py-2.5 font-semibold">Tgl Pinjam</th>
              <th class="px-4 py-2.5 font-semibold">Batas Kembali</th>
              <th class="px-4 py-2.5 text-center font-semibold">Status</th>
              <th class="px-4 py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="l in daftar"
              :key="l.id"
              class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
              :class="l.isTerlambat && l.status === 'dipinjam' ? 'bg-rose-50/50' : ''"
            >
              <td class="px-4 py-2.5">
                <p class="font-medium text-slate-800">{{ l.student.nama }}</p>
                <p class="font-mono text-xs text-slate-400">{{ l.student.nisn }} · Kelas {{ l.student.kelas }}</p>
              </td>
              <td class="max-w-[220px] truncate px-4 py-2.5 text-slate-700">{{ l.book.judul }}</td>
              <td class="px-4 py-2.5 font-mono text-[13px] text-slate-500">{{ formatTanggal(l.tanggalPinjam) }}</td>
              <td class="px-4 py-2.5">
                <span class="font-mono text-[13px]" :class="l.isTerlambat && l.status === 'dipinjam' ? 'font-semibold text-rose-600' : 'text-slate-600'">
                  {{ formatTanggal(l.tanggalKembaliSeharusnya) }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-center">
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1" :class="toneStatus(l)">
                  {{ labelStatus(l) }}
                </span>
              </td>
              <td class="px-4 py-2.5">
                <div v-if="auth.canPerpus && (l.status === 'dipinjam' || l.status === 'terlambat')" class="flex justify-end gap-1.5">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-lg bg-brandgreen px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                    @click="konfirmasiKembali(l)"
                  >
                    <Undo2 class="h-3.5 w-3.5" aria-hidden="true" />
                    Kembalikan
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                    @click="konfirmasiHilang(l)"
                  >
                    Hilang
                  </button>
                </div>
                <span v-else class="block text-right text-slate-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalHalaman > 1" class="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
        <p class="text-xs text-slate-500">
          Halaman <span class="font-mono font-semibold text-slate-700">{{ halaman }}</span> dari
          <span class="font-mono font-semibold text-slate-700">{{ totalHalaman }}</span>
        </p>
        <div class="flex gap-1">
          <button type="button" :disabled="halaman <= 1" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman sebelumnya" @click="gantiHalaman(-1)">
            <ChevronLeft class="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" :disabled="halaman >= totalHalaman" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman berikutnya" @click="gantiHalaman(1)">
            <ChevronRight class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal pinjam baru -->
    <div v-if="tampilPinjam" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50" @click="tampilPinjam = false" />
      <div class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Catat peminjaman baru">
        <h2 class="text-base font-bold text-slate-900">Catat Peminjaman Baru</h2>
        <p class="mb-4 text-xs text-slate-500">Pilih siswa, buku, lalu tentukan batas kembali</p>
        <div class="flex flex-col gap-4">
          <div class="relative">
            <label for="pinjam-siswa" class="mb-1 block text-xs font-semibold text-slate-600">1 · Siswa peminjam</label>
            <div class="relative">
              <input
                id="pinjam-siswa"
                v-model="cariSiswa"
                type="text"
                placeholder="Ketik nama atau NISN…"
                autocomplete="off"
                class="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30"
                @input="studentId = ''"
              />
              <Search class="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <button v-if="studentId !== ''" type="button" class="absolute bottom-2 right-2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Hapus siswa terpilih" @click="studentId = ''; cariSiswa = ''">
                <X class="h-4 w-4" />
              </button>
            </div>
            <p v-if="mencariSiswa" class="mt-1 text-xs text-slate-400">Mencari…</p>
            <ul v-if="cariSiswa && studentId === '' && hasilSiswa.length" class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg" role="listbox">
              <li v-for="s in hasilSiswa" :key="s.id">
                <button type="button" class="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-slate-50" role="option" @click="pilihSiswa(s)">
                  <span class="text-sm font-medium text-slate-800">{{ s.nama }}</span>
                  <span class="font-mono text-xs text-slate-400">Kelas {{ s.kelas }} · {{ s.nisn }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div class="relative">
            <label for="pinjam-buku" class="mb-1 block text-xs font-semibold text-slate-600">2 · Buku yang dipinjam</label>
            <div class="relative">
              <input
                id="pinjam-buku"
                v-model="cariBuku"
                type="text"
                placeholder="Ketik judul buku…"
                autocomplete="off"
                class="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30"
                @input="bookId = ''; bukuTerpilih = null"
              />
              <Search class="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <button v-if="bookId !== ''" type="button" class="absolute bottom-2 right-2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Hapus buku terpilih" @click="bookId = ''; cariBuku = ''; bukuTerpilih = null">
                <X class="h-4 w-4" />
              </button>
            </div>
            <p v-if="mencariBuku" class="mt-1 text-xs text-slate-400">Mencari…</p>
            <ul v-if="cariBuku && bookId === '' && hasilBuku.length" class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg" role="listbox">
              <li v-for="b in hasilBuku" :key="b.id">
                <button type="button" class="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-slate-50" role="option" @click="pilihBuku(b)">
                  <span class="text-sm font-medium text-slate-800">{{ b.judul }}</span>
                  <span class="font-mono text-xs font-semibold" :class="b.stok > 0 ? 'text-emerald-600' : 'text-rose-600'">Stok {{ b.stok }}</span>
                </button>
              </li>
            </ul>
            <p v-if="bukuTerpilih && bukuTerpilih.stok < 1" class="mt-1 text-xs font-medium text-rose-600">Stok buku ini habis.</p>
          </div>

          <div>
            <label for="pinjam-tgl-kembali" class="mb-1 block text-xs font-semibold text-slate-600">3 · Batas tanggal kembali</label>
            <input
              id="pinjam-tgl-kembali"
              v-model="tglKembali"
              type="date"
              class="block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30"
            />
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="tampilPinjam = false; resetFormPinjam()">Batal</button>
          <button
            type="button"
            :disabled="menyimpan || studentId === '' || bookId === ''"
            class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            @click="simpanPinjam"
          >
            {{ menyimpan ? 'Memproses…' : 'Pinjamkan Buku' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Konfirmasi kembali -->
    <div v-if="tampilKembali" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50" @click="tampilKembali = false" />
      <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true" aria-label="Konfirmasi pengembalian">
        <h2 class="text-base font-bold text-slate-900">Konfirmasi Pengembalian</h2>
        <p v-if="targetPinjam" class="mt-2 text-sm text-slate-600">
          Terima buku <strong>{{ targetPinjam.book.judul }}</strong> yang dikembalikan oleh
          <strong>{{ targetPinjam.student.nama }}</strong> (Kelas {{ targetPinjam.student.kelas }})?
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="tampilKembali = false">Batal</button>
          <button type="button" :disabled="memproses" class="inline-flex items-center gap-1.5 rounded-lg bg-brandgreen px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50" @click="prosesKembali">
            <Undo2 class="h-4 w-4" aria-hidden="true" />
            {{ memproses ? 'Memproses…' : 'Ya, Terima Buku' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Konfirmasi hilang -->
    <div v-if="tampilHilang" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50" @click="tampilHilang = false" />
      <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true" aria-label="Konfirmasi buku hilang">
        <h2 class="text-base font-bold text-slate-900">Tandai Buku Hilang?</h2>
        <p v-if="targetPinjam" class="mt-2 text-sm text-slate-600">
          Buku <strong>{{ targetPinjam.book.judul }}</strong> yang dipinjam
          <strong>{{ targetPinjam.student.nama }}</strong> akan ditandai <strong>hilang</strong>.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="tampilHilang = false">Batal</button>
          <button type="button" :disabled="memproses" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50" @click="prosesHilang">
            {{ memproses ? 'Memproses…' : 'Ya, Tandai Hilang' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
