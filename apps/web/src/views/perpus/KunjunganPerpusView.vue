<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { formatTanggalPanjang } from '../../lib/dates'
import { cetakPdfKunjungan } from '../../lib/pdf'
import {
  Users,
  Search,
  X,
  Plus,
  Trash2,
  Download,
  TriangleAlert,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'

interface Kunjungan {
  id: string | number
  tanggal: string
  student: { nama: string; nisn: string; kelas: string }
}

interface KunjunganPage {
  data: Kunjungan[]
  total: number
}

interface SiswaOpt {
  id: string | number
  nisn: string
  nama: string
  kelas: string
}

const LIMIT = 20

const auth = useAuthStore()

const daftar = ref<Kunjungan[]>([])
const total = ref(0)
const memuat = ref(false)
const galat = ref('')
const sukses = ref('')

const hariIni = new Date().toISOString().slice(0, 10)
const tanggal = ref(hariIni)
const halaman = ref(1)

const cariSiswa = ref('')
const hasilSiswa = ref<SiswaOpt[]>([])
const mencariSiswa = ref(false)
const siswaTerpilih = ref<SiswaOpt | null>(null)
const menyimpan = ref(false)

const tampilHapus = ref(false)
const targetHapus = ref<Kunjungan | null>(null)
const menghapus = ref(false)

let timerSiswa: ReturnType<typeof setTimeout> | null = null

function pesanGalat(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.'
}

const totalHalaman = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)))

async function muat(): Promise<void> {
  memuat.value = true
  galat.value = ''
  try {
    const res = await api<KunjunganPage>('/perpus/kunjungan', {
      query: { tanggal: tanggal.value, page: halaman.value, limit: LIMIT },
    })
    daftar.value = res.data
    total.value = res.total
  } catch (e) {
    galat.value = 'Gagal memuat data kunjungan: ' + pesanGalat(e)
  } finally {
    memuat.value = false
  }
}

watch(tanggal, () => {
  halaman.value = 1
  muat()
})

function gantiHalaman(arah: number): void {
  const baru = halaman.value + arah
  if (baru >= 1 && baru <= totalHalaman.value) {
    halaman.value = baru
    muat()
  }
}

// --- Pencarian siswa (nama / NISN) ---
watch(cariSiswa, (baru) => {
  if (timerSiswa) clearTimeout(timerSiswa)
  if (!baru.trim() || siswaTerpilih.value) {
    hasilSiswa.value = []
    return
  }
  timerSiswa = setTimeout(async () => {
    mencariSiswa.value = true
    try {
      const res = await api<{ data: SiswaOpt[]; total: number }>('/presensi/siswa', {
        query: { q: baru.trim(), limit: 5 },
      })
      hasilSiswa.value = res.data
    } catch (e) {
      const ditolak = e instanceof ApiError && ((e as unknown as { status?: number }).status === 403 || /403/.test(e.message))
      galat.value = ditolak
        ? 'Akses data siswa ditolak (403). Akun pustakawan membutuhkan izin baca data siswa dari backend.'
        : 'Gagal mencari siswa: ' + pesanGalat(e)
      hasilSiswa.value = []
    } finally {
      mencariSiswa.value = false
    }
  }, 400)
})

function pilihSiswa(s: SiswaOpt): void {
  siswaTerpilih.value = s
  cariSiswa.value = `${s.nama} (Kelas ${s.kelas})`
  hasilSiswa.value = []
}

function batalPilih(): void {
  siswaTerpilih.value = null
  cariSiswa.value = ''
  hasilSiswa.value = []
}

async function catat(): Promise<void> {
  if (!siswaTerpilih.value) {
    galat.value = 'Pilih siswa terlebih dahulu.'
    return
  }
  menyimpan.value = true
  galat.value = ''
  sukses.value = ''
  try {
    await api('/perpus/kunjungan', {
      method: 'POST',
      body: { studentId: siswaTerpilih.value.id, tanggal: tanggal.value },
    })
    sukses.value = `Kunjungan ${siswaTerpilih.value.nama} berhasil dicatat.`
    batalPilih()
    halaman.value = 1
    await muat()
  } catch (e) {
    galat.value = 'Gagal mencatat kunjungan: ' + pesanGalat(e)
  } finally {
    menyimpan.value = false
  }
}

function konfirmasiHapus(v: Kunjungan): void {
  targetHapus.value = v
  tampilHapus.value = true
}

async function hapus(): Promise<void> {
  if (!targetHapus.value) return
  menghapus.value = true
  galat.value = ''
  sukses.value = ''
  try {
    await api('/perpus/kunjungan/' + targetHapus.value.id, { method: 'DELETE' })
    sukses.value = 'Rekam kunjungan dihapus.'
    tampilHapus.value = false
    targetHapus.value = null
    await muat()
  } catch (e) {
    galat.value = 'Gagal menghapus kunjungan: ' + pesanGalat(e)
  } finally {
    menghapus.value = false
  }
}

async function unduhPdf(): Promise<void> {
  try {
    // Ambil seluruh kunjungan tanggal ini (tanpa batas halaman) untuk laporan.
    const semua = await api<KunjunganPage>('/perpus/kunjungan', {
      query: { tanggal: tanggal.value, page: 1, limit: 1000 },
    })
    const agregat = new Map<string, { nama: string; kelas: string; count: number }>()
    for (const v of semua.data) {
      const ada = agregat.get(v.student.nisn)
      if (ada) ada.count += 1
      else agregat.set(v.student.nisn, { nama: v.student.nama, kelas: v.student.kelas, count: 1 })
    }
    const peringkat = [...agregat.values()].sort((a, b) => b.count - a.count)
    await cetakPdfKunjungan({
      topStudents: peringkat,
      totalKunjungan: semua.total,
      totalSiswaUnik: agregat.size,
      periodeText: formatTanggalPanjang(tanggal.value),
    })
  } catch (e) {
    galat.value = 'Gagal membuat PDF: ' + pesanGalat(e)
  }
}

onMounted(muat)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Kepala halaman -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Data Pengunjung</h1>
        <p class="mt-0.5 text-sm text-slate-500">Pencatatan kunjungan perpustakaan harian</p>
      </div>
      <button
        v-if="auth.canPerpus && daftar.length > 0"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        @click="unduhPdf"
      >
        <Download class="h-4 w-4" aria-hidden="true" />
        PDF Kunjungan
      </button>
    </div>

    <div v-if="galat" class="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      <p class="flex items-start gap-2">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {{ galat }}
      </p>
      <button type="button" class="shrink-0 font-medium underline" @click="galat = ''">Tutup</button>
    </div>
    <div v-if="sukses" class="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
      <p class="flex items-start gap-2">
        <Check class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {{ sukses }}
      </p>
      <button type="button" class="shrink-0 font-medium underline" @click="sukses = ''">Tutup</button>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Panel pencatatan -->
      <section class="rounded-xl border border-slate-200 bg-white p-4">
        <h2 class="text-sm font-bold text-slate-900">Catat Pengunjung</h2>
        <p class="mb-4 text-xs text-slate-500">Cari siswa berdasarkan nama atau NISN</p>
        <div v-if="auth.canPerpus" class="flex flex-col gap-3.5">
          <div>
            <label for="tgl-kunjungan" class="mb-1 block text-xs font-semibold text-slate-600">Tanggal kunjungan</label>
            <input
              id="tgl-kunjungan"
              v-model="tanggal"
              type="date"
              :max="hariIni"
              class="block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30"
            />
          </div>
          <div class="relative">
            <label for="kunjungan-siswa" class="mb-1 block text-xs font-semibold text-slate-600">Cari siswa</label>
            <div class="relative">
              <input
                id="kunjungan-siswa"
                v-model="cariSiswa"
                type="text"
                placeholder="Ketik nama atau NISN…"
                autocomplete="off"
                class="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30"
                @input="siswaTerpilih = null"
              />
              <Search class="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <button v-if="cariSiswa" type="button" class="absolute bottom-2 right-2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Hapus pencarian" @click="batalPilih">
                <X class="h-4 w-4" />
              </button>
            </div>
            <p v-if="mencariSiswa" class="mt-1 text-xs text-slate-400">Mencari…</p>
            <ul
              v-if="cariSiswa && !siswaTerpilih && hasilSiswa.length"
              class="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
              role="listbox"
            >
              <li v-for="s in hasilSiswa" :key="s.id">
                <button type="button" class="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-slate-50" role="option" @click="pilihSiswa(s)">
                  <span class="text-sm font-medium text-slate-800">{{ s.nama }}</span>
                  <span class="font-mono text-xs text-slate-400">Kelas {{ s.kelas }} · {{ s.nisn }}</span>
                </button>
              </li>
            </ul>
            <p v-else-if="cariSiswa && !siswaTerpilih && !mencariSiswa" class="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-center text-[13px] text-slate-500 shadow-lg">
              Tidak ada siswa yang cocok.
            </p>
          </div>
          <button
            type="button"
            :disabled="!siswaTerpilih || menyimpan"
            class="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brandgreen px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            @click="catat"
          >
            <Plus class="h-4 w-4" aria-hidden="true" />
            {{ menyimpan ? 'Menyimpan…' : 'Catat Kunjungan' }}
          </button>
        </div>
        <p v-else class="text-sm text-slate-500">Akun Anda tidak memiliki akses pencatatan.</p>
      </section>

      <!-- Riwayat -->
      <section class="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
        <div class="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Daftar Pengunjung</h2>
            <p class="text-xs text-slate-500">{{ formatTanggalPanjang(tanggal) }}</p>
          </div>
          <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <Users class="h-3.5 w-3.5" aria-hidden="true" />
            <span class="font-mono">{{ total }}</span> orang
          </span>
        </div>

        <div v-if="memuat" class="space-y-2" aria-live="polite">
          <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div v-else-if="!daftar.length" class="flex flex-col items-center gap-2 p-10 text-center">
          <Users class="h-10 w-10 text-slate-300" aria-hidden="true" />
          <p class="text-sm font-semibold text-slate-700">Belum ada kunjungan</p>
          <p class="text-sm text-slate-500">Belum ada kunjungan yang dicatat pada tanggal ini.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th class="px-4 py-2.5 text-center font-semibold">No</th>
                <th class="px-4 py-2.5 font-semibold">Nama Siswa</th>
                <th class="px-4 py-2.5 font-semibold">NISN</th>
                <th class="px-4 py-2.5 font-semibold">Kelas</th>
                <th class="px-4 py-2.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, i) in daftar" :key="v.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                <td class="px-4 py-2.5 text-center font-mono text-slate-400">{{ (halaman - 1) * LIMIT + i + 1 }}</td>
                <td class="px-4 py-2.5 font-medium text-slate-800">{{ v.student.nama }}</td>
                <td class="px-4 py-2.5 font-mono text-[13px] text-slate-500">{{ v.student.nisn }}</td>
                <td class="px-4 py-2.5 text-slate-600">{{ v.student.kelas }}</td>
                <td class="px-4 py-2.5 text-right">
                  <button
                    v-if="auth.canPerpus"
                    type="button"
                    class="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    :title="`Hapus kunjungan ${v.student.nama}`"
                    :aria-label="`Hapus kunjungan ${v.student.nama}`"
                    @click="konfirmasiHapus(v)"
                  >
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span v-else class="text-slate-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="totalHalaman > 1" class="mt-2 flex items-center justify-between border-t border-slate-200 pt-2.5">
          <p class="text-xs text-slate-500">
            Halaman <span class="font-mono font-semibold text-slate-700">{{ halaman }}</span> dari
            <span class="font-mono font-semibold text-slate-700">{{ totalHalaman }}</span>
          </p>
          <div class="flex gap-1">
            <button type="button" :disabled="halaman <= 1" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman sebelumnya" @click="gantiHalaman(-1)">
              <ChevronLeft class="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" :disabled="halaman >= totalHalaman" class="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Halaman berikutnya" @click="gantiHalaman(1)">
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Konfirmasi hapus -->
    <div v-if="tampilHapus" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50" @click="tampilHapus = false" />
      <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true" aria-label="Konfirmasi hapus kunjungan">
        <h2 class="text-base font-bold text-slate-900">Hapus Rekam Kunjungan?</h2>
        <p v-if="targetHapus" class="mt-2 text-sm text-slate-600">
          Kunjungan <strong>{{ targetHapus.student.nama }}</strong> pada
          {{ formatTanggalPanjang(targetHapus.tanggal) }} akan dihapus.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="tampilHapus = false">Batal</button>
          <button type="button" :disabled="menghapus" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50" @click="hapus">
            {{ menghapus ? 'Menghapus…' : 'Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
