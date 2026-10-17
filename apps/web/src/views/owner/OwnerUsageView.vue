<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BarChart3, TriangleAlert } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface Tenant {
  id: string
  kodeSekolah: string
  nama: string
}

interface UsageRow {
  tenantId: string
  kodeSekolah: string | null
  namaTenant: string
  aiModelId: string
  displayName: string
  totalInput: number
  totalOutput: number
  jumlahRequest: number
}

interface Ringkasan {
  jumlahTenantMemakaiAI: number
  totalInput: number
  totalOutput: number
  jumlahRequest: number
  periodeHari: number
}

const tenants = ref<Tenant[]>([])
const rows = ref<UsageRow[]>([])
const ringkasan = ref<Ringkasan | null>(null)
const loading = ref(false)
const loadError = ref('')

const filterTenant = ref('')
const filterDari = ref('')
const filterSampai = ref('')

function angka(n: number): string {
  return n.toLocaleString('id-ID')
}

const totalInput = computed(() => rows.value.reduce((s, r) => s + r.totalInput, 0))
const totalOutput = computed(() => rows.value.reduce((s, r) => s + r.totalOutput, 0))
const totalRequest = computed(() => rows.value.reduce((s, r) => s + r.jumlahRequest, 0))

async function loadTenants() {
  try {
    const res = await api<Tenant[]>('/owner/tenants')
    tenants.value = Array.isArray(res) ? res : []
  } catch {
    tenants.value = []
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const query: Record<string, string> = {}
    if (filterTenant.value) query.tenantId = filterTenant.value
    if (filterDari.value) query.dari = filterDari.value
    if (filterSampai.value) query.sampai = filterSampai.value
    const res = await api<UsageRow[]>('/owner/usage', { query })
    rows.value = Array.isArray(res) ? res : []
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

async function loadRingkasan() {
  try {
    ringkasan.value = await api<Ringkasan>('/owner/usage/ringkasan')
  } catch {
    ringkasan.value = null
  }
}

function resetPage() {
  void load()
}

function clearFilters() {
  filterTenant.value = ''
  filterDari.value = ''
  filterSampai.value = ''
  void load()
}

onMounted(async () => {
  await loadTenants()
  await loadRingkasan()
  await load()
})
</script>

<template>
  <div v-if="!auth.isOwner" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
    <TriangleAlert class="h-10 w-10 text-amber-400" aria-hidden="true" />
    <p class="text-sm font-semibold text-slate-800">Akses ditolak</p>
    <p class="max-w-sm text-[13px] text-slate-500">Halaman ini hanya dapat diakses oleh Owner platform.</p>
  </div>
  <div v-else class="flex flex-col gap-3">
    <div>
      <h1 class="text-xl font-bold text-slate-900">Pemakaian AI</h1>
      <p class="mt-0.5 text-sm text-slate-500">Agregat token lintas tenant</p>
    </div>

    <!-- Ringkasan total di atas -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Token input</p>
        <p class="mt-1 font-mono text-xl font-bold text-slate-900">{{ angka(totalInput) }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Token output</p>
        <p class="mt-1 font-mono text-xl font-bold text-slate-900">{{ angka(totalOutput) }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah request</p>
        <p class="mt-1 font-mono text-xl font-bold text-slate-900">{{ angka(totalRequest) }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tenant memakai AI (30 hari)</p>
        <p class="mt-1 font-mono text-xl font-bold text-slate-900">{{ ringkasan ? angka(ringkasan.jumlahTenantMemakaiAI) : '—' }}</p>
      </div>
    </div>

    <!-- Filter -->
    <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
      <div>
        <label for="ou-tenant" class="mb-1 block text-xs font-semibold text-slate-600">Tenant</label>
        <select id="ou-tenant" v-model="filterTenant" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="resetPage">
          <option value="">Semua tenant</option>
          <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.nama }} ({{ t.kodeSekolah }})</option>
        </select>
      </div>
      <div>
        <label for="ou-dari" class="mb-1 block text-xs font-semibold text-slate-600">Dari tanggal</label>
        <input id="ou-dari" v-model="filterDari" type="date" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="resetPage" />
      </div>
      <div>
        <label for="ou-sampai" class="mb-1 block text-xs font-semibold text-slate-600">Sampai tanggal</label>
        <input id="ou-sampai" v-model="filterSampai" type="date" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="resetPage" />
      </div>
    </div>
    <div v-if="filterTenant || filterDari || filterSampai" class="flex items-center gap-2 text-[13px] text-slate-500">
      <span>{{ rows.length }} baris</span>
      <button type="button" class="font-medium text-emerald-700 hover:underline" @click="clearFilters">Hapus filter</button>
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
    <div v-else-if="rows.length === 0" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <BarChart3 class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Belum ada data pemakaian</p>
      <p class="max-w-sm text-[13px] text-slate-500">Belum ada request AI yang tercatat, atau ubah filter tanggal.</p>
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[680px] text-left text-sm">
        <caption class="sr-only">Pemakaian AI per tenant dan model</caption>
        <thead>
          <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th class="px-3 py-2.5 font-semibold">Tenant</th>
            <th class="px-3 py-2.5 font-semibold">Model</th>
            <th class="px-3 py-2.5 text-right font-semibold">Token Input</th>
            <th class="px-3 py-2.5 text-right font-semibold">Token Output</th>
            <th class="px-3 py-2.5 text-right font-semibold">Jumlah Request</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="`${r.tenantId}-${r.aiModelId}`" class="border-t border-slate-100 hover:bg-slate-50/60">
            <td class="px-3 py-2.5">
              <span class="block font-medium text-slate-800">{{ r.namaTenant }}</span>
              <span v-if="r.kodeSekolah" class="block font-mono text-xs text-slate-400">{{ r.kodeSekolah }}</span>
            </td>
            <td class="px-3 py-2.5 text-slate-700">{{ r.displayName }}</td>
            <td class="px-3 py-2.5 text-right font-mono text-slate-600">{{ angka(r.totalInput) }}</td>
            <td class="px-3 py-2.5 text-right font-mono text-slate-600">{{ angka(r.totalOutput) }}</td>
            <td class="px-3 py-2.5 text-right font-mono text-slate-600">{{ angka(r.jumlahRequest) }}</td>
          </tr>
          <tr class="border-t-2 border-slate-200 bg-slate-50 font-semibold">
            <td class="px-3 py-2.5 text-slate-800" colspan="2">Total</td>
            <td class="px-3 py-2.5 text-right font-mono text-slate-800">{{ angka(totalInput) }}</td>
            <td class="px-3 py-2.5 text-right font-mono text-slate-800">{{ angka(totalOutput) }}</td>
            <td class="px-3 py-2.5 text-right font-mono text-slate-800">{{ angka(totalRequest) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
