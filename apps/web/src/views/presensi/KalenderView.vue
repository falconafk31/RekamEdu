<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronLeft, ChevronRight, CalendarDays, TriangleAlert } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { daysInMonth, isWeekend, namaBulan } from '../../lib/dates'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

type StatusHari = 'Masuk' | 'Libur'

interface KalenderRow {
  tanggal: string
  status: StatusHari
}

// Lihat: Admin + Guru. Ubah status: hanya Admin.
const canManage = computed(() => auth.isAdmin)

const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const calendarMap = ref<Record<string, StatusHari>>({})
const keteranganMap = ref<Record<string, string>>({})
const hariLiburMingguan = ref<number[]>([0])
const loading = ref(false)
const saving = ref<string | null>(null)
const loadError = ref('')

const showModal = ref(false)
const targetIso = ref<string | null>(null)
const keteranganLibur = ref('')

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const cells = computed(() => {
  const days = daysInMonth(year.value, month.value)
  const firstDow = new Date(year.value, month.value - 1, 1).getDay()
  const blanks = Array.from({ length: firstDow }, () => null as string | null)
  return [...blanks, ...days]
})

function isLibur(iso: string): boolean {
  const record = calendarMap.value[iso]
  return record === 'Libur' || (!record && isWeekend(iso, hariLiburMingguan.value))
}

const namaHariLibur = computed(() =>
  [...hariLiburMingguan.value].sort((a, b) => a - b).map((d) => HARI[d] ?? '').filter(Boolean).join(', ') || '—',
)

function targetLabel(): string {
  if (!targetIso.value) return ''
  return new Date(targetIso.value + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [res, peng] = await Promise.all([
      api<{ data: KalenderRow[] }>('/presensi/kalender', {
        query: { tahun: year.value, bulan: month.value },
      }),
      api<{ hariLiburMingguan?: number[]; hariLibur?: number[] }>('/presensi/pengaturan').catch(() => ({} as { hariLiburMingguan?: number[]; hariLibur?: number[] })),
    ])
    const map: Record<string, StatusHari> = {}
    const ket: Record<string, string> = {}
    for (const r of res.data || []) {
      map[r.tanggal] = r.status
      if ((r as { keterangan?: string }).keterangan) ket[r.tanggal] = (r as { keterangan?: string }).keterangan as string
    }
    calendarMap.value = map
    keteranganMap.value = ket
    hariLiburMingguan.value = peng.hariLiburMingguan ?? peng.hariLibur ?? [0]
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

async function prosesSimpan(iso: string, status: StatusHari) {
  saving.value = iso
  try {
    await api(`/presensi/kalender/${iso}`, { method: 'PUT', body: { status } })
    calendarMap.value = { ...calendarMap.value, [iso]: status }
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    saving.value = null
  }
}

function toggle(iso: string | null) {
  if (!iso || !canManage.value || saving.value) return
  const sekarangLibur = isLibur(iso)
  const baru: StatusHari = sekarangLibur ? 'Masuk' : 'Libur'
  if (baru === 'Libur') {
    targetIso.value = iso
    keteranganLibur.value = keteranganMap.value[iso] || ''
    showModal.value = true
    return
  }
  void prosesSimpan(iso, baru)
}

function simpanLibur() {
  if (!targetIso.value) return
  void prosesSimpan(targetIso.value, 'Libur').then(() => {
    if (targetIso.value) {
      keteranganMap.value = { ...keteranganMap.value, [targetIso.value]: keteranganLibur.value }
    }
    showModal.value = false
    targetIso.value = null
  })
}

function prevMonth() {
  if (month.value === 1) { month.value = 12; year.value-- } else month.value--
}
function nextMonth() {
  if (month.value === 12) { month.value = 1; year.value++ } else month.value++
}

watch([month, year], () => { void load() })
onMounted(() => { void load() })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <h1 class="text-xl font-bold text-slate-900">Kalender Akademik</h1>
      <p class="mt-0.5 text-sm text-slate-500">
        {{ canManage
          ? 'Ketuk tanggal untuk mengubah status Masuk / Libur'
          : 'Tanggal masuk & libur untuk kegiatan presensi. Pengubahan status hanya oleh Admin.' }}
      </p>
    </div>

    <div v-if="loadError" class="mx-auto w-full max-w-2xl flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="flex-1">{{ loadError }}</div>
      <button type="button" class="font-semibold underline" @click="load()">Coba lagi</button>
    </div>

    <div class="mx-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-3 flex items-center justify-between">
        <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Bulan sebelumnya" @click="prevMonth">
          <ChevronLeft class="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 class="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
          <CalendarDays class="h-4 w-4 text-emerald-700" aria-hidden="true" />
          {{ namaBulan(month) }} {{ year }}
        </h2>
        <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Bulan berikutnya" @click="nextMonth">
          <ChevronRight class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div v-if="loading" class="py-4" aria-live="polite">
        <div class="grid grid-cols-7 gap-1">
          <div v-for="i in 35" :key="i" class="aspect-square animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
      <template v-else>
        <div class="grid grid-cols-7 gap-1 text-center" role="row">
          <div v-for="h in HARI" :key="h" class="py-1 text-xs font-medium text-slate-400" role="columnheader">{{ h }}</div>
        </div>
        <div class="mt-1 grid grid-cols-7 gap-1" role="grid" :aria-label="`Kalender ${namaBulan(month)} ${year}`">
          <template v-for="(iso, i) in cells" :key="i">
            <div v-if="!iso" aria-hidden="true" />
            <button
              v-else
              type="button"
              :title="keteranganMap[iso] || (isLibur(iso) ? 'Libur' : 'Masuk')"
              :aria-pressed="isLibur(iso) ? 'true' : 'false'"
              :aria-label="`${iso} — ${isLibur(iso) ? 'Libur' : 'Masuk'}${canManage ? '' : ' (hanya Admin dapat mengubah)'}`"
              :disabled="!canManage || saving === iso"
              class="flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-lg border text-sm transition-colors disabled:cursor-default"
              :class="isLibur(iso)
                ? `border-rose-200 bg-rose-50 font-semibold text-rose-600 ${canManage ? 'hover:bg-rose-100' : ''}`
                : `border-slate-200 bg-white text-slate-700 ${canManage ? 'hover:border-emerald-300 hover:bg-emerald-50' : ''}`"
              @click="toggle(iso)"
            >
              <span class="font-mono">{{ Number(iso.slice(8, 10)) }}</span>
              <span v-if="isLibur(iso)" class="mt-0.5 text-[9px] font-semibold uppercase tracking-wide">Libur</span>
              <span v-else-if="saving === iso" class="mt-0.5 text-[9px] text-slate-400">…</span>
            </button>
          </template>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span class="inline-flex items-center gap-1.5">
            <span class="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-200" aria-hidden="true" /> Libur
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-3 w-3 rounded bg-white ring-1 ring-slate-200" aria-hidden="true" /> Masuk
          </span>
          <span class="ml-auto italic text-slate-400">Hari {{ namaHariLibur }} otomatis libur{{ canManage ? ' (dapat diubah)' : '' }}.</span>
        </div>
      </template>
    </div>

    <!-- Modal keterangan libur -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showModal = false">
      <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-base font-bold text-slate-900">Tandai Hari Libur</h2>
        <p class="mb-3 text-[13px] text-slate-500">{{ targetLabel() }}</p>
        <label for="ket-libur" class="mb-1 block text-xs font-semibold text-slate-600">Keterangan (opsional)</label>
        <input
          id="ket-libur"
          v-model="keteranganLibur"
          placeholder="Misal: Libur nasional, rapat, dll."
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          @keyup.enter="simpanLibur"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showModal = false">Batal</button>
          <button type="button" :disabled="saving !== null" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="simpanLibur">Simpan Libur</button>
        </div>
      </div>
    </div>
  </div>
</template>
