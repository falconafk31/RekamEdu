<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Component } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { Line, Doughnut } from '../../lib/charts'
import type { ChartData, ChartOptions } from 'chart.js'
import {
  Book,
  Library,
  BookOpen,
  TriangleAlert,
  Users,
  CalendarDays,
  ArrowRight,
  UsersRound,
  FileSpreadsheet,
  IdCard,
  RotateCw,
} from 'lucide-vue-next'

interface BukuTerlaris {
  bookId: string | number
  judul: string
  jumlahPinjam: number
}

interface DashboardPerpus {
  totalJudul: number
  totalEksemplar: number
  dipinjamAktif: number
  terlambat: number
  kunjunganHariIni: number
  kunjunganBulanIni: number
  bukuTerlaris: BukuTerlaris[]
}

interface StatItem {
  label: string
  value: number
  sub: string
  icon: Component
  tone: string
}

const auth = useAuthStore()

const dash = ref<DashboardPerpus | null>(null)
const memuat = ref(false)
const galat = ref('')

function pesanGalat(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.'
}

const chipTone: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const statistik = computed<StatItem[]>(() => [
  { label: 'Total Judul', value: dash.value?.totalJudul ?? 0, sub: 'koleksi', icon: Book, tone: 'emerald' },
  { label: 'Total Eksemplar', value: dash.value?.totalEksemplar ?? 0, sub: 'buku fisik', icon: Library, tone: 'slate' },
  { label: 'Sedang Dipinjam', value: dash.value?.dipinjamAktif ?? 0, sub: 'aktif', icon: BookOpen, tone: 'sky' },
  { label: 'Terlambat', value: dash.value?.terlambat ?? 0, sub: 'perlu ditagih', icon: TriangleAlert, tone: 'rose' },
  { label: 'Kunjungan Hari Ini', value: dash.value?.kunjunganHariIni ?? 0, sub: 'orang', icon: Users, tone: 'emerald' },
  { label: 'Kunjungan Bulan Ini', value: dash.value?.kunjunganBulanIni ?? 0, sub: 'orang', icon: CalendarDays, tone: 'amber' },
])

const aksiCepat = [
  { label: 'Sirkulasi', desc: 'Pinjam & kembali', icon: BookOpen, to: '/perpus/peminjaman' },
  { label: 'Data Koleksi', desc: 'Kelola buku', icon: Book, to: '/perpus/buku' },
  { label: 'Pengunjung', desc: 'Catat kunjungan', icon: UsersRound, to: '/perpus/kunjungan' },
  { label: 'Kartu Anggota', desc: 'Cetak kartu', icon: IdCard, to: '/perpus/kartu' },
  { label: 'Laporan', desc: 'Statistik & cetak', icon: FileSpreadsheet, to: '/perpus/rekap' },
]

const bukuTerlarisTop = computed(() => (dash.value?.bukuTerlaris ?? []).slice(0, 10))

const dataKomposisi = computed<ChartData<'doughnut'>>(() => {
  const dipinjam = dash.value?.dipinjamAktif ?? 0
  const tersedia = Math.max(0, (dash.value?.totalEksemplar ?? 0) - dipinjam)
  return {
    labels: ['Sedang dipinjam', 'Tersedia di rak'],
    datasets: [
      {
        data: [dipinjam, tersedia],
        backgroundColor: ['#0ea5e9', '#e2e8f0'],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  }
})

const dataTerlaris = computed<ChartData<'line'>>(() => ({
  labels: bukuTerlarisTop.value.map((b) => b.judul),
  datasets: [
    {
      label: 'Kali dipinjam',
      data: bukuTerlarisTop.value.map((b) => b.jumlahPinjam),
      borderColor: '#047857',
      backgroundColor: 'rgba(4, 120, 87, 0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: '#047857',
    },
  ],
}))

const opsiGaris: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { padding: 10, cornerRadius: 8 },
  },
  scales: {
    x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } },
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
  },
}

const opsiDonat: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, padding: 14 } },
    tooltip: { padding: 10, cornerRadius: 8 },
  },
}

async function muat(): Promise<void> {
  memuat.value = true
  galat.value = ''
  try {
    dash.value = await api<DashboardPerpus>('/perpus/dashboard')
  } catch (e) {
    galat.value = 'Gagal memuat dasbor perpustakaan: ' + pesanGalat(e)
  } finally {
    memuat.value = false
  }
}

onMounted(muat)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Kepala halaman -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Beranda Perpustakaan</h1>
        <p class="mt-0.5 text-sm text-slate-500">Sirkulasi koleksi dan kunjungan pengunjung</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="memuat"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          @click="muat"
        >
          <RotateCw class="h-4 w-4" :class="memuat ? 'animate-spin' : ''" aria-hidden="true" />
          {{ memuat ? 'Memuat…' : 'Muat ulang' }}
        </button>
        <RouterLink
          to="/perpus/peminjaman"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brandgreen px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          <BookOpen class="h-4 w-4" aria-hidden="true" />
          Sirkulasi
        </RouterLink>
      </div>
    </div>

    <p v-if="!auth.canPerpus" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
      Akun Anda tidak memiliki akses modul perpustakaan.
    </p>

    <div v-if="galat" class="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      <p class="flex items-start gap-2">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {{ galat }}
      </p>
      <button type="button" class="shrink-0 font-medium underline" @click="galat = ''">Tutup</button>
    </div>

    <!-- Kartu statistik -->
    <section aria-label="Ringkasan perpustakaan">
      <div v-if="memuat && !dash" class="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div v-for="i in 6" :key="i" class="h-20 animate-pulse rounded-xl bg-slate-200/70" />
      </div>
      <div v-else class="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div
          v-for="st in statistik"
          :key="st.label"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1" :class="chipTone[st.tone]">
            <component :is="st.icon" class="h-5 w-5" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-xs text-slate-500">{{ st.label }}</p>
            <p class="font-mono text-xl font-bold text-slate-900">{{ st.value }}</p>
          </div>
          <span class="ml-auto hidden shrink-0 text-xs text-slate-400 xl:block">{{ st.sub }}</span>
        </div>
      </div>
    </section>

    <!-- Aksi cepat -->
    <section aria-label="Aksi cepat perpustakaan">
      <div class="flex flex-wrap gap-2">
        <RouterLink
          v-for="a in aksiCepat"
          :key="a.label"
          :to="a.to"
          class="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <component :is="a.icon" class="h-4 w-4 text-slate-400 transition-colors group-hover:text-emerald-700" aria-hidden="true" />
          <span class="whitespace-nowrap">{{ a.label }}</span>
          <ArrowRight class="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" aria-hidden="true" />
        </RouterLink>
      </div>
    </section>

    <!-- Grafik -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-4" aria-label="Grafik komposisi koleksi">
        <h2 class="text-sm font-bold text-slate-900">Komposisi Koleksi</h2>
        <p class="text-xs text-slate-500">Eksemplar dipinjam vs tersedia di rak</p>
        <div class="relative mt-2 h-56">
          <Doughnut :data="dataKomposisi" :options="opsiDonat" />
        </div>
      </section>
      <section class="rounded-xl border border-slate-200 bg-white p-4" aria-label="Grafik buku terlaris">
        <h2 class="text-sm font-bold text-slate-900">Buku Terlaris</h2>
        <p class="text-xs text-slate-500">10 judul paling sering dipinjam</p>
        <div class="relative mt-2 h-56">
          <Line v-if="bukuTerlarisTop.length > 0" :data="dataTerlaris" :options="opsiGaris" />
          <p v-else class="flex h-full items-center justify-center text-sm text-slate-400">
            {{ memuat ? 'Memuat…' : 'Belum ada data peminjaman.' }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
