<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { CheckCircle2, Clock, CalendarDays, Users, AlertTriangle, TriangleAlert, RefreshCw, ClipboardCheck } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { Doughnut, Line } from '../../lib/charts'
import { todayISO, daysInMonth, isWeekend, namaBulan, formatTanggalPanjang } from '../../lib/dates'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface PresensiItem {
  nisn?: string
  status?: string
  tanggal?: string
}

interface Statistik {
  Hadir: number
  Izin: number
  Sakit: number
  Alfa: number
}

interface KalenderItem {
  tanggal: string
  status: string
}

interface SiswaRow {
  nisn?: string
  status?: string
}

const T = todayISO()
const now = new Date()
const WARNA = {
  Hadir: '#047857',
  Izin: '#0284c7',
  Sakit: '#d97706',
  Alfa: '#e11d48',
  line: '#047857',
  lineFill: 'rgba(4, 120, 87, 0.12)',
}

const loading = ref(true)
const loadError = ref('')
const kelas = ref(auth.isAdmin ? '' : (auth.user?.kelas || ''))
const daftarKelas = ref<string[]>([])
const presensiHariIni = ref<PresensiItem[]>([])
const statistik = ref<Statistik>({ Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 })
const kalender = ref<KalenderItem[]>([])
const totalSiswa = ref(0)
const namaWali = ref('')
const hariLiburMingguan = ref<number[]>([0])
const loadingKalender = ref(false)

watch(daftarKelas, (baru) => {
  if (!auth.isAdmin && baru.length > 0 && auth.user?.kelas) {
    kelas.value = auth.user.kelas
  }
}, { immediate: true })

const isLiburHariIni = computed(() => {
  const data = kalender.value.find((d) => d.tanggal === T)
  if (data) return data.status !== 'Masuk'
  return isWeekend(T, hariLiburMingguan.value)
})

const belumPresensi = computed(() => !isLiburHariIni.value && presensiHariIni.value.length === 0)
const presensiSudahIsi = computed(() => !isLiburHariIni.value && presensiHariIni.value.length > 0)
const totalHariIni = computed(() => statistik.value.Hadir + statistik.value.Izin + statistik.value.Sakit + statistik.value.Alfa)
const persenHadir = computed(() => totalHariIni.value > 0 ? Math.round((statistik.value.Hadir / totalHariIni.value) * 100) : 0)

const cells = computed(() => {
  const days = daysInMonth(now.getFullYear(), now.getMonth() + 1)
  const firstDow = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const blanks = Array.from({ length: firstDow }, () => null as string | null)
  return [...blanks, ...days]
})

const petaKalender = computed(() => {
  const m: Record<string, string> = {}
  for (const d of kalender.value) m[d.tanggal] = d.status
  return m
})

function statusTanggal(iso: string): 'Libur' | 'Hadir' | 'Kosong' {
  const rec = petaKalender.value[iso]
  if (rec) return rec === 'Masuk' ? 'Kosong' : 'Libur'
  return isWeekend(iso, hariLiburMingguan.value) ? 'Libur' : 'Kosong'
}

const doughnutData = computed(() => ({
  labels: ['Hadir', 'Izin', 'Sakit', 'Alfa'],
  datasets: [{
    data: [statistik.value.Hadir, statistik.value.Izin, statistik.value.Sakit, statistik.value.Alfa],
    backgroundColor: [WARNA.Hadir, WARNA.Izin, WARNA.Sakit, WARNA.Alfa],
    borderWidth: 2,
    borderColor: '#ffffff',
    hoverOffset: 4,
  }],
}))
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { position: 'bottom' as const, labels: { boxWidth: 10, boxHeight: 10, padding: 14 } },
    tooltip: { padding: 10, cornerRadius: 8 },
  },
}

const lineData = computed(() => {
  const days = daysInMonth(now.getFullYear(), now.getMonth() + 1)
  const labels = days.map((d) => d.substring(8, 10))
  const perHari = days.map((d) => {
    const s = statistikBulanan.value.get(d)
    return s ? s.Hadir + s.Izin + s.Sakit + s.Alfa : 0
  })
  return {
    labels,
    datasets: [{
      label: 'Kehadiran tercatat',
      data: perHari,
      borderColor: WARNA.line,
      backgroundColor: WARNA.lineFill,
      fill: true,
      tension: 0.35,
      pointRadius: 2.5,
      pointBackgroundColor: WARNA.line,
      borderWidth: 2,
    }],
  }
})
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { padding: 10, cornerRadius: 8 } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
}

const statistikBulanan = ref(new Map<string, Statistik>())

async function loadPengaturan() {
  try {
    const s = await api<{ daftarKelas?: string[]; namaWali?: Record<string, string>; hariLiburMingguan?: number[]; hariLibur?: number[] }>('/presensi/pengaturan')
    daftarKelas.value = s.daftarKelas || []
    hariLiburMingguan.value = s.hariLiburMingguan ?? s.hariLibur ?? [0]
    const k = kelas.value || (auth.isAdmin ? daftarKelas.value[0] : '')
    if (k && s.namaWali) namaWali.value = s.namaWali[k] || ''
  } catch {
    daftarKelas.value = []
  }
}

async function loadKalender() {
  loadingKalender.value = true
  try {
    const res = await api<{ data: KalenderItem[] }>('/presensi/kalender', {
      query: { tahun: now.getFullYear(), bulan: now.getMonth() + 1 },
    })
    kalender.value = res.data || []
  } catch {
    kalender.value = []
  } finally {
    loadingKalender.value = false
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const q: Record<string, string | number | undefined> = {}
    if (kelas.value) q.kelas = kelas.value
    const [pres, stat] = await Promise.all([
      api<{ data: PresensiItem[] }>('/presensi/presensi', { query: { ...q, tanggal: T } }),
      api<Statistik>('/presensi/statistik', { query: { ...q, dari: T, sampai: T } }),
    ])
    presensiHariIni.value = pres.data || []
    statistik.value = { Hadir: stat.Hadir || 0, Izin: stat.Izin || 0, Sakit: stat.Sakit || 0, Alfa: stat.Alfa || 0 }

    if (!kelas.value || !auth.isAdmin) {
      const s = await api<{ data: SiswaRow[]; total?: number }>('/presensi/siswa', { query: { ...q, limit: 1000, page: 1 } })
      totalSiswa.value = s.total ?? (s.data || []).length
    } else {
      totalSiswa.value = 0
    }

    const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const bul = await api<{ data: PresensiItem[] }>('/presensi/presensi', { query: { ...q, dari: first, sampai: T } })
    const map = new Map<string, Statistik>()
    for (const p of bul.data || []) {
      const tgl = (p.tanggal || '').substring(0, 10)
      if (!tgl) continue
      let e = map.get(tgl)
      if (!e) { e = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }; map.set(tgl, e) }
      const st = (p.status || '') as keyof Statistik
      if (st === 'Hadir' || st === 'Izin' || st === 'Sakit' || st === 'Alfa') e[st]++
    }
    statistikBulanan.value = map
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

watch(kelas, () => { void load() })

onMounted(async () => {
  await loadPengaturan()
  if (!kelas.value && auth.isAdmin && daftarKelas.value.length > 0) kelas.value = daftarKelas.value[0]
  await Promise.all([loadKalender(), load()])
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Dashboard</h1>
        <p class="mt-0.5 text-sm text-slate-500">Selamat datang, {{ auth.user?.nama || 'Pengguna' }} — {{ formatTanggalPanjang(T) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <label v-if="auth.isAdmin" for="filter-kelas" class="text-xs font-semibold text-slate-500">Kelas</label>
        <select
          v-if="auth.isAdmin"
          id="filter-kelas"
          v-model="kelas"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        >
          <option value="">Semua Kelas</option>
          <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
        </select>
        <span v-else class="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
          Kelas {{ kelas || '—' }}
        </span>
        <button
          type="button"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          @click="load"
        >
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" aria-hidden="true" />
          Muat ulang
        </button>
      </div>
    </div>

    <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="flex-1">{{ loadError }}</div>
      <button type="button" class="font-semibold underline" @click="load()">Coba lagi</button>
    </div>

    <!-- Banner peringatan -->
    <div v-if="!loading && !loadError && belumPresensi" class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" role="alert">
      <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
      <div class="flex-1">
        <p class="text-sm font-semibold text-amber-900">Presensi hari ini belum diisi</p>
        <p class="mt-0.5 text-[13px] text-amber-700">Segera isi presensi hari ini agar data kehadiran tercatat.</p>
      </div>
      <RouterLink v-if="auth.canPresensi" to="/presensi/input" class="shrink-0 rounded-lg bg-brandgreen px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">
        Isi Presensi
      </RouterLink>
    </div>
    <div v-if="!loading && !loadError && presensiSudahIsi" class="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3" role="status">
      <CheckCircle2 class="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
      <p class="text-sm font-medium text-emerald-900">Presensi hari ini sudah diisi ({{ presensiHariIni.length }} siswa).</p>
    </div>
    <div v-if="!loading && !loadError && isLiburHariIni" class="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3" role="status">
      <CalendarDays class="h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
      <p class="text-sm font-medium text-sky-900">Hari ini libur — tidak ada kegiatan presensi.</p>
    </div>

    <!-- Kartu ringkas -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-if="loading" v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />
      <template v-else>
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ClipboardCheck class="h-4 w-4 text-emerald-700" aria-hidden="true" /> Hadir
          </div>
          <p class="mt-1 font-mono text-2xl font-bold text-emerald-700">{{ statistik.Hadir }}</p>
          <p class="text-xs text-slate-400">{{ persenHadir }}% dari yang tercatat</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Clock class="h-4 w-4 text-sky-600" aria-hidden="true" /> Izin
          </div>
          <p class="mt-1 font-mono text-2xl font-bold text-sky-700">{{ statistik.Izin }}</p>
          <p class="text-xs text-slate-400">Izin hari ini</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <AlertTriangle class="h-4 w-4 text-amber-600" aria-hidden="true" /> Sakit / Alfa
          </div>
          <p class="mt-1 font-mono text-2xl font-bold text-amber-700">{{ statistik.Sakit + statistik.Alfa }}</p>
          <p class="text-xs text-slate-400">{{ statistik.Sakit }} sakit · {{ statistik.Alfa }} alfa</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Users class="h-4 w-4 text-slate-500" aria-hidden="true" /> Total Siswa
          </div>
          <p class="mt-1 font-mono text-2xl font-bold text-slate-800">{{ totalSiswa || '—' }}</p>
          <p class="text-xs text-slate-400">{{ namaWali ? `Wali: ${namaWali}` : 'Data siswa' }}</p>
        </div>
      </template>
    </div>

    <!-- Grafik -->
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
        <h2 class="text-[15px] font-bold text-slate-900">Tren Kehadiran — {{ namaBulan(now.getMonth() + 1) }} {{ now.getFullYear() }}</h2>
        <p class="mb-2 text-xs text-slate-500">Catatan kehadiran per tanggal bulan berjalan</p>
        <div v-if="loading" class="h-[clamp(220px,32vh,320px)] animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />
        <div v-else class="h-[clamp(220px,32vh,320px)]" role="img" aria-label="Grafik tren kehadiran bulan berjalan">
          <Line :data="lineData" :options="lineOptions" />
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <h2 class="text-[15px] font-bold text-slate-900">Komposisi Hari Ini</h2>
        <p class="mb-2 text-xs text-slate-500">{{ totalHariIni }} catatan presensi</p>
        <div v-if="loading" class="h-[clamp(220px,32vh,320px)] animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />
        <div v-else-if="totalHariIni === 0" class="flex h-[clamp(220px,32vh,320px)] flex-col items-center justify-center gap-1.5 text-center">
          <ClipboardCheck class="h-8 w-8 text-slate-200" aria-hidden="true" />
          <p class="text-sm text-slate-400">Belum ada presensi hari ini</p>
        </div>
        <div v-else class="h-[clamp(220px,32vh,320px)]" role="img" aria-label="Grafik komposisi status presensi hari ini">
          <Doughnut :data="doughnutData" :options="doughnutOptions" />
        </div>
      </div>
    </div>

    <!-- Kalender mini -->
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="text-[15px] font-bold text-slate-900">Kalender {{ namaBulan(now.getMonth() + 1) }} {{ now.getFullYear() }}</h2>
      <p class="mb-2 text-xs text-slate-500">Tanggal libur &amp; masuk — dikelola Admin di menu Kalender</p>
      <div class="grid max-w-md grid-cols-7 gap-1 text-center">
        <div v-for="h in ['Min','Sen','Sel','Rab','Kam','Jum','Sab']" :key="h" class="py-1 text-xs font-medium text-slate-400">{{ h }}</div>
        <template v-for="(iso, i) in cells" :key="i">
          <div v-if="!iso" aria-hidden="true" />
          <div
            v-else
            class="flex aspect-square min-h-[36px] items-center justify-center rounded-lg text-xs"
            :class="{
              'bg-emerald-600 font-bold text-white ring-2 ring-emerald-300': iso === T,
              'bg-rose-50 font-semibold text-rose-600 ring-1 ring-rose-200': iso !== T && statusTanggal(iso) === 'Libur',
              'text-slate-600 hover:bg-slate-50': iso !== T && statusTanggal(iso) === 'Kosong',
            }"
          >
            <span class="font-mono">{{ Number(iso.slice(8, 10)) }}</span>
          </div>
        </template>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-emerald-600" aria-hidden="true" /> Hari ini</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-200" aria-hidden="true" /> Libur</span>
        <span v-if="loadingKalender" class="italic text-slate-400">Memuat kalender…</span>
      </div>
    </div>
  </div>
</template>
