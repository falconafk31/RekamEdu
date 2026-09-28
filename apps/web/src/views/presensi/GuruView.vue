<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { UserPlus, Pencil, Trash2, Search, GraduationCap, KeyRound, X, TriangleAlert, ShieldAlert } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface Guru {
  id: string | number
  username: string
  nama: string
  kelas: string | null
  isActive: boolean
}

interface GuruForm {
  id: string | number | null
  username: string
  password: string
  nama: string
  kelas: string
  isActive: boolean
}

const users = ref<Guru[]>([])
const daftarKelas = ref<string[]>([])
const loading = ref(false)
const loadError = ref('')
const search = ref('')

const showForm = ref(false)
const showDelete = ref(false)
const showReset = ref(false)
const saving = ref(false)
const editing = ref(false)
const target = ref<Guru | null>(null)
const formError = ref('')
const resetPassword = ref('')
const resetError = ref('')

const emptyForm = (): GuruForm => ({
  id: null,
  username: '',
  password: '',
  nama: '',
  kelas: '',
  isActive: true,
})
const form = ref<GuruForm>(emptyForm())

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter((u) =>
    (u.nama || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q),
  )
})
const hasActiveFilter = computed(() => search.value.trim() !== '')
function clearFilters() {
  search.value = ''
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [guruRes, pengRes] = await Promise.all([
      api<{ data: Guru[] }>('/presensi/guru'),
      api<{ daftarKelas?: string[] }>('/presensi/pengaturan').catch(() => ({ daftarKelas: [] as string[] })),
    ])
    users.value = guruRes.data || []
    daftarKelas.value = pengRes.daftarKelas || []
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = false
  form.value = emptyForm()
  formError.value = ''
  showForm.value = true
}

function openEdit(u: Guru) {
  editing.value = true
  form.value = {
    id: u.id,
    username: u.username,
    password: '',
    nama: u.nama,
    kelas: u.kelas || '',
    isActive: u.isActive,
  }
  formError.value = ''
  showForm.value = true
}

async function save() {
  if (!form.value.username.trim() || !form.value.nama.trim()) {
    formError.value = 'Username dan nama wajib diisi'
    return
  }
  if (!editing.value && form.value.password.length < 6) {
    formError.value = 'Password minimal 6 karakter'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editing.value && form.value.id !== null) {
      await api(`/presensi/guru/${form.value.id}`, {
        method: 'PATCH',
        body: {
          nama: form.value.nama.trim(),
          kelas: form.value.kelas || null,
          isActive: form.value.isActive,
        },
      })
    } else {
      await api('/presensi/guru', {
        method: 'POST',
        body: {
          username: form.value.username.trim(),
          nama: form.value.nama.trim(),
          password: form.value.password,
          kelas: form.value.kelas || null,
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

function openReset(u: Guru) {
  target.value = u
  resetPassword.value = ''
  resetError.value = ''
  showReset.value = true
}

async function doReset() {
  if (!target.value) return
  if (resetPassword.value.length < 6) {
    resetError.value = 'Password baru minimal 6 karakter'
    return
  }
  saving.value = true
  resetError.value = ''
  try {
    await api(`/presensi/guru/${target.value.id}/reset-password`, {
      method: 'POST',
      body: { password: resetPassword.value },
    })
    showReset.value = false
    target.value = null
    resetPassword.value = ''
  } catch (e) {
    resetError.value = pesanError(e)
  } finally {
    saving.value = false
  }
}

function confirmDelete(u: Guru) {
  target.value = u
  showDelete.value = true
}

async function hapus() {
  if (!target.value) return
  saving.value = true
  try {
    await api(`/presensi/guru/${target.value.id}`, { method: 'DELETE' })
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

onMounted(() => { void load() })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Guru &amp; Wali Kelas</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ filtered.length }} akun ditampilkan</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        @click="openCreate"
      >
        <UserPlus class="h-4 w-4" aria-hidden="true" />
        Tambah Akun
      </button>
    </div>

    <div v-if="!auth.isAdmin" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <ShieldAlert class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Halaman khusus administrator</p>
      <p class="max-w-sm text-[13px] text-slate-500">Pengelolaan akun guru hanya dapat dilakukan oleh admin atau kepala sekolah.</p>
    </div>

    <template v-else>
      <!-- Filter -->
      <div class="rounded-xl border border-slate-200 bg-white p-3">
        <label for="cari" class="mb-1 block text-xs font-semibold text-slate-600">Pencarian</label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="cari" v-model="search" placeholder="Cari nama / username…" class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
        </div>
        <div v-if="hasActiveFilter" class="mt-2 flex items-center gap-2 text-[13px] text-slate-500">
          <span>{{ filtered.length }} hasil</span>
          <button type="button" class="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline" @click="clearFilters">
            <X class="h-3.5 w-3.5" aria-hidden="true" /> Hapus filter
          </button>
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
      <div v-else-if="!filtered.length" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
        <GraduationCap class="h-10 w-10 text-slate-300" aria-hidden="true" />
        <p class="text-sm font-semibold text-slate-800">Belum ada akun guru</p>
        <p class="max-w-sm text-[13px] text-slate-500">Tambahkan akun guru dan wali kelas melalui tombol di atas.</p>
        <button type="button" class="mt-1 rounded-lg bg-brandgreen px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800" @click="openCreate">Tambah Akun</button>
      </div>
      <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[640px] text-left text-sm">
          <caption class="sr-only">Daftar guru dan wali kelas</caption>
          <thead>
            <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th class="w-12 px-3 py-2.5 text-center font-semibold">No</th>
              <th class="px-3 py-2.5 font-semibold">Nama</th>
              <th class="px-3 py-2.5 font-semibold">Username</th>
              <th class="px-3 py-2.5 font-semibold">Wali Kelas</th>
              <th class="px-3 py-2.5 font-semibold">Status</th>
              <th class="px-3 py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, idx) in filtered" :key="u.id" class="border-t border-slate-100 hover:bg-slate-50/60">
              <td class="px-3 py-2.5 text-center font-mono text-slate-400">{{ idx + 1 }}</td>
              <td class="px-3 py-2.5 font-medium text-slate-800">{{ u.nama }}</td>
              <td class="px-3 py-2.5 font-mono text-slate-500">{{ u.username }}</td>
              <td class="px-3 py-2.5 text-slate-600">{{ u.kelas ? `Kelas ${u.kelas}` : '—' }}</td>
              <td class="px-3 py-2.5">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1"
                  :class="u.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'"
                >
                  {{ u.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex justify-end gap-0.5">
                  <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Edit" :aria-label="`Edit ${u.nama}`" @click="openEdit(u)">
                    <Pencil class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600" title="Reset password" :aria-label="`Reset password ${u.nama}`" @click="openReset(u)">
                    <KeyRound class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus akun" :aria-label="`Hapus ${u.nama}`" @click="confirmDelete(u)">
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Modal form -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showForm = false">
      <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-base font-bold text-slate-900">{{ editing ? 'Edit Akun' : 'Tambah Akun Guru' }}</h2>
        <p class="mb-4 text-[13px] text-slate-500">Akun digunakan untuk login ke aplikasi.</p>
        <div v-if="formError" class="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{{ formError }}</div>
        </div>
        <div class="flex flex-col gap-3">
          <div>
            <label for="g-nama" class="mb-1 block text-xs font-semibold text-slate-600">Nama lengkap *</label>
            <input id="g-nama" v-model="form.nama" placeholder="Nama guru" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label for="g-user" class="mb-1 block text-xs font-semibold text-slate-600">Username *</label>
              <input id="g-user" v-model="form.username" placeholder="tanpa spasi" :disabled="editing" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" />
            </div>
            <div v-if="!editing">
              <label for="g-pass" class="mb-1 block text-xs font-semibold text-slate-600">Password *</label>
              <input id="g-pass" v-model="form.password" type="password" placeholder="Minimal 6 karakter" autocomplete="new-password" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label for="g-kelas" class="mb-1 block text-xs font-semibold text-slate-600">Wali kelas</label>
              <select id="g-kelas" v-model="form.kelas" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600">
                <option value="">— Tanpa kelas —</option>
                <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
              </select>
            </div>
            <div v-if="editing" class="flex items-end pb-2">
              <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600" />
                Akun aktif
              </label>
            </div>
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

    <!-- Modal reset password -->
    <div v-if="showReset" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showReset = false">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-base font-bold text-slate-900">Reset Password</h2>
        <p v-if="target" class="mt-1 text-[13px] text-slate-500">Atur password baru untuk <strong class="text-slate-800">{{ target.nama }}</strong> <span class="font-mono">({{ target.username }})</span>.</p>
        <div v-if="resetError" class="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{{ resetError }}</div>
        </div>
        <div class="mt-3">
          <label for="r-pass" class="mb-1 block text-xs font-semibold text-slate-600">Password baru *</label>
          <input id="r-pass" v-model="resetPassword" type="password" placeholder="Minimal 6 karakter" autocomplete="new-password" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showReset = false">Batal</button>
          <button type="button" :disabled="saving" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="doReset">
            {{ saving ? 'Menyimpan…' : 'Reset Password' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Konfirmasi hapus -->
    <div v-if="showDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showDelete = false">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 class="text-base font-bold text-slate-900">Hapus Akun?</h2>
        <p v-if="target" class="mt-2 text-sm text-slate-600">
          Akun <strong class="text-slate-900">{{ target.nama }}</strong>
          <span class="font-mono text-slate-400">({{ target.username }})</span>
          akan dihapus dan tidak bisa login lagi. Tindakan ini tidak dapat dibatalkan.
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
