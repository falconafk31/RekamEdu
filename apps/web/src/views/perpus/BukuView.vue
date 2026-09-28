<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import {
  Book,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
  Check,
} from 'lucide-vue-next'

interface Buku {
  id: string | number
  judul: string
  pengarang: string | null
  penerbit: string | null
  tahunTerbit: string | null
  isbn: string | null
  stok: number
  kategori: string | null
}

interface BukuPage {
  data: Buku[]
  total: number
}

interface BukuForm {
  id: string | number | null
  judul: string
  pengarang: string
  penerbit: string
  tahunTerbit: string
  isbn: string
  stok: number
  kategori: string
}

const LIMIT = 20

const auth = useAuthStore()

const daftar = ref<Buku[]>([])
const total = ref(0)
const memuat = ref(false)
const galat = ref('')
const sukses = ref('')

const q = ref('')
const kategori = ref('')
const halaman = ref(1)

const tampilModal = ref(false)
const menyimpan = ref(false)
const form = ref<BukuForm>({
  id: null, judul: '', pengarang: '', penerbit: '', tahunTerbit: '', isbn: '', stok: 1, kategori: '',
})

const tampilHapus = ref(false)
const targetHapus = ref<Buku | null>(null)
const menghapus = ref(false)

let timerCari: ReturnType<typeof setTimeout> | null = null

function pesanGalat(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.'
}

const kategoriUnik = computed(() => {
  const set = new Set<string>()
  daftar.value.forEach((b) => {
    if (b.kategori) set.add(b.kategori)
  })
  return [...set].sort()
})

const totalHalaman = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)))

async function muat(): Promise<void> {
  memuat.value = true
  galat.value = ''
  try {
    const res = await api<BukuPage>('/perpus/buku', {
      query: {
        q: q.value.trim() || undefined,
        kategori: kategori.value || undefined,
        page: halaman.value,
        limit: LIMIT,
      },
    })
    daftar.value = res.data
    total.value = res.total
  } catch (e) {
    galat.value = 'Gagal memuat data buku: ' + pesanGalat(e)
  } finally {
    memuat.value = false
  }
}

watch([q, kategori], () => {
  if (timerCari) clearTimeout(timerCari)
  timerCari = setTimeout(() => {
    halaman.value = 1
    muat()
  }, 400)
})

function bukaModal(buku: Buku | null): void {
  if (buku) {
    form.value = {
      id: buku.id,
      judul: buku.judul,
      pengarang: buku.pengarang ?? '',
      penerbit: buku.penerbit ?? '',
      tahunTerbit: buku.tahunTerbit ?? '',
      isbn: buku.isbn ?? '',
      stok: buku.stok,
      kategori: buku.kategori ?? '',
    }
  } else {
    form.value = { id: null, judul: '', pengarang: '', penerbit: '', tahunTerbit: '', isbn: '', stok: 1, kategori: '' }
  }
  tampilModal.value = true
}

async function simpan(): Promise<void> {
  if (!form.value.judul.trim()) {
    galat.value = 'Judul buku wajib diisi.'
    return
  }
  if (form.value.stok < 0) {
    galat.value = 'Stok tidak boleh negatif.'
    return
  }
  menyimpan.value = true
  galat.value = ''
  sukses.value = ''
  try {
    const payload = {
      judul: form.value.judul.trim(),
      pengarang: form.value.pengarang.trim() || null,
      penerbit: form.value.penerbit.trim() || null,
      tahunTerbit: form.value.tahunTerbit.trim() || null,
      isbn: form.value.isbn.trim() || null,
      stok: form.value.stok,
      kategori: form.value.kategori.trim() || null,
    }
    if (form.value.id !== null) {
      await api('/perpus/buku/' + form.value.id, { method: 'PATCH', body: payload })
      sukses.value = 'Buku berhasil diperbarui.'
    } else {
      await api('/perpus/buku', { method: 'POST', body: payload })
      sukses.value = 'Buku baru berhasil ditambahkan.'
    }
    tampilModal.value = false
    await muat()
  } catch (e) {
    galat.value = 'Gagal menyimpan buku: ' + pesanGalat(e)
  } finally {
    menyimpan.value = false
  }
}

function konfirmasiHapus(buku: Buku): void {
  targetHapus.value = buku
  tampilHapus.value = true
}

async function hapus(): Promise<void> {
  if (!targetHapus.value) return
  menghapus.value = true
  galat.value = ''
  sukses.value = ''
  try {
    await api('/perpus/buku/' + targetHapus.value.id, { method: 'DELETE' })
    sukses.value = 'Buku "' + targetHapus.value.judul + '" berhasil dihapus.'
    tampilHapus.value = false
    targetHapus.value = null
    await muat()
  } catch (e) {
    galat.value = 'Gagal menghapus buku: ' + pesanGalat(e)
  } finally {
    menghapus.value = false
  }
}

function gantiHalaman(arah: number): void {
  const baru = halaman.value + arah
  if (baru >= 1 && baru <= totalHalaman.value) {
    halaman.value = baru
    muat()
  }
}

onMounted(muat)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Kepala halaman -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Data Koleksi</h1>
        <p class="mt-0.5 text-sm text-slate-500">
          <span class="font-mono font-semibold text-slate-700">{{ total }}</span> judul terdaftar
        </p>
      </div>
      <button
        v-if="auth.canPerpus"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-brandgreen px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        @click="bukaModal(null)"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />
        Tambah Buku
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

    <!-- Filter -->
    <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <div class="relative">
        <label for="cari-buku" class="mb-1 block text-xs font-semibold text-slate-600">Pencarian</label>
        <input
          id="cari-buku"
          v-model="q"
          type="text"
          placeholder="Cari judul, pengarang, atau ISBN…"
          class="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30"
        />
        <Search class="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
        <button v-if="q" type="button" class="absolute bottom-2 right-2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Hapus pencarian" @click="q = ''">
          <X class="h-4 w-4" />
        </button>
      </div>
      <div>
        <label for="filter-kategori" class="mb-1 block text-xs font-semibold text-slate-600">Kategori</label>
        <select
          id="filter-kategori"
          v-model="kategori"
          class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30"
        >
          <option value="">Semua kategori</option>
          <option v-for="k in kategoriUnik" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>
    </div>

    <!-- Tabel -->
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div v-if="memuat" class="space-y-2 p-4" aria-live="polite">
        <div v-for="i in 6" :key="i" class="h-12 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div v-else-if="!daftar.length" class="flex flex-col items-center gap-2 p-10 text-center">
        <Book class="h-10 w-10 text-slate-300" aria-hidden="true" />
        <p class="text-sm font-semibold text-slate-700">Koleksi tidak ditemukan</p>
        <p class="text-sm text-slate-500">Belum ada buku atau pencarian tidak cocok.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th class="px-4 py-2.5 text-center font-semibold">No</th>
              <th class="px-4 py-2.5 font-semibold">Judul Buku</th>
              <th class="px-4 py-2.5 font-semibold">Pengarang &amp; Penerbit</th>
              <th class="px-4 py-2.5 text-center font-semibold">Stok</th>
              <th class="px-4 py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, i) in daftar" :key="b.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
              <td class="px-4 py-2.5 text-center font-mono text-slate-400">{{ (halaman - 1) * LIMIT + i + 1 }}</td>
              <td class="px-4 py-2.5">
                <p class="font-medium text-slate-800">{{ b.judul }}</p>
                <p class="text-xs text-slate-400">{{ b.kategori || 'Tanpa kategori' }} · ISBN {{ b.isbn || '–' }}</p>
              </td>
              <td class="px-4 py-2.5">
                <p class="text-slate-700">{{ b.pengarang || '–' }}</p>
                <p class="text-xs text-slate-400">{{ b.penerbit || '–' }}{{ b.tahunTerbit ? ` (${b.tahunTerbit})` : '' }}</p>
              </td>
              <td class="px-4 py-2.5 text-center font-mono font-semibold" :class="b.stok > 0 ? 'text-emerald-700' : 'text-rose-600'">
                {{ b.stok }}
              </td>
              <td class="px-4 py-2.5">
                <div v-if="auth.canPerpus" class="flex justify-end gap-1">
                  <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" :title="`Edit ${b.judul}`" :aria-label="`Edit ${b.judul}`" @click="bukaModal(b)">
                    <Pencil class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" :title="`Hapus ${b.judul}`" :aria-label="`Hapus ${b.judul}`" @click="konfirmasiHapus(b)">
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <span v-else class="text-slate-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalHalaman > 1" class="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
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
    </div>

    <!-- Modal form buku -->
    <div v-if="tampilModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50" @click="tampilModal = false" />
      <div class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" :aria-label="form.id ? 'Edit Buku' : 'Tambah Buku'">
        <h2 class="text-base font-bold text-slate-900">{{ form.id ? 'Edit Buku' : 'Tambah Buku' }}</h2>
        <p class="mb-4 text-xs text-slate-500">Lengkapi data bibliografi</p>
        <div class="flex flex-col gap-3">
          <div>
            <label for="buku-judul" class="mb-1 block text-xs font-semibold text-slate-600">Judul buku <span class="text-rose-500">*</span></label>
            <input id="buku-judul" v-model="form.judul" type="text" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30" placeholder="Masukkan judul buku" />
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label for="buku-pengarang" class="mb-1 block text-xs font-semibold text-slate-600">Pengarang</label>
              <input id="buku-pengarang" v-model="form.pengarang" type="text" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30" placeholder="Nama pengarang" />
            </div>
            <div>
              <label for="buku-penerbit" class="mb-1 block text-xs font-semibold text-slate-600">Penerbit</label>
              <input id="buku-penerbit" v-model="form.penerbit" type="text" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30" placeholder="Nama penerbit" />
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label for="buku-tahun" class="mb-1 block text-xs font-semibold text-slate-600">Tahun terbit</label>
              <input id="buku-tahun" v-model="form.tahunTerbit" type="text" inputmode="numeric" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30" placeholder="Contoh: 2023" />
            </div>
            <div>
              <label for="buku-isbn" class="mb-1 block text-xs font-semibold text-slate-600">ISBN</label>
              <input id="buku-isbn" v-model="form.isbn" type="text" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30" placeholder="Kode ISBN" />
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label for="buku-stok" class="mb-1 block text-xs font-semibold text-slate-600">Stok <span class="text-rose-500">*</span></label>
              <input id="buku-stok" v-model.number="form.stok" type="number" min="0" class="block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30" />
            </div>
            <div>
              <label for="buku-kategori" class="mb-1 block text-xs font-semibold text-slate-600">Kategori</label>
              <input id="buku-kategori" v-model="form.kategori" type="text" list="daftar-kategori" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30" placeholder="Fiksi, Pelajaran, dll" />
              <datalist id="daftar-kategori">
                <option v-for="k in kategoriUnik" :key="k" :value="k" />
              </datalist>
            </div>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="tampilModal = false">Batal</button>
          <button type="button" :disabled="menyimpan" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50" @click="simpan">
            {{ menyimpan ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Konfirmasi hapus -->
    <div v-if="tampilHapus" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50" @click="tampilHapus = false" />
      <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true" aria-label="Konfirmasi hapus buku">
        <h2 class="text-base font-bold text-slate-900">Hapus Buku?</h2>
        <p v-if="targetHapus" class="mt-2 text-sm text-slate-600">
          <strong>{{ targetHapus.judul }}</strong> akan dihapus dari koleksi. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="tampilHapus = false">Batal</button>
          <button type="button" :disabled="menghapus" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50" @click="hapus">
            {{ menghapus ? 'Menghapus…' : 'Hapus Buku' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
