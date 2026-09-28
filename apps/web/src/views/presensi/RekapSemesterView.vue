<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download, FileText, TriangleAlert, RefreshCw, TableProperties } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { exportExcel } from '../../lib/excel'
import { cetakPdfRekapSemester } from '../../lib/pdf'
import { todayISO, formatTanggalPanjang } from '../../lib/dates'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface RekapSiswa {
  nisn?: string
  nama?: string
  Hadir?: number
  hadir?: number
  Izin?: number
  izin?: number
  Sakit?: number
  sakit?: number
  Alfa?: number
  alfa?: number
  total?: number
  persen?: number
}

interface Periode {
  id: string | number
  nama?: string
  label?: string
  tahunAjaran?: string
  semester?: string
  dari?: string
  sampai?: string
  aktif?: boolean
}

const daftarKelas = ref<string[]>([])
const kelas = ref(auth.isAdmin ? '' : (auth.user?.kelas || ''))
const periodeList = ref<Periode[]>([])
const periodeId = ref<string | number | ''>('')
const rows = ref<RekapSiswa[]>([])
const loading = ref(false)
const loadError = ref('')
const exporting = ref(false)

function n(v: number | undefined): number {
  return v ?? 0
}
function norm(r: RekapSiswa) {
  const H = n(r.Hadir ?? r.hadir)
  const I = n(r.Izin ?? r.izin)
  const S = n(r.Sakit ?? r.sakit)
  const A = n(r.Alfa ?? r.alfa)
  const total = r.total ?? (H + I + S + A)
  const persen = r.persen ?? (total > 0 ? Math.round(((total - A) / total) * 100) : 0)
  return { nisn: r.nisn || '', nama: r.nama || '', H, I, S, A, total, persen }
}
const baris = computed(() => rows.value.map(norm))

const periodeLabel = computed(() => {
  const p = periodeList.value.find((x) => String(x.id) === String(periodeId.value))
  if (!p) return '—'
  return p.label || p.nama || [p.tahunAjaran, p.semester].filter(Boolean).join(' ') || '—'
})

async function loadPeriodeDanKelas() {
  try {
    const s = await api<{ daftarKelas?: string[] }>('/presensi/pengaturan')
    daftarKelas.value = s.daftarKelas || []
  } catch {
    daftarKelas.value = []
  }
  try {
    const res = await api<{ data: Periode[] } | Periode[]>('/presensi/periode')
    const list = Array.isArray(res) ? res : (res.data || [])
    periodeList.value = list
    const aktif = list.find((p) => p.aktif) || list[0]
    if (aktif) periodeId.value = aktif.id
  } catch {
    periodeList.value = []
  }
}

async function load() {
  if (periodeId.value === '') {
    loadError.value = 'Pilih periode terlebih dahulu'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const res = await api<{ data: RekapSiswa[] }>(`/presensi/rekap/semester/${periodeId.value}`, {
      query: { kelas: kelas.value },
    })
    rows.value = res.data || []
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

async function exportExcelFile() {
  exporting.value = true
  try {
    await exportExcel({
      fileName: `Rekap Semester ${kelas.value || 'Semua Kelas'} - ${periodeLabel.value}.xlsx`,
      sheetName: 'Rekap Semester',
      title: 'Rekap Presensi Semester',
      subTitle: `Periode ${periodeLabel.value} — Kelas ${kelas.value || '—'}`,
      headers: ['No', 'NISN', 'Nama', 'H', 'I', 'S', 'A', 'Total', '%'],
      rows: baris.value.map((r, i) => [i + 1, r.nisn, r.nama, r.H, r.I, r.S, r.A, r.total, r.persen]),
    })
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    exporting.value = false
  }
}

async function cetakPdf() {
  exporting.value = true
  try {
    await cetakPdfRekapSemester({
      kelas: kelas.value,
      periode: periodeLabel.value,
      columns: ['No', 'NISN', 'Nama', 'H', 'I', 'S', 'A', 'Total', '%'],
      rows: baris.value.map((r, i) => [i + 1, r.nisn, r.nama, r.H, r.I, r.S, r.A, r.total, r.persen]),
    })
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  await loadPeriodeDanKelas()
  if (periodeId.value !== '') await load()
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Rekap Semester</h1>
        <p class="mt-0.5 text-sm text-slate-500">Rekap presensi satu semester per siswa</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          :disabled="exporting || baris.length === 0"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          @click="exportExcelFile"
        >
          <Download class="h-4 w-4" aria-hidden="true" />
          {{ exporting ? 'Menyiapkan…' : 'Excel' }}
        </button>
        <button
          type="button"
          :disabled="exporting || baris.length === 0"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          @click="cetakPdf"
        >
          <FileText class="h-4 w-4" aria-hidden="true" />
          {{ exporting ? 'Menyiapkan…' : 'PDF' }}
        </button>
        <button
          type="button"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          @click="load"
        >
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" aria-hidden="true" />
          {{ loading ? 'Memuat…' : 'Muat' }}
        </button>
      </div>
    </div>

    <!-- Filter -->
    <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
      <div>
        <label for="kelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas</label>
        <select id="kelas" v-model="kelas" :disabled="!auth.isAdmin" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" @change="load">
          <option v-if="auth.isAdmin" value="">Semua Kelas</option>
          <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
        </select>
      </div>
      <div>
        <label for="periode" class="mb-1 block text-xs font-semibold text-slate-600">Periode semester</label>
        <select id="periode" v-model="periodeId" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="load">
          <option value="" disabled>Pilih periode…</option>
          <option v-for="p in periodeList" :key="p.id" :value="p.id">
            {{ p.label || p.nama || [p.tahunAjaran, p.semester].filter(Boolean).join(' ') }}{{ p.aktif ? ' (aktif)' : '' }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="flex-1">{{ loadError }}</div>
      <button type="button" class="font-semibold underline" @click="load()">Coba lagi</button>
    </div>

    <!-- Tabel -->
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-4" aria-live="polite">
      <div class="flex flex-col gap-2">
        <div v-for="i in 6" :key="i" class="h-8 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
    <div v-else-if="baris.length === 0" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <TableProperties class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Belum ada data rekap semester</p>
      <p class="max-w-sm text-[13px] text-slate-500">Pilih periode semester dan kelas, lalu muat ulang. Data muncul setelah ada presensi pada periode tersebut.</p>
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[720px] text-left text-sm">
        <caption class="sr-only">Rekap presensi semester {{ periodeLabel }}</caption>
        <thead>
          <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th class="w-12 px-3 py-2.5 text-center font-semibold">No</th>
            <th class="px-3 py-2.5 font-semibold">NISN</th>
            <th class="px-3 py-2.5 font-semibold">Nama</th>
            <th class="px-3 py-2.5 text-center font-semibold" title="Hadir">H</th>
            <th class="px-3 py-2.5 text-center font-semibold" title="Izin">I</th>
            <th class="px-3 py-2.5 text-center font-semibold" title="Sakit">S</th>
            <th class="px-3 py-2.5 text-center font-semibold" title="Alfa">A</th>
            <th class="px-3 py-2.5 text-center font-semibold" title="Total tercatat">Tercatat</th>
            <th class="px-3 py-2.5 text-center font-semibold" title="Persentase bebas alfa">%</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in baris" :key="r.nisn || i" class="border-t border-slate-100 hover:bg-slate-50/60">
            <td class="px-3 py-2.5 text-center font-mono text-slate-400">{{ i + 1 }}</td>
            <td class="px-3 py-2.5 font-mono text-slate-500">{{ r.nisn }}</td>
            <td class="px-3 py-2.5 font-medium text-slate-800">{{ r.nama }}</td>
            <td class="px-3 py-2.5 text-center font-mono text-emerald-700">{{ r.H }}</td>
            <td class="px-3 py-2.5 text-center font-mono text-sky-700">{{ r.I }}</td>
            <td class="px-3 py-2.5 text-center font-mono text-amber-600">{{ r.S }}</td>
            <td class="px-3 py-2.5 text-center font-mono text-rose-600">{{ r.A }}</td>
            <td class="px-3 py-2.5 text-center font-mono text-slate-500">{{ r.total }}</td>
            <td class="px-3 py-2.5 text-center font-mono font-bold" :class="r.persen >= 90 ? 'text-emerald-700' : r.persen >= 75 ? 'text-amber-600' : 'text-rose-600'">
              {{ r.persen }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-xs text-slate-400">Periode: {{ periodeLabel }} · H = Hadir · I = Izin · S = Sakit · A = Alfa · % = persentase kehadiran bebas alfa. Data per {{ formatTanggalPanjang(todayISO()) }}.</p>
  </div>
</template>
