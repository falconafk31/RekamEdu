<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TriangleAlert, RefreshCw, ClipboardList, ChevronDown, ChevronUp, User } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { formatWaktu } from '../../lib/dates'

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface Aktivitas {
  id: string | number
  jenis?: string
  aksi?: string
  actor?: string
  aktor?: string
  user?: string
  deskripsi?: string
  detail?: string
  keterangan?: string
  waktu?: string
  createdAt?: string
  tanggal?: string
}

const rows = ref<Aktivitas[]>([])
const loading = ref(false)
const loadError = ref('')
const page = ref(1)
const limit = 20
const total = ref(0)
const expanded = ref<Set<string | number>>(new Set())

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

function waktuOf(a: Aktivitas): string {
  return a.waktu || a.createdAt || a.tanggal || ''
}
function deskripsiOf(a: Aktivitas): string {
  return a.deskripsi || a.detail || a.keterangan || '—'
}
function aktorOf(a: Aktivitas): string {
  return a.actor || a.aktor || a.user || '—'
}
function jenisOf(a: Aktivitas): string {
  return a.jenis || a.aksi || 'Aktivitas'
}

function toggleDetail(id: string | number) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api<{ data: Aktivitas[]; total: number }>('/presensi/aktivitas', {
      query: { page: page.value, limit },
    })
    rows.value = res.data || []
    total.value = res.total ?? rows.value.length
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

function prevPage() {
  if (page.value > 1) { page.value--; void load() }
}
function nextPage() {
  if (page.value < totalPages.value) { page.value++; void load() }
}

onMounted(() => { void load() })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Aktivitas</h1>
        <p class="mt-0.5 text-sm text-slate-500">Catatan aktivitas terbaru dalam modul presensi</p>
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

    <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="flex-1">{{ loadError }}</div>
      <button type="button" class="font-semibold underline" @click="load()">Coba lagi</button>
    </div>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-4" aria-live="polite">
      <div class="flex flex-col gap-2">
        <div v-for="i in 6" :key="i" class="h-14 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
    <div v-else-if="rows.length === 0" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <ClipboardList class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Belum ada aktivitas</p>
      <p class="max-w-sm text-[13px] text-slate-500">Aktivitas yang dicatat sistem akan muncul di sini.</p>
    </div>
    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <ul class="divide-y divide-slate-100">
        <li v-for="a in rows" :key="a.id">
          <button
            type="button"
            class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/60"
            :aria-expanded="expanded.has(a.id) ? 'true' : 'false'"
            @click="toggleDetail(a.id)"
          >
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <User class="h-4 w-4" aria-hidden="true" />
            </span>
            <span class="flex-1">
              <span class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span class="text-sm font-semibold text-slate-800">{{ jenisOf(a) }}</span>
                <time class="font-mono text-xs text-slate-400">{{ waktuOf(a) ? formatWaktu(waktuOf(a)) : '—' }}</time>
              </span>
              <span class="mt-0.5 block text-[13px] text-slate-500">{{ deskripsiOf(a) }}</span>
              <span class="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                <span class="font-medium text-slate-500">{{ aktorOf(a) }}</span>
                <ChevronDown v-if="!expanded.has(a.id)" class="h-3.5 w-3.5" aria-hidden="true" />
                <ChevronUp v-else class="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </span>
          </button>
          <div v-if="expanded.has(a.id)" class="border-t border-slate-100 bg-slate-50/70 px-4 py-3 pl-[60px]">
            <dl class="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Jenis</dt>
                <dd class="text-slate-700">{{ jenisOf(a) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Pelaku</dt>
                <dd class="text-slate-700">{{ aktorOf(a) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Waktu</dt>
                <dd class="font-mono text-slate-700">{{ waktuOf(a) ? formatWaktu(waktuOf(a)) : '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Keterangan</dt>
                <dd class="text-slate-700">{{ deskripsiOf(a) }}</dd>
              </div>
            </dl>
          </div>
        </li>
      </ul>
    </div>

    <!-- Pagination -->
    <div v-if="total > limit" class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-[13px] text-slate-500">
        Menampilkan <span class="font-mono">{{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, total) }}</span> dari <span class="font-mono">{{ total }}</span>
      </p>
      <div class="flex items-center gap-1.5">
        <button type="button" :disabled="page <= 1" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" @click="prevPage">‹ Sebelumnya</button>
        <span class="px-2 font-mono text-sm text-slate-600">{{ page }} / {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" @click="nextPage">Berikutnya ›</button>
      </div>
    </div>
  </div>
</template>
