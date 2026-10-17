<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BarChart3, TriangleAlert, Users, School } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface RekapGuru {
  userId: string
  nama: string
  total: number
}

interface RekapKelas {
  kelas: string
  total: number
}

interface Rekap {
  periode: { tanggalDari: string | null; tanggalSampai: string | null }
  totalJurnal: number
  perGuru: RekapGuru[]
  perKelas: RekapKelas[]
}

const isGuru = computed(() => auth.user?.role === 'GURU')

function awalBulan(): string {
  const d = new Date()
  return `${d.toISOString().slice(0, 7)}-01`
}

function hariIni(): string {
  return new Date().toISOString().slice(0, 10)
}

const tanggalDari = ref(awalBulan())
const tanggalSampai = ref(hariIni())
const rekap = ref<Rekap | null>(null)
const loading = ref(false)
const loadError = ref('')

function formatTanggal(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

async function muat() {
  loading.value = true
  loadError.value = ''
  try {
    const query: Record<string, string> = {}
    if (tanggalDari.value) query.tanggalDari = tanggalDari.value
    if (tanggalSampai.value) query.tanggalSampai = tanggalSampai.value
    rekap.value = await api<Rekap>('/jurnal/rekap', { query })
  } catch (e) {
    loadError.value = pesanError(e)
    rekap.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => { void muat() })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <h1 class="text-xl font-bold text-slate-900">Rekap Jurnal Guru</h1>
      <p class="mt-0.5 text-sm text-slate-500">
        Ringkasan jumlah jurnal per guru dan per kelas pada periode terpilih
      </p>
    </div>

    <div v-if="isGuru" class="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-800" role="note">
      <Users class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>Anda masuk sebagai <strong>Guru</strong> — rekap ini hanya menghitung jurnal yang Anda buat sendiri.</div>
    </div>

    <!-- Periode -->
    <div class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <label for="r-dari" class="mb-1 block text-xs font-semibold text-slate-600">Dari tanggal</label>
        <input id="r-dari" v-model="tanggalDari" type="date" class="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
      </div>
      <div>
        <label for="r-sampai" class="mb-1 block text-xs font-semibold text-slate-600">Sampai tanggal</label>
        <input id="r-sampai" v-model="tanggalSampai" type="date" class="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
      </div>
      <button
        type="button"
        :disabled="loading"
        class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        @click="muat"
      >
        <BarChart3 class="h-4 w-4" aria-hidden="true" />
        {{ loading ? 'Memuat…' : 'Tampilkan Rekap' }}
      </button>
    </div>

    <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="flex-1">{{ loadError }}</div>
      <button type="button" class="font-semibold underline" @click="muat()">Coba lagi</button>
    </div>

    <template v-if="rekap && !loading">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-600">
          Periode <strong class="font-mono text-slate-900">{{ formatTanggal(rekap.periode.tanggalDari) }}</strong>
          s.d. <strong class="font-mono text-slate-900">{{ formatTanggal(rekap.periode.tanggalSampai) }}</strong>
          — <strong class="font-mono text-emerald-700">{{ rekap.totalJurnal }}</strong> jurnal tercatat
        </p>
      </div>

      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <!-- Per guru -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div class="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Users class="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <h2 class="text-sm font-bold text-slate-900">Jumlah Jurnal per Guru</h2>
          </div>
          <table v-if="rekap.perGuru.length > 0" class="w-full text-left text-sm">
            <caption class="sr-only">Rekap jurnal per guru</caption>
            <thead>
              <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th class="w-12 px-4 py-2.5 text-center font-semibold">No</th>
                <th class="px-4 py-2.5 font-semibold">Nama Guru</th>
                <th class="px-4 py-2.5 text-right font-semibold">Jumlah Jurnal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(g, i) in rekap.perGuru" :key="g.userId" class="border-t border-slate-100">
                <td class="px-4 py-2.5 text-center font-mono text-slate-400">{{ i + 1 }}</td>
                <td class="px-4 py-2.5 font-medium text-slate-800">{{ g.nama }}</td>
                <td class="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">{{ g.total }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="px-4 py-6 text-center text-sm text-slate-500">Tidak ada jurnal pada periode ini.</p>
        </div>

        <!-- Per kelas -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div class="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <School class="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <h2 class="text-sm font-bold text-slate-900">Jumlah Jurnal per Kelas</h2>
          </div>
          <table v-if="rekap.perKelas.length > 0" class="w-full text-left text-sm">
            <caption class="sr-only">Rekap jurnal per kelas</caption>
            <thead>
              <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th class="w-12 px-4 py-2.5 text-center font-semibold">No</th>
                <th class="px-4 py-2.5 font-semibold">Kelas</th>
                <th class="px-4 py-2.5 text-right font-semibold">Jumlah Jurnal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(k, i) in rekap.perKelas" :key="k.kelas" class="border-t border-slate-100">
                <td class="px-4 py-2.5 text-center font-mono text-slate-400">{{ i + 1 }}</td>
                <td class="px-4 py-2.5 font-medium text-slate-800">{{ k.kelas }}</td>
                <td class="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">{{ k.total }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="px-4 py-6 text-center text-sm text-slate-500">Tidak ada jurnal pada periode ini.</p>
        </div>
      </div>
    </template>
  </div>
</template>
