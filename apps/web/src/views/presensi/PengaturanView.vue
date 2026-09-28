<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Trash2, TriangleAlert, CheckCircle2, Settings2, ShieldAlert } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
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

interface Pengaturan {
  namaSekolah?: string
  npsn?: string
  alamat?: string
  telepon?: string
  daftarKelas?: string[]
  hariLiburMingguan?: number[]
  hariLibur?: number[]
}

const pengaturan = ref<Pengaturan>({})
const periodeList = ref<Periode[]>([])
const loading = ref(false)
const savingSekolah = ref(false)
const savingKelas = ref(false)
const savingHari = ref(false)
const savingPeriode = ref(false)
const activatingId = ref<string | number | null>(null)
const loadError = ref('')
const formError = ref('')
const successMsg = ref('')

const kelasBaru = ref('')
const periodeBaru = ref({ tahunAjaran: '', semester: 'Ganjil', dari: '', sampai: '' })

const HARI_LIST = [
  { value: 0, label: 'Minggu' },
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
]

const hariLibur = computed({
  get: () => pengaturan.value.hariLiburMingguan ?? pengaturan.value.hariLibur ?? [0],
  set: (v: number[]) => {
    pengaturan.value.hariLiburMingguan = v
  },
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [peng, per] = await Promise.all([
      api<Pengaturan>('/presensi/pengaturan'),
      api<{ data: Periode[] } | Periode[]>('/presensi/periode'),
    ])
    pengaturan.value = peng || {}
    const arr = Array.isArray(per) ? per : (per.data || [])
    periodeList.value = arr
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

function flash(msg: string) {
  successMsg.value = msg
  setTimeout(() => { successMsg.value = '' }, 4000)
}

async function simpanSekolah() {
  savingSekolah.value = true
  formError.value = ''
  try {
    const res = await api<Pengaturan>('/presensi/pengaturan', {
      method: 'PUT',
      body: {
        namaSekolah: pengaturan.value.namaSekolah || '',
        npsn: pengaturan.value.npsn || '',
        alamat: pengaturan.value.alamat || '',
        telepon: pengaturan.value.telepon || '',
      },
    })
    pengaturan.value = { ...pengaturan.value, ...(res || {}) }
    flash('Identitas sekolah berhasil disimpan.')
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    savingSekolah.value = false
  }
}

async function simpanKelas() {
  savingKelas.value = true
  formError.value = ''
  try {
    const res = await api<Pengaturan>('/presensi/pengaturan', {
      method: 'PUT',
      body: { daftarKelas: pengaturan.value.daftarKelas || [] },
    })
    pengaturan.value = { ...pengaturan.value, ...(res || {}) }
    flash('Daftar kelas berhasil disimpan.')
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    savingKelas.value = false
  }
}

function tambahKelas() {
  const v = kelasBaru.value.trim()
  if (!v) return
  const cur = pengaturan.value.daftarKelas || []
  if (cur.includes(v)) {
    formError.value = `Kelas "${v}" sudah ada`
    return
  }
  pengaturan.value.daftarKelas = [...cur, v].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
  kelasBaru.value = ''
  void simpanKelas()
}

async function hapusKelas(k: string) {
  pengaturan.value.daftarKelas = (pengaturan.value.daftarKelas || []).filter((x) => x !== k)
  await simpanKelas()
}

async function simpanHariLibur() {
  savingHari.value = true
  formError.value = ''
  try {
    const res = await api<Pengaturan>('/presensi/pengaturan', {
      method: 'PUT',
      body: { hariLiburMingguan: hariLibur.value },
    })
    pengaturan.value = { ...pengaturan.value, ...(res || {}) }
    flash('Hari libur mingguan berhasil disimpan.')
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    savingHari.value = false
  }
}

function toggleHari(v: number) {
  const cur = [...hariLibur.value]
  const i = cur.indexOf(v)
  if (i >= 0) cur.splice(i, 1)
  else cur.push(v)
  hariLibur.value = cur
  void simpanHariLibur()
}

async function tambahPeriode() {
  if (!periodeBaru.value.tahunAjaran.trim()) {
    formError.value = 'Tahun ajaran periode wajib diisi'
    return
  }
  savingPeriode.value = true
  formError.value = ''
  try {
    await api('/presensi/periode', {
      method: 'POST',
      body: {
        tahunAjaran: periodeBaru.value.tahunAjaran.trim(),
        semester: periodeBaru.value.semester,
        dari: periodeBaru.value.dari || undefined,
        sampai: periodeBaru.value.sampai || undefined,
      },
    })
    periodeBaru.value = { tahunAjaran: '', semester: 'Ganjil', dari: '', sampai: '' }
    await load()
    flash('Periode semester berhasil ditambahkan.')
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    savingPeriode.value = false
  }
}

async function aktifkanPeriode(p: Periode) {
  activatingId.value = p.id
  formError.value = ''
  try {
    await api(`/presensi/periode/${p.id}`, { method: 'PATCH', body: { aktif: true } })
    periodeList.value = periodeList.value.map((x) => ({ ...x, aktif: String(x.id) === String(p.id) }))
    flash(`Periode "${labelPeriode(p)}" diaktifkan.`)
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    activatingId.value = null
  }
}

function labelPeriode(p: Periode): string {
  return p.label || p.nama || [p.tahunAjaran, p.semester].filter(Boolean).join(' ') || `Periode ${p.id}`
}

onMounted(() => { void load() })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <h1 class="flex items-center gap-2 text-xl font-bold text-slate-900">
        <Settings2 class="h-5 w-5 text-emerald-700" aria-hidden="true" />
        Pengaturan
      </h1>
      <p class="mt-0.5 text-sm text-slate-500">Kelola identitas sekolah, kelas, hari libur, dan periode semester</p>
    </div>

    <div v-if="!auth.isAdmin" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <ShieldAlert class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Halaman khusus administrator</p>
      <p class="max-w-sm text-[13px] text-slate-500">Pengaturan sekolah hanya dapat diubah oleh admin atau kepala sekolah.</p>
    </div>

    <template v-else>
      <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div class="flex-1">{{ loadError }}</div>
        <button type="button" class="font-semibold underline" @click="load()">Coba lagi</button>
      </div>
      <div v-if="formError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>{{ formError }}</div>
      </div>
      <div v-if="successMsg" class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700" role="status">
        <CheckCircle2 class="h-4 w-4 shrink-0" aria-hidden="true" />
        <div>{{ successMsg }}</div>
      </div>

      <div v-if="loading" class="flex flex-col gap-3" aria-live="polite">
        <div v-for="i in 3" :key="i" class="h-40 animate-pulse rounded-xl bg-slate-100" />
      </div>

      <template v-else>
        <!-- Identitas sekolah -->
        <section class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="h-identitas">
          <h2 id="h-identitas" class="text-[15px] font-bold text-slate-900">Identitas Sekolah</h2>
          <p class="mb-3 text-xs text-slate-500">Ditampilkan pada laporan dan dokumen presensi.</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="nama-sekolah" class="mb-1 block text-xs font-semibold text-slate-600">Nama sekolah</label>
              <input id="nama-sekolah" v-model="pengaturan.namaSekolah" placeholder="Nama sekolah" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
            <div>
              <label for="npsn" class="mb-1 block text-xs font-semibold text-slate-600">NPSN</label>
              <input id="npsn" v-model="pengaturan.npsn" inputmode="numeric" placeholder="Nomor Pokok Sekolah Nasional" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
            <div>
              <label for="telepon" class="mb-1 block text-xs font-semibold text-slate-600">Telepon</label>
              <input id="telepon" v-model="pengaturan.telepon" placeholder="Nomor telepon sekolah" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
            <div class="sm:col-span-2">
              <label for="alamat" class="mb-1 block text-xs font-semibold text-slate-600">Alamat</label>
              <textarea id="alamat" v-model="pengaturan.alamat" rows="2" placeholder="Alamat lengkap sekolah" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
          </div>
          <div class="mt-3 flex justify-end">
            <button type="button" :disabled="savingSekolah" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="simpanSekolah">
              {{ savingSekolah ? 'Menyimpan…' : 'Simpan Identitas' }}
            </button>
          </div>
        </section>

        <!-- Daftar kelas -->
        <section class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="h-kelas">
          <h2 id="h-kelas" class="text-[15px] font-bold text-slate-900">Daftar Kelas</h2>
          <p class="mb-3 text-xs text-slate-500">Kelas dipakai pada filter, wali kelas, dan rekap.</p>
          <div class="mb-3 flex gap-2">
            <input
              v-model="kelasBaru"
              placeholder="Nama kelas baru, mis. 7A"
              class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              @keyup.enter="tambahKelas"
            />
            <button type="button" :disabled="savingKelas || !kelasBaru.trim()" class="inline-flex items-center gap-1.5 rounded-lg bg-brandgreen px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="tambahKelas">
              <Plus class="h-4 w-4" aria-hidden="true" /> Tambah
            </button>
          </div>
          <div v-if="(pengaturan.daftarKelas || []).length === 0" class="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
            Belum ada kelas. Tambahkan kelas pertama di atas.
          </div>
          <ul v-else class="flex flex-wrap gap-2">
            <li
              v-for="k in pengaturan.daftarKelas"
              :key="k"
              class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
            >
              Kelas {{ k }}
              <button type="button" class="rounded-full p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600" title="Hapus kelas" :aria-label="`Hapus kelas ${k}`" @click="hapusKelas(k)">
                <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>

        <!-- Hari libur mingguan -->
        <section class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="h-libur">
          <h2 id="h-libur" class="text-[15px] font-bold text-slate-900">Hari Libur Mingguan</h2>
          <p class="mb-3 text-xs text-slate-500">Hari yang otomatis dianggap libur pada kalender presensi.</p>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Hari libur mingguan">
            <button
              v-for="h in HARI_LIST"
              :key="h.value"
              type="button"
              :aria-pressed="hariLibur.includes(h.value) ? 'true' : 'false'"
              :disabled="savingHari"
              class="rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors disabled:opacity-60"
              :class="hariLibur.includes(h.value)
                ? 'bg-rose-600 text-white ring-rose-600 hover:bg-rose-700'
                : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'"
              @click="toggleHari(h.value)"
            >
              {{ h.label }}
            </button>
          </div>
          <p v-if="savingHari" class="mt-2 text-xs italic text-slate-400">Menyimpan…</p>
        </section>

        <!-- Periode semester -->
        <section class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="h-periode">
          <h2 id="h-periode" class="text-[15px] font-bold text-slate-900">Periode Semester</h2>
          <p class="mb-3 text-xs text-slate-500">Periode aktif dipakai untuk rekap semester.</p>
          <div class="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <div class="lg:col-span-2">
              <label for="p-ta" class="mb-1 block text-xs font-semibold text-slate-600">Tahun ajaran *</label>
              <input id="p-ta" v-model="periodeBaru.tahunAjaran" placeholder="2025/2026" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
            <div>
              <label for="p-sem" class="mb-1 block text-xs font-semibold text-slate-600">Semester</label>
              <select id="p-sem" v-model="periodeBaru.semester" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600">
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <div>
              <label for="p-dari" class="mb-1 block text-xs font-semibold text-slate-600">Dari</label>
              <input id="p-dari" v-model="periodeBaru.dari" type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
            <div>
              <label for="p-sampai" class="mb-1 block text-xs font-semibold text-slate-600">Sampai</label>
              <input id="p-sampai" v-model="periodeBaru.sampai" type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
          </div>
          <div class="mb-4 flex justify-end">
            <button type="button" :disabled="savingPeriode" class="inline-flex items-center gap-1.5 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="tambahPeriode">
              <Plus class="h-4 w-4" aria-hidden="true" /> {{ savingPeriode ? 'Menyimpan…' : 'Tambah Periode' }}
            </button>
          </div>
          <div v-if="periodeList.length === 0" class="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
            Belum ada periode semester.
          </div>
          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="p in periodeList"
              :key="p.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5"
              :class="p.aktif ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'"
            >
              <div>
                <p class="text-sm font-semibold text-slate-800">{{ labelPeriode(p) }}</p>
                <p v-if="p.dari || p.sampai" class="font-mono text-xs text-slate-400">{{ p.dari || '—' }} s.d. {{ p.sampai || '—' }}</p>
              </div>
              <span v-if="p.aktif" class="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                <CheckCircle2 class="h-3.5 w-3.5" aria-hidden="true" /> Aktif
              </span>
              <button
                v-else
                type="button"
                :disabled="activatingId === p.id"
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                @click="aktifkanPeriode(p)"
              >
                {{ activatingId === p.id ? 'Mengaktifkan…' : 'Aktifkan' }}
              </button>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>
