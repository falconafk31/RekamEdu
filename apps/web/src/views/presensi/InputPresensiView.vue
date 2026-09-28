<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { Save, Search, Users, CheckCheck, UserX, TriangleAlert } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { todayISO, formatTanggalPanjang, isWeekend } from '../../lib/dates'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

type StatusPresensi = 'Hadir' | 'Izin' | 'Sakit' | 'Alfa'

interface Siswa {
  id: string | number
  nisn: string
  nama: string
  jk: 'L' | 'P'
  kelas: string
}

interface PresensiRow {
  studentId: string | number
  nisn: string
  nama: string
  status: StatusPresensi
}

const STATUS_LIST: StatusPresensi[] = ['Hadir', 'Izin', 'Sakit', 'Alfa']
const STATUS_SEGMENT: Record<StatusPresensi, string> = {
  Hadir: 'data-[aktif]:bg-emerald-600 data-[aktif]:text-white',
  Izin: 'data-[aktif]:bg-sky-600 data-[aktif]:text-white',
  Sakit: 'data-[aktif]:bg-amber-500 data-[aktif]:text-white',
  Alfa: 'data-[aktif]:bg-rose-600 data-[aktif]:text-white',
}
const statusCardTone: Record<StatusPresensi, string> = {
  Hadir: 'border-emerald-700/40 bg-emerald-50/60',
  Izin: 'border-sky-700/40 bg-sky-50/60',
  Sakit: 'border-amber-600/40 bg-amber-50/60',
  Alfa: 'border-rose-700/40 bg-rose-50/60',
}

const daftarKelas = ref<string[]>([])
const kelas = ref(auth.isAdmin ? '' : (auth.user?.kelas || ''))
const students = ref<Siswa[]>([])
const presensi = ref<Record<string, StatusPresensi>>({})
const presensiBaseline = ref<Record<string, StatusPresensi>>({})
const tanggal = ref(todayISO())
const isSubmitted = ref(false)
const hariLibur = ref(false)
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const showConfirmModal = ref(false)
const showLeaveConfirm = ref(false)
let pendingLeaveResolve: ((v: boolean) => void) | null = null
const searchSiswa = ref('')

watch(daftarKelas, (baru) => {
  if (auth.isAdmin && !kelas.value && baru.length > 0) kelas.value = baru[0]
}, { immediate: true })

// Kunci kelas untuk peran Guru
watch(kelas, (baru) => {
  if (!auth.isAdmin && auth.user?.kelas && baru !== auth.user.kelas) kelas.value = auth.user.kelas
})

const ringkasan = computed(() => {
  const r: Record<StatusPresensi, number> = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
  for (const s of students.value) {
    const st = presensi.value[String(s.id)] || 'Hadir'
    r[st]++
  }
  return r
})

const isDirty = computed(() => {
  const a = presensi.value
  const b = presensiBaseline.value
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) if ((a[k] || 'Hadir') !== (b[k] || 'Hadir')) return true
  return false
})
const changedCount = computed(() => {
  let n = 0
  for (const s of students.value) {
    const id = String(s.id)
    if ((presensi.value[id] || 'Hadir') !== (presensiBaseline.value[id] || 'Hadir')) n++
  }
  return n
})

const filteredStudents = computed(() => {
  const q = searchSiswa.value.trim().toLowerCase()
  if (!q) return students.value
  return students.value.filter((s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q))
})

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isDirty.value && !saving.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(() => {
  if (!isDirty.value || saving.value) return true
  if (pendingLeaveResolve) {
    pendingLeaveResolve(false)
    pendingLeaveResolve = null
  }
  showLeaveConfirm.value = true
  return new Promise<boolean>((resolve) => { pendingLeaveResolve = resolve })
})

function resolveLeave(allowed: boolean) {
  const resolve = pendingLeaveResolve
  pendingLeaveResolve = null
  showLeaveConfirm.value = false
  resolve?.(allowed)
}

watch(showLeaveConfirm, (open) => {
  if (!open && pendingLeaveResolve) {
    pendingLeaveResolve(false)
    pendingLeaveResolve = null
  }
})

async function loadKelas() {
  try {
    const s = await api<{ daftarKelas?: string[] }>('/presensi/pengaturan')
    daftarKelas.value = s.daftarKelas || []
  } catch {
    daftarKelas.value = []
  }
}

async function cekKalender() {
  const [y, m] = tanggal.value.split('-').map(Number)
  try {
    const kal = await api<{ data: Array<{ tanggal: string; status: string }> }>(
      '/presensi/kalender',
      { query: { tahun: y, bulan: m } },
    )
    const rec = kal.data.find((k) => k.tanggal === tanggal.value)
    hariLibur.value = rec?.status === 'Libur' || (!rec && isWeekend(tanggal.value))
  } catch {
    hariLibur.value = isWeekend(tanggal.value)
  }
}

async function loadStudents() {
  if (!kelas.value) {
    students.value = []
    presensi.value = {}
    presensiBaseline.value = {}
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    await cekKalender()
    const res = await api<{ data: Siswa[]; total: number }>('/presensi/siswa', {
      query: { kelas: kelas.value, status: 'aktif', page: 1, limit: 1000 },
    })
    students.value = (res.data || []).slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id'))

    const map: Record<string, StatusPresensi> = {}
    for (const s of students.value) map[String(s.id)] = 'Hadir'

    const att = await api<{ data: PresensiRow[] }>('/presensi/presensi', {
      query: { tanggal: tanggal.value, kelas: kelas.value },
    })
    for (const l of att.data || []) map[String(l.studentId)] = l.status
    presensi.value = map
    presensiBaseline.value = { ...map }
    isSubmitted.value = (att.data || []).length > 0
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

function setSemua(status: StatusPresensi) {
  const map = { ...presensi.value }
  for (const s of students.value) map[String(s.id)] = status
  presensi.value = map
}

function setStatus(id: string | number, status: StatusPresensi) {
  presensi.value = { ...presensi.value, [String(id)]: status }
}

function triggerSimpan() {
  if (isSubmitted.value) showConfirmModal.value = true
  else void simpan()
}

async function simpan() {
  showConfirmModal.value = false
  if (hariLibur.value) return
  if (!students.value.length) return
  saving.value = true
  loadError.value = ''
  try {
    const items = students.value.map((s) => ({
      studentId: s.id,
      status: presensi.value[String(s.id)] || 'Hadir',
    }))
    await api('/presensi/presensi', {
      method: 'POST',
      body: { tanggal: tanggal.value, kelas: kelas.value, items },
    })
    isSubmitted.value = true
    presensiBaseline.value = { ...presensi.value }
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    saving.value = false
  }
}

watch([tanggal, kelas], () => { void loadStudents() })

onMounted(() => {
  void loadKelas().then(() => loadStudents())
  window.addEventListener('beforeunload', onBeforeUnload)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  if (pendingLeaveResolve) {
    pendingLeaveResolve(false)
    pendingLeaveResolve = null
  }
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Input Presensi</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ formatTanggalPanjang(tanggal) }}</p>
      </div>
      <span
        v-if="!loading && !hariLibur && students.length"
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
        :class="isDirty ? 'bg-amber-50 text-amber-700 ring-amber-200' : isSubmitted ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'"
      >
        {{ isDirty ? `${changedCount} perubahan belum disimpan` : isSubmitted ? 'Tersimpan' : 'Belum ada perubahan' }}
      </span>
    </div>

    <div v-if="!auth.canPresensi" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <UserX class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Anda tidak memiliki akses input presensi</p>
      <p class="max-w-sm text-[13px] text-slate-500">Hubungi administrator bila Anda seharusnya dapat mengisi presensi.</p>
    </div>

    <template v-else>
      <!-- Filter -->
      <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <div>
          <label for="tgl" class="mb-1 block text-xs font-semibold text-slate-600">Tanggal</label>
          <input id="tgl" v-model="tanggal" type="date" :max="todayISO()" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
        </div>
        <div>
          <label for="kls" class="mb-1 block text-xs font-semibold text-slate-600">Kelas</label>
          <select id="kls" v-model="kelas" :disabled="!auth.isAdmin" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100">
            <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
          </select>
        </div>
        <div>
          <label for="cari" class="mb-1 block text-xs font-semibold text-slate-600">Cari siswa</label>
          <div class="relative">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input id="cari" v-model="searchSiswa" placeholder="Nama atau NISN…" class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
        </div>
      </div>

      <!-- Banner status -->
      <div v-if="hariLibur" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div><strong>Hari libur.</strong> Tanggal ini ditandai libur di kalender akademik. Input presensi dinonaktifkan.</div>
      </div>
      <div v-else-if="!loading && isSubmitted && !isDirty" class="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
        <CheckCheck class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div><strong>Sudah presensi.</strong> Kelas {{ kelas }} sudah mengisi presensi pada tanggal ini. Perubahan akan menimpa data sebelumnya.</div>
      </div>
      <div v-else-if="!loading && !isSubmitted && students.length > 0" class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div><strong>Belum presensi.</strong> Tandai kehadiran setiap siswa, lalu tekan <strong>Simpan Presensi</strong> di bagian bawah.</div>
      </div>
      <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div class="flex-1">{{ loadError }}</div>
        <button type="button" class="font-semibold underline" @click="loadStudents()">Coba lagi</button>
      </div>

      <template v-if="!hariLibur">
        <!-- Bulk + ringkasan -->
        <div v-if="!loading && students.length > 0" class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="mr-1 text-[13px] font-medium text-slate-500">Tandai semua:</span>
            <button
              v-for="s in STATUS_LIST"
              :key="s"
              type="button"
              class="rounded-full border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              @click="setSemua(s)"
            >
              {{ s }}
            </button>
          </div>
          <div class="flex items-center gap-2 border-t border-slate-100 pt-2.5 sm:ml-auto sm:border-0 sm:pt-0" aria-live="polite">
            <CheckCheck class="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <p class="font-mono text-[13px] font-medium text-slate-600">
              H <span class="font-bold text-emerald-700">{{ ringkasan.Hadir }}</span>
              · I <span class="font-bold text-sky-700">{{ ringkasan.Izin }}</span>
              · S <span class="font-bold text-amber-600">{{ ringkasan.Sakit }}</span>
              · A <span class="font-bold text-rose-700">{{ ringkasan.Alfa }}</span>
            </p>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex flex-col gap-2" aria-live="polite">
          <div v-for="i in 5" :key="i" class="h-16 animate-pulse rounded-xl bg-slate-100" />
        </div>

        <!-- Kosong -->
        <div v-else-if="!students.length" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
          <Users class="h-10 w-10 text-slate-300" aria-hidden="true" />
          <p class="text-sm font-semibold text-slate-800">Belum ada siswa aktif</p>
          <p class="max-w-sm text-[13px] text-slate-500">Tidak ada siswa aktif di kelas {{ kelas || '—' }}. Tambahkan data siswa terlebih dahulu.</p>
        </div>
        <div v-else-if="!filteredStudents.length" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
          <Search class="h-10 w-10 text-slate-300" aria-hidden="true" />
          <p class="text-sm font-semibold text-slate-800">Siswa tidak ditemukan</p>
          <p class="text-[13px] text-slate-500">Tidak ada hasil untuk “{{ searchSiswa }}”.</p>
          <button type="button" class="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="searchSiswa = ''">Hapus Pencarian</button>
        </div>

        <!-- Daftar siswa -->
        <ol v-else class="flex flex-col gap-2" aria-label="Daftar siswa">
          <li
            v-for="(s, i) in filteredStudents"
            :key="s.id"
            class="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-3.5"
            :class="[
              (presensi[String(s.id)] || 'Hadir') !== (presensiBaseline[String(s.id)] || 'Hadir') ? 'ring-1 ring-amber-300' : '',
              statusCardTone[presensi[String(s.id)] || 'Hadir'],
            ]"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span class="hidden w-6 shrink-0 text-right font-mono text-xs text-slate-300 sm:inline" aria-hidden="true">{{ i + 1 }}</span>
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="s.jk === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'"
                aria-hidden="true"
              >
                {{ (s.nama || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-900">{{ s.nama }}</p>
                <p class="truncate font-mono text-xs text-slate-400">{{ s.nisn }} · {{ s.jk === 'L' ? 'Laki-laki' : 'Perempuan' }}</p>
              </div>
            </div>
            <div class="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 sm:w-auto" role="group" :aria-label="`Status kehadiran ${s.nama}`">
              <button
                v-for="st in STATUS_LIST"
                :key="st"
                type="button"
                :data-aktif="(presensi[String(s.id)] || 'Hadir') === st || undefined"
                :aria-pressed="(presensi[String(s.id)] || 'Hadir') === st"
                class="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800 data-[aktif]:text-white"
                :class="STATUS_SEGMENT[st]"
                @click="setStatus(s.id, st)"
              >
                {{ st }}
              </button>
            </div>
          </li>
        </ol>

        <p v-if="!loading && students.length" class="flex items-center gap-1.5 text-xs text-slate-400">
          <UserX class="h-3.5 w-3.5" aria-hidden="true" />
          {{ filteredStudents.length }} dari {{ students.length }} siswa ditampilkan
          <span v-if="isDirty" class="font-medium text-amber-600">· {{ changedCount }} belum disimpan</span>
        </p>
      </template>

      <!-- Bar simpan -->
      <div
        v-if="!hariLibur && students.length"
        class="sticky bottom-2 z-10 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm"
      >
        <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p class="hidden text-[13px] text-slate-500 sm:block">Pastikan semua kehadiran sudah sesuai sebelum menyimpan.</p>
          <p class="font-mono text-[13px] font-medium text-slate-600 sm:hidden" aria-live="polite">
            H {{ ringkasan.Hadir }} · I {{ ringkasan.Izin }} · S {{ ringkasan.Sakit }} · A {{ ringkasan.Alfa }}
          </p>
          <button
            type="button"
            :disabled="saving"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brandgreen px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            @click="triggerSimpan"
          >
            <Save class="h-5 w-5" aria-hidden="true" />
            {{ saving ? 'Menyimpan…' : isSubmitted ? 'Perbarui Presensi' : 'Simpan Presensi' }}
          </button>
        </div>
      </div>
    </template>

    <!-- Konfirmasi timpa -->
    <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showConfirmModal = false">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-base font-bold text-slate-900">Perbarui Data Presensi?</h2>
        <p class="mt-2 text-sm text-slate-600">
          Data presensi kelas <strong>{{ kelas }}</strong> pada tanggal ini sudah disubmit sebelumnya.
          Pembaruan akan menimpa data lama.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showConfirmModal = false">Batal</button>
          <button type="button" :disabled="saving" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="simpan">Ya, Perbarui</button>
        </div>
      </div>
    </div>

    <!-- Konfirmasi tinggalkan halaman -->
    <div v-if="showLeaveConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="resolveLeave(false)">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-base font-bold text-slate-900">Tinggalkan halaman?</h2>
        <p class="mt-2 text-sm text-slate-600">Ada perubahan presensi yang belum disimpan. Jika Anda meninggalkan halaman, perubahan tersebut akan hilang.</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="resolveLeave(false)">Tetap di Halaman</button>
          <button type="button" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700" @click="resolveLeave(true)">Tinggalkan</button>
        </div>
      </div>
    </div>
  </div>
</template>
