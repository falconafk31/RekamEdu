<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Trash2, TriangleAlert, RefreshCw, History, Search } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface Snapshot {
  id: string | number
  tahunAjaran: string
  kelas: string
  siswaId?: string | number
  nisn?: string
  namaSiswa?: string
  nama?: string
  waliKelas?: string
  status?: string
  catatan?: string
}

interface SiswaRow {
  id: string | number
  nisn: string
  nama: string
  kelas: string
}

const daftarKelas = ref<string[]>([])
const daftarTahun = ref<string[]>([])
const tahunAjaran = ref('')
const kelas = ref(auth.isAdmin ? '' : (auth.user?.kelas || ''))
const snapshots = ref<Snapshot[]>([])
const loading = ref(false)
const loadError = ref('')
const search = ref('')

const showAdd = ref(false)
const showDelete = ref(false)
const saving = ref(false)
const target = ref<Snapshot | null>(null)
const formError = ref('')
const form = ref({ studentId: '' as string | number | '', tahunAjaran: '', kelas: '', waliKelas: '', status: 'Aktif' })
const siswaList = ref<SiswaRow[]>([])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return snapshots.value
  return snapshots.value.filter((s) =>
    (s.namaSiswa || s.nama || '').toLowerCase().includes(q) ||
    (s.nisn || '').toLowerCase().includes(q),
  )
})

async function load() {
  if (!tahunAjaran.value) {
    loadError.value = 'Pilih tahun ajaran terlebih dahulu'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const res = await api<{ data: Snapshot[] }>('/presensi/riwayat-kelas', {
      query: { tahunAjaran: tahunAjaran.value, kelas: kelas.value },
    })
    snapshots.value = res.data || []
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

async function loadRefs() {
  try {
    const [s, p] = await Promise.all([
      api<{ daftarKelas?: string[] }>('/presensi/pengaturan'),
      api<{ data: { tahunAjaran?: string; tahun_ajaran?: string }[] } | { tahunAjaran?: string; tahun_ajaran?: string }[]>('/presensi/periode').catch(() => ({ data: [] as { tahunAjaran?: string; tahun_ajaran?: string }[] })),
    ])
    daftarKelas.value = s.daftarKelas || []
    const arr = Array.isArray(p) ? p : (p.data || [])
    daftarTahun.value = [...new Set(arr.map((x) => x.tahunAjaran || x.tahun_ajaran || '').filter(Boolean))]
    if (!tahunAjaran.value && daftarTahun.value.length > 0) {
      tahunAjaran.value = daftarTahun.value[daftarTahun.value.length - 1]
    }
  } catch {
    daftarKelas.value = []
    daftarTahun.value = []
  }
}

async function loadSiswaUntukForm() {
  try {
    const res = await api<{ data: SiswaRow[] }>('/presensi/siswa', { query: { kelas: form.value.kelas, limit: 500, page: 1 } })
    siswaList.value = res.data || []
  } catch {
    siswaList.value = []
  }
}

function openAdd() {
  form.value = {
    studentId: '',
    tahunAjaran: tahunAjaran.value,
    kelas: kelas.value,
    waliKelas: '',
    status: 'Aktif',
  }
  formError.value = ''
  showAdd.value = true
  void loadSiswaUntukForm()
}

async function saveSnapshot() {
  if (!form.value.studentId || !form.value.tahunAjaran || !form.value.kelas) {
    formError.value = 'Siswa, tahun ajaran, dan kelas wajib diisi'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await api('/presensi/riwayat-kelas', {
      method: 'POST',
      body: {
        studentId: form.value.studentId,
        tahunAjaran: form.value.tahunAjaran,
        kelas: form.value.kelas,
        waliKelas: form.value.waliKelas || undefined,
        status: form.value.status,
      },
    })
    showAdd.value = false
    await load()
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    saving.value = false
  }
}

function confirmDelete(s: Snapshot) {
  target.value = s
  showDelete.value = true
}

async function hapus() {
  if (!target.value) return
  saving.value = true
  try {
    await api(`/presensi/riwayat-kelas/${target.value.id}`, { method: 'DELETE' })
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

onMounted(async () => {
  await loadRefs()
  if (tahunAjaran.value) await load()
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Riwayat Kelas</h1>
        <p class="mt-0.5 text-sm text-slate-500">Snapshot data kelas per tahun ajaran</p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          @click="load"
        >
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" aria-hidden="true" />
          Muat
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          @click="openAdd"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          Tambah Snapshot
        </button>
      </div>
    </div>

    <!-- Filter -->
    <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
      <div>
        <label for="ta" class="mb-1 block text-xs font-semibold text-slate-600">Tahun ajaran</label>
        <select id="ta" v-model="tahunAjaran" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="load">
          <option value="" disabled>Pilih tahun ajaran…</option>
          <option v-for="t in daftarTahun" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div>
        <label for="kelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas</label>
        <select id="kelas" v-model="kelas" :disabled="!auth.isAdmin" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" @change="load">
          <option value="">Semua Kelas</option>
          <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
        </select>
      </div>
      <div>
        <label for="cari" class="mb-1 block text-xs font-semibold text-slate-600">Pencarian</label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="cari" v-model="search" placeholder="Cari nama / NISN…" class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
        </div>
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
        <div v-for="i in 5" :key="i" class="h-8 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
    <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <History class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Belum ada snapshot</p>
      <p class="max-w-sm text-[13px] text-slate-500">Tambahkan snapshot untuk mengarsipkan susunan kelas pada tahun ajaran yang dipilih.</p>
      <button type="button" class="mt-1 rounded-lg bg-brandgreen px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800" @click="openAdd">Tambah Snapshot</button>
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[680px] text-left text-sm">
        <caption class="sr-only">Snapshot riwayat kelas tahun ajaran {{ tahunAjaran }}</caption>
        <thead>
          <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th class="w-12 px-3 py-2.5 text-center font-semibold">No</th>
            <th class="px-3 py-2.5 font-semibold">NISN</th>
            <th class="px-3 py-2.5 font-semibold">Nama Siswa</th>
            <th class="px-3 py-2.5 font-semibold">Kelas</th>
            <th class="px-3 py-2.5 font-semibold">Wali Kelas</th>
            <th class="px-3 py-2.5 font-semibold">Status</th>
            <th class="px-3 py-2.5 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in filtered" :key="s.id" class="border-t border-slate-100 hover:bg-slate-50/60">
            <td class="px-3 py-2.5 text-center font-mono text-slate-400">{{ i + 1 }}</td>
            <td class="px-3 py-2.5 font-mono text-slate-500">{{ s.nisn || '—' }}</td>
            <td class="px-3 py-2.5 font-medium text-slate-800">{{ s.namaSiswa || s.nama || '—' }}</td>
            <td class="px-3 py-2.5 text-slate-600">Kelas {{ s.kelas }}</td>
            <td class="px-3 py-2.5 text-slate-600">{{ s.waliKelas || '—' }}</td>
            <td class="px-3 py-2.5">
              <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                {{ s.status || 'Aktif' }}
              </span>
            </td>
            <td class="px-3 py-2.5 text-right">
              <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus snapshot" :aria-label="`Hapus snapshot ${s.namaSiswa || s.nama || ''}`" @click="confirmDelete(s)">
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal tambah -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showAdd = false">
      <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h2 class="mb-4 text-base font-bold text-slate-900">Tambah Snapshot</h2>
        <div v-if="formError" class="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{{ formError }}</div>
        </div>
        <div class="flex flex-col gap-3">
          <div>
            <label for="a-kelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas *</label>
            <select id="a-kelas" v-model="form.kelas" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="loadSiswaUntukForm">
              <option value="" disabled>Pilih kelas…</option>
              <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
            </select>
          </div>
          <div>
            <label for="a-siswa" class="mb-1 block text-xs font-semibold text-slate-600">Siswa *</label>
            <select id="a-siswa" v-model="form.studentId" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600">
              <option value="" disabled>Pilih siswa…</option>
              <option v-for="s in siswaList" :key="s.id" :value="s.id">{{ s.nama }} ({{ s.nisn }})</option>
            </select>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label for="a-ta" class="mb-1 block text-xs font-semibold text-slate-600">Tahun ajaran *</label>
              <input id="a-ta" v-model="form.tahunAjaran" placeholder="2025/2026" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
            <div>
              <label for="a-status" class="mb-1 block text-xs font-semibold text-slate-600">Status</label>
              <select id="a-status" v-model="form.status" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600">
                <option value="Aktif">Aktif</option>
                <option value="Naik Kelas">Naik Kelas</option>
                <option value="Lulus">Lulus</option>
                <option value="Pindah">Pindah</option>
                <option value="Keluar">Keluar</option>
              </select>
            </div>
          </div>
          <div>
            <label for="a-wali" class="mb-1 block text-xs font-semibold text-slate-600">Wali kelas</label>
            <input id="a-wali" v-model="form.waliKelas" placeholder="Nama wali kelas saat itu" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showAdd = false">Batal</button>
          <button type="button" :disabled="saving" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="saveSnapshot">
            {{ saving ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Konfirmasi hapus -->
    <div v-if="showDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showDelete = false">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-base font-bold text-slate-900">Hapus Snapshot?</h2>
        <p v-if="target" class="mt-2 text-sm text-slate-600">
          Snapshot <strong class="text-slate-900">{{ target.namaSiswa || target.nama || '—' }}</strong>
          untuk tahun ajaran <strong class="font-mono">{{ target.tahunAjaran }}</strong> akan dihapus. Tindakan ini tidak dapat dibatalkan.
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
