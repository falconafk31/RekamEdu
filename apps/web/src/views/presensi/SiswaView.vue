<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Pencil, Trash2, Search, Users, X, TriangleAlert, QrCode } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface Siswa {
  id: string | number
  nisn: string
  nama: string
  kelas: string
  waliKelas?: string
  fotoUrl?: string
  isActive?: boolean
}

interface SiswaForm {
  id: string | number | null
  nisn: string
  nama: string
  kelas: string
}

const rows = ref<Siswa[]>([])
const daftarKelas = ref<string[]>([])
const loading = ref(false)
const loadError = ref('')
const q = ref('')
const filterKelas = ref(auth.isAdmin ? '' : (auth.user?.kelas || ''))
const page = ref(1)
const limit = ref(20)
const total = ref(0)

const showForm = ref(false)
const showDelete = ref(false)
const saving = ref(false)
const editing = ref(false)
const target = ref<Siswa | null>(null)
const formError = ref('')
const form = ref<SiswaForm>({ id: null, nisn: '', nama: '', kelas: '' })

watch(daftarKelas, (baru) => {
  if (!auth.isAdmin && baru.length > 0 && auth.user?.kelas) {
    filterKelas.value = auth.user.kelas
  }
}, { immediate: true })

watch(filterKelas, (baru) => {
  if (!auth.isAdmin && auth.user?.kelas && baru !== auth.user.kelas) filterKelas.value = auth.user.kelas
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const hasActiveFilter = computed(() => q.value.trim() !== '' || (auth.isAdmin && filterKelas.value !== ''))

function clearFilters() {
  q.value = ''
  filterKelas.value = auth.isAdmin ? '' : (auth.user?.kelas || '')
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
    if (filterKelas.value) query.kelas = filterKelas.value
    const res = await api<{ data: Siswa[]; total: number }>('/presensi/siswa', { query })
    rows.value = res.data || []
    total.value = res.total ?? rows.value.length
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

async function loadKelas() {
  try {
    const s = await api<{ daftarKelas?: string[] }>('/presensi/pengaturan')
    daftarKelas.value = s.daftarKelas || []
  } catch {
    daftarKelas.value = []
  }
}

function openCreate() {
  editing.value = false
  form.value = { id: null, nisn: '', nama: '', kelas: auth.isAdmin ? '' : (auth.user?.kelas || '') }
  formError.value = ''
  showForm.value = true
}

function openEdit(s: Siswa) {
  editing.value = true
  form.value = { id: s.id, nisn: s.nisn, nama: s.nama, kelas: s.kelas }
  formError.value = ''
  showForm.value = true
}

async function save() {
  if (!form.value.nisn.trim() || !form.value.nama.trim() || !form.value.kelas) {
    formError.value = 'NISN, nama, dan kelas wajib diisi'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editing.value && form.value.id !== null) {
      await api(`/presensi/siswa/${form.value.id}`, {
        method: 'PUT',
        body: { nisn: form.value.nisn.trim(), nama: form.value.nama.trim(), kelas: form.value.kelas },
      })
    } else {
      await api('/presensi/siswa', {
        method: 'POST',
        body: { nisn: form.value.nisn.trim(), nama: form.value.nama.trim(), kelas: form.value.kelas },
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

function confirmDelete(s: Siswa) {
  target.value = s
  showDelete.value = true
}

async function hapus() {
  if (!target.value) return
  saving.value = true
  try {
    await api(`/presensi/siswa/${target.value.id}`, { method: 'DELETE' })
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

function prevPage() {
  if (page.value > 1) { page.value--; void load() }
}
function nextPage() {
  if (page.value < totalPages.value) { page.value++; void load() }
}

onMounted(async () => {
  await loadKelas()
  await load()
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Data Siswa</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ total }} siswa terdaftar</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />
        Tambah Siswa
      </button>
    </div>

    <!-- Filter -->
    <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
      <div>
        <label for="cari" class="mb-1 block text-xs font-semibold text-slate-600">Pencarian</label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="cari" v-model="q" placeholder="Cari nama / NISN…" class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @input="onSearch" />
        </div>
      </div>
      <div>
        <label for="kelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas</label>
        <select id="kelas" v-model="filterKelas" :disabled="!auth.isAdmin" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" @change="resetPage">
          <option v-if="auth.isAdmin" value="">Semua Kelas</option>
          <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
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
      <Users class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Belum ada data siswa</p>
      <p class="max-w-sm text-[13px] text-slate-500">Tambahkan data siswa melalui tombol di atas, atau ubah filter pencarian.</p>
      <button type="button" class="mt-1 rounded-lg bg-brandgreen px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800" @click="openCreate">Tambah Siswa</button>
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[640px] text-left text-sm">
        <caption class="sr-only">Daftar siswa</caption>
        <thead>
          <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th class="w-12 px-3 py-2.5 text-center font-semibold">No</th>
            <th class="px-3 py-2.5 font-semibold">NISN</th>
            <th class="px-3 py-2.5 font-semibold">Nama</th>
            <th class="px-3 py-2.5 font-semibold">Kelas</th>
            <th class="px-3 py-2.5 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in rows" :key="s.id" class="border-t border-slate-100 hover:bg-slate-50/60">
            <td class="px-3 py-2.5 text-center font-mono text-slate-400">{{ (page - 1) * limit + i + 1 }}</td>
            <td class="px-3 py-2.5 font-mono text-slate-500">{{ s.nisn }}</td>
            <td class="px-3 py-2.5 font-medium text-slate-800">{{ s.nama }}</td>
            <td class="px-3 py-2.5 text-slate-600">Kelas {{ s.kelas }}</td>
            <td class="px-3 py-2.5">
              <div class="flex justify-end gap-0.5">
                <RouterLink
                  :to="`/presensi/scan?nisn=${encodeURIComponent(s.nisn)}`"
                  class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  title="Buka kartu QR siswa"
                  :aria-label="`Kartu QR ${s.nama}`"
                >
                  <QrCode class="h-4 w-4" aria-hidden="true" />
                </RouterLink>
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Edit" :aria-label="`Edit ${s.nama}`" @click="openEdit(s)">
                  <Pencil class="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus" :aria-label="`Hapus ${s.nama}`" @click="confirmDelete(s)">
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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

    <!-- Modal form -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showForm = false">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 class="mb-4 text-base font-bold text-slate-900">{{ editing ? 'Edit Siswa' : 'Tambah Siswa' }}</h2>
        <div v-if="formError" class="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{{ formError }}</div>
        </div>
        <div class="flex flex-col gap-3">
          <div>
            <label for="s-nisn" class="mb-1 block text-xs font-semibold text-slate-600">NISN *</label>
            <input id="s-nisn" v-model="form.nisn" inputmode="numeric" placeholder="Nomor Induk Siswa Nasional" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
          <div>
            <label for="s-nama" class="mb-1 block text-xs font-semibold text-slate-600">Nama lengkap *</label>
            <input id="s-nama" v-model="form.nama" placeholder="Nama siswa" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
          <div>
            <label for="s-kelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas *</label>
            <select id="s-kelas" v-model="form.kelas" :disabled="!auth.isAdmin" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100">
              <option value="" disabled>Pilih kelas…</option>
              <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
            </select>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showForm = false">Batal</button>
          <button type="button" :disabled="saving" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="save">
            {{ saving ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Konfirmasi hapus -->
    <div v-if="showDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showDelete = false">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-base font-bold text-slate-900">Hapus Data Siswa?</h2>
        <p v-if="target" class="mt-2 text-sm text-slate-600">
          Data <strong class="text-slate-900">{{ target.nama }}</strong>
          <span class="font-mono text-slate-400">({{ target.nisn }})</span>
          akan dihapus. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showDelete = false">Batal</button>
          <button type="button" :disabled="saving" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" @click="hapus">
            {{ saving ? 'Menghapus…' : 'Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
