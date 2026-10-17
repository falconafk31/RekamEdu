<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Plus, Pencil, Trash2, Search, Eye, X, TriangleAlert,
  FileText, Sparkles, CheckCircle2,
} from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import AppModal from '../../components/ui/AppModal.vue'
import AppBadge from '../../components/ui/AppBadge.vue'
import AppPagination from '../../components/ui/AppPagination.vue'

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface Dokumen {
  id: string
  jenis: string
  judul: string
  konten: string
  versi: number
  status: 'DRAFT' | 'FINAL'
  metadata: Record<string, unknown> | null
  aiModelId: string | null
  updatedAt: string
}

const JENIS_LABEL: Record<string, string> = {
  RPP: 'RPP',
  SILABUS: 'Silabus',
  MODUL_AJAR: 'Modul Ajar',
  LKPD: 'LKPD',
  SOAL: 'Soal',
  LAINNYA: 'Lainnya',
}

const rows = ref<Dokumen[]>([])
const loading = ref(false)
const loadError = ref('')
const q = ref('')
const filterJenis = ref('')
const filterStatus = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)

const showForm = ref(false)
const showDetail = ref(false)
const showDelete = ref(false)
const saving = ref(false)
const editing = ref(false)
const target = ref<Dokumen | null>(null)
const formError = ref('')
const form = ref({
  id: null as string | null,
  jenis: 'RPP',
  judul: '',
  konten: '',
  status: 'DRAFT' as 'DRAFT' | 'FINAL',
  jenjang: '',
  mapel: '',
  kelas: '',
})

const hasActiveFilter = computed(
  () => q.value.trim() !== '' || filterJenis.value !== '' || filterStatus.value !== '',
)

function metaString(d: Dokumen): string {
  const m = (d.metadata ?? {}) as Record<string, unknown>
  const parts: string[] = []
  if (m.jenjang) parts.push(String(m.jenjang))
  if (m.kelas) parts.push(`Kelas ${m.kelas}`)
  if (m.mapel) parts.push(String(m.mapel))
  return parts.join(' · ')
}

function clearFilters() {
  q.value = ''
  filterJenis.value = ''
  filterStatus.value = ''
  page.value = 1
  void load()
}

function resetPage() {
  page.value = 1
  void load()
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(resetPage, 400)
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const query: Record<string, string | number> = { page: page.value, limit: limit.value }
    if (q.value.trim()) query.q = q.value.trim()
    if (filterJenis.value) query.jenis = filterJenis.value
    if (filterStatus.value) query.status = filterStatus.value
    const res = await api<{ data: Dokumen[]; total: number }>('/rpp/dokumen', { query })
    rows.value = res.data || []
    total.value = res.total ?? rows.value.length
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = false
  form.value = { id: null, jenis: 'RPP', judul: '', konten: '', status: 'DRAFT', jenjang: '', mapel: '', kelas: '' }
  formError.value = ''
  showForm.value = true
}

function openEdit(d: Dokumen) {
  editing.value = true
  const m = (d.metadata ?? {}) as Record<string, unknown>
  form.value = {
    id: d.id,
    jenis: d.jenis,
    judul: d.judul,
    konten: d.konten,
    status: d.status,
    jenjang: String(m.jenjang ?? ''),
    mapel: String(m.mapel ?? ''),
    kelas: String(m.kelas ?? ''),
  }
  formError.value = ''
  showForm.value = true
}

function openDetail(d: Dokumen) {
  target.value = d
  showDetail.value = true
}

function buildMetadata() {
  const m: Record<string, string> = {}
  if (form.value.jenjang.trim()) m.jenjang = form.value.jenjang.trim()
  if (form.value.kelas.trim()) m.kelas = form.value.kelas.trim()
  if (form.value.mapel.trim()) m.mapel = form.value.mapel.trim()
  return m
}

async function save() {
  if (!form.value.judul.trim() || !form.value.konten.trim()) {
    formError.value = 'Judul dan konten wajib diisi'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editing.value && form.value.id) {
      await api(`/rpp/dokumen/${form.value.id}`, {
        method: 'PATCH',
        body: {
          judul: form.value.judul.trim(),
          konten: form.value.konten,
          status: form.value.status,
          metadata: buildMetadata(),
        },
      })
    } else {
      await api('/rpp/dokumen', {
        method: 'POST',
        body: {
          jenis: form.value.jenis,
          judul: form.value.judul.trim(),
          konten: form.value.konten,
          status: form.value.status,
          metadata: buildMetadata(),
        },
      })
    }
    showForm.value = false
    await load()
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    saving.value = false
  }
}

async function tandaiFinal(d: Dokumen) {
  if (d.status === 'FINAL') return
  try {
    await api(`/rpp/dokumen/${d.id}`, { method: 'PATCH', body: { status: 'FINAL' } })
    await load()
  } catch (e) {
    loadError.value = pesanError(e)
  }
}

function confirmDelete(d: Dokumen) {
  target.value = d
  showDelete.value = true
}

async function hapus() {
  if (!target.value) return
  saving.value = true
  try {
    await api(`/rpp/dokumen/${target.value.id}`, { method: 'DELETE' })
    showDelete.value = false
    target.value = null
    await load()
  } catch (e) {
    loadError.value = pesanError(e)
    showDelete.value = false
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Dokumen Pembelajaran</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ total }} dokumen tersimpan</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <RouterLink
          to="/rpp/generate"
          class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <Sparkles class="h-4 w-4" aria-hidden="true" />
          Buat dengan AI
        </RouterLink>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          Tulis Manual
        </button>
      </div>
    </div>

    <!-- Filter -->
    <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
      <div>
        <label for="cari" class="mb-1 block text-xs font-semibold text-slate-600">Pencarian</label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="cari" v-model="q" placeholder="Cari judul / isi…" class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @input="onSearch" />
        </div>
      </div>
      <div>
        <label for="jenis" class="mb-1 block text-xs font-semibold text-slate-600">Jenis</label>
        <select id="jenis" v-model="filterJenis" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="resetPage">
          <option value="">Semua Jenis</option>
          <option v-for="(label, kode) in JENIS_LABEL" :key="kode" :value="kode">{{ label }}</option>
        </select>
      </div>
      <div>
        <label for="status" class="mb-1 block text-xs font-semibold text-slate-600">Status</label>
        <select id="status" v-model="filterStatus" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="resetPage">
          <option value="">Semua Status</option>
          <option value="DRAFT">Draft</option>
          <option value="FINAL">Final</option>
        </select>
      </div>
    </div>
    <div v-if="hasActiveFilter" class="flex items-center gap-2 text-[13px] text-slate-500">
      <span>{{ total }} hasil</span>
      <button type="button" class="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline" @click="clearFilters">
        <X class="h-3.5 w-3.5" aria-hidden="true" /> Hapus filter
      </button>
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
      <FileText class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Belum ada dokumen</p>
      <p class="max-w-sm text-[13px] text-slate-500">Buat dokumen baru dengan bantuan AI atau tulis manual.</p>
      <div class="mt-1 flex gap-2">
        <RouterLink to="/rpp/generate" class="rounded-lg bg-brandgreen px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">Buat dengan AI</RouterLink>
        <button type="button" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="openCreate">Tulis Manual</button>
      </div>
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[720px] text-left text-sm">
        <caption class="sr-only">Daftar dokumen pembelajaran</caption>
        <thead>
          <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th class="w-12 px-3 py-2.5 text-center font-semibold">No</th>
            <th class="px-3 py-2.5 font-semibold">Judul</th>
            <th class="px-3 py-2.5 font-semibold">Jenis</th>
            <th class="px-3 py-2.5 font-semibold">Versi</th>
            <th class="px-3 py-2.5 font-semibold">Status</th>
            <th class="px-3 py-2.5 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in rows" :key="d.id" class="border-t border-slate-100 hover:bg-slate-50/60">
            <td class="px-3 py-2.5 text-center font-mono text-slate-400">{{ (page - 1) * limit + i + 1 }}</td>
            <td class="px-3 py-2.5">
              <button type="button" class="text-left font-medium text-slate-800 hover:text-emerald-700 hover:underline" @click="openDetail(d)">{{ d.judul }}</button>
              <p v-if="metaString(d)" class="mt-0.5 text-xs text-slate-500">{{ metaString(d) }}</p>
            </td>
            <td class="px-3 py-2.5"><AppBadge :label="JENIS_LABEL[d.jenis] ?? d.jenis" tone="info" /></td>
            <td class="px-3 py-2.5 font-mono text-slate-500">v{{ d.versi }}</td>
            <td class="px-3 py-2.5">
              <AppBadge :label="d.status === 'FINAL' ? 'Final' : 'Draft'" :tone="d.status === 'FINAL' ? 'success' : 'warning'" />
            </td>
            <td class="px-3 py-2.5">
              <div class="flex justify-end gap-0.5">
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Lihat" :aria-label="`Lihat ${d.judul}`" @click="openDetail(d)">
                  <Eye class="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Edit" :aria-label="`Edit ${d.judul}`" @click="openEdit(d)">
                  <Pencil class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="d.status !== 'FINAL'"
                  type="button"
                  class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  title="Tandai sebagai final"
                  :aria-label="`Tandai final ${d.judul}`"
                  @click="tandaiFinal(d)"
                >
                  <CheckCircle2 class="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus" :aria-label="`Hapus ${d.judul}`" @click="confirmDelete(d)">
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <AppPagination v-if="total > limit" v-model="page" :total-items="total" :items-per-page="limit" @update:model-value="load()" />
    </div>

    <!-- Modal form (tambah/edit) -->
    <AppModal v-model="showForm" :title="editing ? 'Edit Dokumen' : 'Tulis Dokumen Manual'" max-width="max-w-3xl">
      <div v-if="formError" class="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>{{ formError }}</div>
      </div>
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label for="d-jenis" class="mb-1 block text-xs font-semibold text-slate-600">Jenis *</label>
            <select id="d-jenis" v-model="form.jenis" :disabled="editing" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100">
              <option v-for="(label, kode) in JENIS_LABEL" :key="kode" :value="kode">{{ label }}</option>
            </select>
          </div>
          <div>
            <label for="d-status" class="mb-1 block text-xs font-semibold text-slate-600">Status</label>
            <select id="d-status" v-model="form.status" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600">
              <option value="DRAFT">Draft</option>
              <option value="FINAL">Final</option>
            </select>
          </div>
        </div>
        <div>
          <label for="d-judul" class="mb-1 block text-xs font-semibold text-slate-600">Judul *</label>
          <input id="d-judul" v-model="form.judul" placeholder="Judul dokumen" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label for="d-jenjang" class="mb-1 block text-xs font-semibold text-slate-600">Jenjang</label>
            <input id="d-jenjang" v-model="form.jenjang" placeholder="mis. SD" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
          <div>
            <label for="d-kelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas</label>
            <input id="d-kelas" v-model="form.kelas" placeholder="mis. 4" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
          <div>
            <label for="d-mapel" class="mb-1 block text-xs font-semibold text-slate-600">Mata pelajaran</label>
            <input id="d-mapel" v-model="form.mapel" placeholder="mis. Matematika" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
        </div>
        <div>
          <label for="d-konten" class="mb-1 block text-xs font-semibold text-slate-600">Konten *</label>
          <textarea id="d-konten" v-model="form.konten" rows="14" placeholder="Tulis isi dokumen di sini…" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          <p v-if="editing" class="mt-1 text-xs text-slate-500">Menyimpan akan menaikkan versi dokumen.</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showForm = false">Batal</button>
          <button type="button" :disabled="saving" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="save">
            {{ saving ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal detail -->
    <AppModal v-model="showDetail" :title="target?.judul ?? ''" max-width="max-w-3xl">
      <div v-if="target" class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <AppBadge :label="JENIS_LABEL[target.jenis] ?? target.jenis" tone="info" />
          <AppBadge :label="target.status === 'FINAL' ? 'Final' : 'Draft'" :tone="target.status === 'FINAL' ? 'success' : 'warning'" />
          <span class="font-mono text-xs text-slate-400">v{{ target.versi }}</span>
          <span v-if="metaString(target)" class="text-xs text-slate-500">{{ metaString(target) }}</span>
        </div>
        <div class="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">{{ target.konten }}</div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showDetail = false">Tutup</button>
          <button
            v-if="target"
            type="button"
            class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            @click="showDetail = false; openEdit(target!)"
          >
            Edit
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Konfirmasi hapus -->
    <AppModal v-model="showDelete" title="Hapus Dokumen?">
      <p v-if="target" class="text-sm text-slate-600">
        Dokumen <strong class="text-slate-900">{{ target.judul }}</strong>
        akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
      </p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showDelete = false">Batal</button>
          <button type="button" :disabled="saving" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" @click="hapus">
            {{ saving ? 'Menghapus…' : 'Hapus' }}
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>
