<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { TriangleAlert, RefreshCw, ChartColumn } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { Doughnut, Line } from '../../lib/charts'
import { todayISO, formatTanggalPanjang } from '../../lib/dates'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface HarianStat {
  tanggal?: string
  date?: string
  Hadir?: number
  hadir?: number
  Izin?: number
  izin?: number
  Sakit?: number
  sakit?: number
  Alfa?: number
  alfa?: number
}

interface PerKelasStat {
  kelas?: string
  Hadir?: number
  hadir?: number
  Izin?: number
  izin?: number
  Sakit?: number
  sakit?: number
  Alfa?: number
  alfa?: number
  total?: number
}

interface StatistikResp {
  total: { Hadir: number; Izin: number; Sakit: number; Alfa: number }
  harian: HarianStat[]
  perKelas: PerKelasStat[]
}

const WARNA = {
  Hadir: '#047857',
  Izin: '#0284c7',
  Sakit: '#d97706',
  Alfa: '#e11d48',
  line: '#047857',
  lineFill: 'rgba(4, 120, 87, 0.12)',
}

const now = new Date()
const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

const daftarKelas = ref<string[]>([])
const filterKelas = ref(auth.isAdmin ? '' : (auth.user?.kelas || ''))
const dari = ref(firstOfMonth)
const sampai = ref(todayISO())
const threshold = ref(90)

const total = ref({ Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 })
const harian = ref<HarianStat[]>([])
const perKelas = ref<PerKelasStat[]>([])
const loading = ref(false)
const loadError = ref('')

watch(filterKelas, (baru) => {
  if (!auth.isAdmin && auth.user?.kelas && baru !== auth.user.kelas) filterKelas.value = auth.user.kelas
})

function n(v: number | undefined): number {
  return v ?? 0
}
function tanggalOf(h: HarianStat): string {
  return h.tanggal || h.date || ''
}

const barisKelas = computed(() => {
  return perKelas.value.map((k) => {
    const H = n(k.Hadir ?? k.hadir)
    const I = n(k.Izin ?? k.izin)
    const S = n(k.Sakit ?? k.sakit)
    const A = n(k.Alfa ?? k.alfa)
    const t = k.total ?? (H + I + S + A)
    const persen = t > 0 ? Math.round(((t - A) / t) * 100) : 0
    return { kelas: k.kelas || '—', H, I, S, A, total: t, persen }
  }).sort((a, b) => {
    if (a.persen !== b.persen) return a.persen - b.persen
    return a.kelas.localeCompare(b.kelas, 'id', { numeric: true })
  })
})

const dibawahAmbang = computed(() => barisKelas.value.filter((r) => r.persen < threshold.value).length)
const totalTercatat = computed(() => total.value.Hadir + total.value.Izin + total.value.Sakit + total.value.Alfa)

const doughnutData = computed(() => ({
  labels: ['Hadir', 'Izin', 'Sakit', 'Alfa'],
  datasets: [{
    data: [total.value.Hadir, total.value.Izin, total.value.Sakit, total.value.Alfa],
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

const lineData = computed(() => ({
  labels: harian.value.map((h) => {
    const t = tanggalOf(h)
    return t ? `${t.substring(8, 10)}/${t.substring(5, 7)}` : ''
  }),
  datasets: [{
    label: 'Hadir',
    data: harian.value.map((h) => n(h.Hadir ?? h.hadir)),
    borderColor: WARNA.line,
    backgroundColor: WARNA.lineFill,
    fill: true,
    tension: 0.35,
    pointRadius: 2.5,
    pointBackgroundColor: WARNA.line,
    borderWidth: 2,
    spanGaps: false,
  }],
}))
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { padding: 10, cornerRadius: 8 } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
}

async function loadKelas() {
  try {
    const s = await api<{ daftarKelas?: string[] }>('/presensi/pengaturan')
    daftarKelas.value = s.daftarKelas || []
  } catch {
    daftarKelas.value = []
  }
}

async function load() {
  if (!dari.value || !sampai.value) return
  if (dari.value > sampai.value) {
    loadError.value = 'Tanggal awal tidak boleh lebih dari tanggal akhir'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const q: Record<string, string | number | undefined> = { dari: dari.value, sampai: sampai.value }
    if (filterKelas.value) q.kelas = filterKelas.value
    const res = await api<StatistikResp>('/presensi/statistik', { query: q })
    total.value = res.total || { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
    harian.value = (res.harian || []).slice().sort((a, b) => tanggalOf(a).localeCompare(tanggalOf(b)))
    perKelas.value = res.perKelas || []
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadKelas().then(() => load())
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Statistik Kehadiran</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ formatTanggalPanjang(dari) }} – {{ formatTanggalPanjang(sampai) }}</p>
      </div>
      <button
        type="button"
        :disabled="loading"
        class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        @click="load"
      >
        <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" aria-hidden="true" />
        {{ loading ? 'Memuat…' : 'Muat Ulang' }}
      </button>
    </div>

    <!-- Filter -->
    <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label for="fkelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas</label>
        <select id="fkelas" v-model="filterKelas" :disabled="!auth.isAdmin" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" @change="load">
          <option v-if="auth.isAdmin" value="">Semua Kelas</option>
          <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
        </select>
      </div>
      <div>
        <label for="dari" class="mb-1 block text-xs font-semibold text-slate-600">Dari tanggal</label>
        <input id="dari" v-model="dari" type="date" :max="todayISO()" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="load" />
      </div>
      <div>
        <label for="sampai" class="mb-1 block text-xs font-semibold text-slate-600">Sampai tanggal</label>
        <input id="sampai" v-model="sampai" type="date" :max="todayISO()" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="load" />
      </div>
      <div>
        <label for="ambang" class="mb-1 block text-xs font-semibold text-slate-600">Ambang batas (%)</label>
        <input id="ambang" v-model.number="threshold" type="number" min="0" max="100" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
      </div>
    </div>

    <div v-if="auth.isAdmin && barisKelas.length > 0" class="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="status">
      <TriangleAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
      <span><strong class="font-mono">{{ dibawahAmbang }}</strong> kelas di bawah {{ threshold }}% (bebas alfa)</span>
    </div>

    <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="flex-1">{{ loadError }}</div>
      <button type="button" class="font-semibold underline" @click="load()">Coba lagi</button>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-3 lg:grid-cols-3" aria-live="polite">
      <div class="h-64 animate-pulse rounded-xl bg-slate-100 lg:col-span-2" />
      <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
    </div>

    <template v-else>
      <!-- Grafik -->
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 class="text-[15px] font-bold text-slate-900">Tren Kehadiran Harian</h2>
          <p class="mb-2 text-xs text-slate-500">Jumlah siswa hadir per tanggal</p>
          <div v-if="harian.length === 0" class="flex h-48 flex-col items-center justify-center gap-1.5 text-center">
            <ChartColumn class="h-8 w-8 text-slate-200" aria-hidden="true" />
            <p class="text-sm text-slate-400">Belum ada data pada rentang ini</p>
          </div>
          <div v-else class="h-[clamp(200px,30vh,300px)]" role="img" aria-label="Grafik tren kehadiran harian">
            <Line :data="lineData" :options="lineOptions" />
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <h2 class="text-[15px] font-bold text-slate-900">Komposisi Status</h2>
          <p class="mb-2 text-xs text-slate-500">{{ totalTercatat }} catatan kehadiran</p>
          <div v-if="totalTercatat === 0" class="flex h-48 flex-col items-center justify-center gap-1.5 text-center">
            <ChartColumn class="h-8 w-8 text-slate-200" aria-hidden="true" />
            <p class="text-sm text-slate-400">Belum ada data pada rentang ini</p>
          </div>
          <div v-else class="h-[clamp(200px,30vh,300px)]" role="img" aria-label="Grafik komposisi status kehadiran">
            <Doughnut :data="doughnutData" :options="doughnutOptions" />
          </div>
        </div>
      </div>

      <!-- Tabel per kelas -->
      <div v-if="auth.isAdmin" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[560px] text-left text-sm">
          <caption class="sr-only">Statistik kehadiran per kelas</caption>
          <thead>
            <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th class="px-3 py-2.5 font-semibold">Kelas</th>
              <th class="px-3 py-2.5 text-center font-semibold" title="Hadir">H</th>
              <th class="px-3 py-2.5 text-center font-semibold" title="Izin">I</th>
              <th class="px-3 py-2.5 text-center font-semibold" title="Sakit">S</th>
              <th class="px-3 py-2.5 text-center font-semibold" title="Alfa">A</th>
              <th class="px-3 py-2.5 text-center font-semibold" title="Total tercatat">Tercatat</th>
              <th class="px-3 py-2.5 text-center font-semibold" title="Persentase bebas alfa">% (Bebas Alfa)</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in barisKelas"
              :key="r.kelas"
              class="border-t border-slate-100 hover:bg-slate-50/60"
              :class="r.persen < threshold ? 'bg-rose-50/50' : ''"
            >
              <td class="px-3 py-2.5 font-medium text-slate-800">Kelas {{ r.kelas }}</td>
              <td class="px-3 py-2.5 text-center font-mono text-emerald-700">{{ r.H }}</td>
              <td class="px-3 py-2.5 text-center font-mono text-sky-700">{{ r.I }}</td>
              <td class="px-3 py-2.5 text-center font-mono text-amber-600">{{ r.S }}</td>
              <td class="px-3 py-2.5 text-center font-mono text-rose-600">{{ r.A }}</td>
              <td class="px-3 py-2.5 text-center font-mono text-slate-500">{{ r.total }}</td>
              <td class="px-3 py-2.5 text-center font-mono font-bold" :class="r.persen < threshold ? 'text-rose-700' : 'text-emerald-700'">
                {{ r.persen }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="barisKelas.length === 0 && !loading" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
        <ChartColumn class="h-10 w-10 text-slate-300" aria-hidden="true" />
        <p class="text-sm font-semibold text-slate-800">Belum ada data statistik</p>
        <p class="max-w-sm text-[13px] text-slate-500">Data statistik akan muncul setelah ada presensi yang diisi pada rentang ini.</p>
      </div>
    </template>
  </div>
</template>
