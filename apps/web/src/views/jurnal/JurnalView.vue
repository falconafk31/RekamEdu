<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Search, BookOpenText, X, TriangleAlert, CalendarDays } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface Kehadiran {
  hadir?: number
  izin?: number
  sakit?: number
  alfa?: number
}

interface Jurnal {
  id: string
  tanggal: string
  userId: string
  kelas: string | null
  mapel: string | null
  materi: string | null
  catatan: string | null
  kehadiran: Kehadiran | null
  namaGuru: string | null
}

interface JurnalForm {
  id: string | null
  tanggal: string
  kelas: string
  mapel: string
  materi: string
  catatan: string
  hadir: string
  izin: string
  sakit: string
  alfa: string
}

const rows = ref<Jurnal[]>([])
const loading = ref(false)
const loadError = ref('')
const q = ref('')
const filterDari = ref('')
const filterSampai = ref('')
const filterKelas = ref('')
const filterMapel = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)

const showForm = ref(false)
const showDelete = ref(false)
const saving = ref(false)
const editing = ref(false)
const target = ref<Jurnal | null>(null)
const formError = ref('')
const form = ref<JurnalForm>(formKosong())

const isGuru = computed(() => auth.user?.role === 'GURU')

function hariIni(): string {
  return new Date().toISOString().slice(0, 10)
}

function formKosong(): JurnalForm {
  return {
    id: null,
    tanggal: hariIni(),
    kelas: '',
    mapel: '',
    materi: '',
    catatan: '',
    hadir: '',
    izin: '',
    sakit: '',
    alfa: '',
  }
}

function formatTanggal(iso: string): string {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function totalKehadiran(k: Kehadiran | null | undefined): number {
  if (!k) return 0
  return [k.hadir, k.izin, k.sakit, k.alfa].reduce<number>(
    (acc, n) => acc + (typeof n === 'number' ? n : 0),
    0,
  )
}

function ringkasKehadiran(k: Kehadiran | null | undefined): string {
  if (!k) return '—'
  const bagian: string[] = []
  if (typeof k.hadir === 'number') bagian.push(`H ${k.hadir}`)
  if (typeof k.izin === 'number' && k.izin > 0) bagian.push(`I ${k.izin}`)
  if (typeof k.sakit === 'number' && k.sakit > 0) bagian.push(`S ${k.sakit}`)
  if (typeof k.alfa === 'number' && k.alfa > 0) bagian.push(`A ${k.alfa}`)
  return bagian.length > 0 ? bagian.join(' · ') : '—'
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const hasActiveFilter = computed(
  () => q.value.trim() !== '' || filterDari.value !== '' || filterSampai.value !== '' || filterKelas.value !== '' || filterMapel.value !== '',
)

function clearFilters() {
  q.value = ''
  filterDari.value = ''
  filterSampai.value = ''
  filterKelas.value = ''
  filterMapel.value = ''
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
    if (filterDari.value) query.tanggalDari = filterDari.value
    if (filterSampai.value) query.tanggalSampai = filterSampai.value
    if (filterKelas.value.trim()) query.kelas = filterKelas.value.trim()
    if (filterMapel.value.trim()) query.mapel = filterMapel.value.trim()
    const res = await api<{ data: Jurnal[]; total: number }>('/jurnal', { query })
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
  form.value = formKosong()
  formError.value = ''
  showForm.value = true
}

function openEdit(j: Jurnal) {
  editing.value = true
  const k = j.kehadiran || {}
  form.value = {
    id: j.id,
    tanggal: String(j.tanggal).slice(0, 10),
    kelas: j.kelas || '',
    mapel: j.mapel || '',
    materi: j.materi || '',
    catatan: j.catatan || '',
    hadir: k.hadir !== undefined ? String(k.hadir) : '',
    izin: k.izin !== undefined ? String(k.izin) : '',
    sakit: k.sakit !== undefined ? String(k.sakit) : '',
    alfa: k.alfa !== undefined ? String(k.alfa) : '',
  }
  formError.value = ''
  showForm.value = true
}

function angkaDariInput(v: string): number | undefined {
  const t = v.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isInteger(n) && n >= 0 ? n : NaN
}

async function save() {
  if (!form.value.tanggal) {
    formError.value = 'Tanggal wajib diisi'
    return
  }
  const hadir = angkaDariInput(form.value.hadir)
  const izin = angkaDariInput(form.value.izin)
  const sakit = angkaDariInput(form.value.sakit)
  const alfa = angkaDariInput(form.value.alfa)
  for (const [label, n] of [['Hadir', hadir], ['Izin', izin], ['Sakit', sakit], ['Alfa', alfa]] as const) {
    if (typeof n === 'number' && Number.isNaN(n)) {
      formError.value = `Kolom ${label} harus berupa bilangan bulat 0 atau lebih`
      return
    }
  }
  const kehadiran: Kehadiran = {}
  if (hadir !== undefined) kehadiran.hadir = hadir
  if (izin !== undefined) kehadiran.izin = izin
  if (sakit !== undefined) kehadiran.sakit = sakit
  if (alfa !== undefined) kehadiran.alfa = alfa

  saving.value = true
  formError.value = ''
  try {
    const body = {
      tanggal: form.value.tanggal,
      kelas: form.value.kelas.trim() || undefined,
      mapel: form.value.mapel.trim() || undefined,
      materi: form.value.materi.trim() || undefined,
      catatan: form.value.catatan.trim() || undefined,
      kehadiran,
    }
    if (editing.value && form.value.id) {
      await api(`/jurnal/${form.value.id}`, { method: 'PATCH', body })
    } else {
      await api('/jurnal', { method: 'POST', body })
    }
    showForm.value = false
    await load()
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    saving.value = false
  }
}

function confirmDelete(j: Jurnal) {
  target.value = j
  showDelete.value = true
}

async function hapus() {
  if (!target.value) return
  saving.value = true
  try {
    await api(`/jurnal/${target.value.id}`, { method: 'DELETE' })
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

onMounted(() => { void load() })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Jurnal Harian Guru</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ total }} jurnal tercatat</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />
        Tambah Jurnal
      </button>
    </div>

    <div v-if="isGuru" class="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-800" role="note">
      <BookOpenText class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>Anda masuk sebagai <strong>Guru</strong> — daftar ini hanya menampilkan jurnal yang Anda buat sendiri.</div>
    </div>

    <!-- Filter -->
    <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label for="j-dari" class="mb-1 block text-xs font-semibold text-slate-600">Dari tanggal</label>
        <input id="j-dari" v-model="filterDari" type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="resetPage" />
      </div>
      <div>
        <label for="j-sampai" class="mb-1 block text-xs font-semibold text-slate-600">Sampai tanggal</label>
        <input id="j-sampai" v-model="filterSampai" type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="resetPage" />
      </div>
      <div>
        <label for="j-kelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas</label>
        <input id="j-kelas" v-model="filterKelas" placeholder="cth. 7A" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @input="onSearch" />
      </div>
      <div>
        <label for="j-mapel" class="mb-1 block text-xs font-semibold text-slate-600">Mata pelajaran</label>
        <input id="j-mapel" v-model="filterMapel" placeholder="cth. Matematika" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @input="onSearch" />
      </div>
      <div>
        <label for="j-cari" class="mb-1 block text-xs font-semibold text-slate-600">Pencarian</label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="j-cari" v-model="q" placeholder="Cari materi / catatan…" class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @input="onSearch" />
        </div>
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
      <CalendarDays class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Belum ada jurnal</p>
      <p class="max-w-sm text-[13px] text-slate-500">Catat jurnal harian Anda melalui tombol di atas, atau ubah filter pencarian.</p>
      <button type="button" class="mt-1 rounded-lg bg-brandgreen px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800" @click="openCreate">Tambah Jurnal</button>
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[760px] text-left text-sm">
        <caption class="sr-only">Daftar jurnal harian guru</caption>
        <thead>
          <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th class="w-12 px-3 py-2.5 text-center font-semibold">No</th>
            <th class="px-3 py-2.5 font-semibold">Tanggal</th>
            <th class="px-3 py-2.5 font-semibold">Kelas</th>
            <th class="px-3 py-2.5 font-semibold">Mata pelajaran</th>
            <th class="px-3 py-2.5 font-semibold">Materi</th>
            <th class="px-3 py-2.5 font-semibold">Kehadiran</th>
            <th v-if="!isGuru" class="px-3 py-2.5 font-semibold">Guru</th>
            <th class="px-3 py-2.5 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(j, i) in rows" :key="j.id" class="border-t border-slate-100 hover:bg-slate-50/60">
            <td class="px-3 py-2.5 text-center font-mono text-slate-400">{{ (page - 1) * limit + i + 1 }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">{{ formatTanggal(j.tanggal) }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-600">{{ j.kelas || '—' }}</td>
            <td class="px-3 py-2.5 text-slate-600">{{ j.mapel || '—' }}</td>
            <td class="max-w-[220px] truncate px-3 py-2.5 text-slate-800" :title="j.materi || ''">{{ j.materi || '—' }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-500" :title="`${totalKehadiran(j.kehadiran)} siswa tercatat`">{{ ringkasKehadiran(j.kehadiran) }}</td>
            <td v-if="!isGuru" class="px-3 py-2.5 text-slate-600">{{ j.namaGuru || '—' }}</td>
            <td class="px-3 py-2.5">
              <div class="flex justify-end gap-0.5">
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Edit" :aria-label="`Edit jurnal ${formatTanggal(j.tanggal)}`" @click="openEdit(j)">
                  <Pencil class="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus" :aria-label="`Hapus jurnal ${formatTanggal(j.tanggal)}`" @click="confirmDelete(j)">
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
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showForm = false">
      <div class="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 class="mb-4 text-base font-bold text-slate-900">{{ editing ? 'Edit Jurnal' : 'Tambah Jurnal' }}</h2>
        <div v-if="formError" class="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{{ formError }}</div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label for="f-tanggal" class="mb-1 block text-xs font-semibold text-slate-600">Tanggal *</label>
              <input id="f-tanggal" v-model="form.tanggal" type="date" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
            <div>
              <label for="f-kelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas</label>
              <input id="f-kelas" v-model="form.kelas" placeholder="cth. 7A" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
            <div>
              <label for="f-mapel" class="mb-1 block text-xs font-semibold text-slate-600">Mata pelajaran</label>
              <input id="f-mapel" v-model="form.mapel" placeholder="cth. Matematika" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
          </div>
          <div>
            <label for="f-materi" class="mb-1 block text-xs font-semibold text-slate-600">Materi</label>
            <input id="f-materi" v-model="form.materi" placeholder="Materi yang diajarkan" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
          <div>
            <label for="f-catatan" class="mb-1 block text-xs font-semibold text-slate-600">Catatan</label>
            <textarea id="f-catatan" v-model="form.catatan" rows="3" placeholder="Catatan kegiatan, kendala, atau tindak lanjut" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
          <fieldset>
            <legend class="mb-1 block text-xs font-semibold text-slate-600">Kehadiran siswa</legend>
            <div class="grid grid-cols-4 gap-3">
              <div>
                <label for="f-hadir" class="mb-1 block text-xs text-slate-500">Hadir</label>
                <input id="f-hadir" v-model="form.hadir" type="number" min="0" placeholder="0" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
              </div>
              <div>
                <label for="f-izin" class="mb-1 block text-xs text-slate-500">Izin</label>
                <input id="f-izin" v-model="form.izin" type="number" min="0" placeholder="0" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
              </div>
              <div>
                <label for="f-sakit" class="mb-1 block text-xs text-slate-500">Sakit</label>
                <input id="f-sakit" v-model="form.sakit" type="number" min="0" placeholder="0" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
              </div>
              <div>
                <label for="f-alfa" class="mb-1 block text-xs text-slate-500">Alfa</label>
                <input id="f-alfa" v-model="form.alfa" type="number" min="0" placeholder="0" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
              </div>
            </div>
          </fieldset>
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
        <h2 class="text-base font-bold text-slate-900">Hapus Jurnal?</h2>
        <p v-if="target" class="mt-2 text-sm text-slate-600">
          Jurnal tanggal <strong class="font-mono text-slate-900">{{ formatTanggal(target.tanggal) }}</strong>
          <span v-if="target.kelas"> kelas {{ target.kelas }}</span>
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
