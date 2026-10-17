<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Eye, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import AppAlert from '../../components/ui/AppAlert.vue'
import AppBadge from '../../components/ui/AppBadge.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppConfirmDialog from '../../components/ui/AppConfirmDialog.vue'
import AppEmptyState from '../../components/ui/AppEmptyState.vue'
import AppModal from '../../components/ui/AppModal.vue'
import AppPagination from '../../components/ui/AppPagination.vue'
import { formatTanggalID, hariIniISO } from './helpers'

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface Surat {
  id: string
  jenis: 'MASUK' | 'KELUAR'
  nomorSurat: string
  tahun: number
  nomorUrut: number
  tanggal: string
  pengirim: string | null
  penerima: string | null
  perihal: string
  ringkasan: string | null
  lampiranUrl: string | null
  status: string
}

interface TemplateSurat {
  id: string
  nama: string
}

interface SuratForm {
  tanggal: string
  pengirim: string
  perihal: string
  ringkasan: string
  lampiranUrl: string
  status: string
}

const STATUS_PILIHAN = ['baru', 'diproses', 'selesai', 'arsip']

function toneStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'baru': return 'info'
    case 'diproses': return 'warning'
    case 'selesai': return 'success'
    default: return 'neutral'
  }
}

const rows = ref<Surat[]>([])
const loading = ref(false)
const loadError = ref('')
const q = ref('')
const tanggalDari = ref('')
const tanggalSampai = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)

const showForm = ref(false)
const showDelete = ref(false)
const showDetail = ref(false)
const saving = ref(false)
const editing = ref(false)
const target = ref<Surat | null>(null)
const formError = ref('')
const successMsg = ref('')
const form = ref<SuratForm>({
  tanggal: hariIniISO(),
  pengirim: '',
  perihal: '',
  ringkasan: '',
  lampiranUrl: '',
  status: 'baru',
})

// Render template
const templates = ref<TemplateSurat[]>([])
const templateId = ref('')
const renderResult = ref('')
const rendering = ref(false)
const renderError = ref('')

const hasActiveFilter = computed(() => q.value.trim() !== '' || tanggalDari.value !== '' || tanggalSampai.value !== '')

function clearFilters() {
  q.value = ''
  tanggalDari.value = ''
  tanggalSampai.value = ''
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
    const query: Record<string, string | number> = { jenis: 'MASUK', page: page.value, limit: limit.value }
    if (q.value.trim()) query.q = q.value.trim()
    if (tanggalDari.value) query.tanggalDari = tanggalDari.value
    if (tanggalSampai.value) query.tanggalSampai = tanggalSampai.value
    const res = await api<{ data: Surat[]; total: number }>('/surat', { query })
    rows.value = res.data || []
    total.value = res.total ?? rows.value.length
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  try {
    const res = await api<TemplateSurat[]>('/surat/template')
    templates.value = res || []
  } catch {
    templates.value = []
  }
}

function openCreate() {
  editing.value = false
  form.value = { tanggal: hariIniISO(), pengirim: '', perihal: '', ringkasan: '', lampiranUrl: '', status: 'baru' }
  formError.value = ''
  successMsg.value = ''
  showForm.value = true
}

function openEdit(s: Surat) {
  editing.value = true
  target.value = s
  form.value = {
    tanggal: formatTanggalISOInput(s.tanggal),
    pengirim: s.pengirim || '',
    perihal: s.perihal,
    ringkasan: s.ringkasan || '',
    lampiranUrl: s.lampiranUrl || '',
    status: s.status,
  }
  formError.value = ''
  successMsg.value = ''
  showForm.value = true
}

function formatTanggalISOInput(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  return m ? `${m[1]}-${m[2]}-${m[3]}` : hariIniISO()
}

async function save() {
  if (!form.value.tanggal || !form.value.pengirim.trim() || !form.value.perihal.trim()) {
    formError.value = 'Tanggal, pengirim, dan perihal wajib diisi'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = {
      tanggal: form.value.tanggal,
      pengirim: form.value.pengirim.trim(),
      perihal: form.value.perihal.trim(),
      ringkasan: form.value.ringkasan.trim() || undefined,
      lampiranUrl: form.value.lampiranUrl.trim() || undefined,
      status: form.value.status,
    }
    if (editing.value && target.value) {
      await api(`/surat/${target.value.id}`, { method: 'PATCH', body })
      successMsg.value = 'Surat berhasil diperbarui'
    } else {
      const dibuat = await api<Surat>('/surat', {
        method: 'POST',
        body: { jenis: 'MASUK', ...body },
      })
      successMsg.value = `Surat berhasil disimpan dengan nomor ${dibuat.nomorSurat}`
    }
    showForm.value = false
    await load()
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    saving.value = false
  }
}

function openDetail(s: Surat) {
  target.value = s
  templateId.value = ''
  renderResult.value = ''
  renderError.value = ''
  showDetail.value = true
  if (templates.value.length === 0) void loadTemplates()
}

async function renderDenganTemplate() {
  if (!target.value || !templateId.value) {
    renderError.value = 'Pilih template terlebih dahulu'
    return
  }
  rendering.value = true
  renderError.value = ''
  try {
    const res = await api<{ hasil: string }>(`/surat/${target.value.id}/render`, {
      method: 'POST',
      body: { templateId: templateId.value },
    })
    renderResult.value = res.hasil
  } catch (e) {
    renderError.value = pesanError(e)
  } finally {
    rendering.value = false
  }
}

function confirmDelete(s: Surat) {
  target.value = s
  showDelete.value = true
}

async function hapus() {
  if (!target.value) return
  saving.value = true
  try {
    await api(`/surat/${target.value.id}`, { method: 'DELETE' })
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
  await load()
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Surat Masuk</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ total }} surat tercatat</p>
      </div>
      <AppButton @click="openCreate">
        <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
        Tambah Surat
      </AppButton>
    </div>

    <AppAlert v-if="successMsg" tone="success" :title="'Berhasil'">{{ successMsg }}</AppAlert>

    <!-- Filter -->
    <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
      <div class="sm:col-span-1">
        <label for="cari" class="mb-1 block text-xs font-semibold text-slate-600">Pencarian</label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="cari" v-model="q" placeholder="Cari perihal / nomor / pengirim…" class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @input="onSearch" />
        </div>
      </div>
      <div>
        <label for="tgl-dari" class="mb-1 block text-xs font-semibold text-slate-600">Tanggal dari</label>
        <input id="tgl-dari" v-model="tanggalDari" type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="resetPage" />
      </div>
      <div>
        <label for="tgl-sampai" class="mb-1 block text-xs font-semibold text-slate-600">Tanggal sampai</label>
        <input id="tgl-sampai" v-model="tanggalSampai" type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" @change="resetPage" />
      </div>
    </div>
    <div v-if="hasActiveFilter" class="flex items-center gap-2 text-[13px] text-slate-500">
      <span>{{ total }} hasil</span>
      <button type="button" class="font-medium text-emerald-700 hover:underline" @click="clearFilters">Hapus filter</button>
    </div>

    <AppAlert v-if="loadError" tone="danger" :title="'Gagal memuat data'">
      {{ loadError }}
      <template #action>
        <AppButton size="sm" variant="secondary" @click="load()">Coba lagi</AppButton>
      </template>
    </AppAlert>

    <!-- Tabel -->
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-4" aria-live="polite">
      <div class="flex flex-col gap-2">
        <div v-for="i in 6" :key="i" class="h-8 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
    <AppEmptyState v-else-if="rows.length === 0" title="Belum ada surat masuk" description="Tambahkan surat masuk melalui tombol di atas, atau ubah filter pencarian.">
      <template #action>
        <AppButton size="sm" @click="openCreate">
          <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Tambah Surat
        </AppButton>
      </template>
    </AppEmptyState>
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[820px] text-left text-sm">
        <caption class="sr-only">Daftar surat masuk</caption>
        <thead>
          <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th class="w-12 px-3 py-2.5 text-center font-semibold">No</th>
            <th class="px-3 py-2.5 font-semibold">Nomor Surat</th>
            <th class="px-3 py-2.5 font-semibold">Tanggal</th>
            <th class="px-3 py-2.5 font-semibold">Pengirim</th>
            <th class="px-3 py-2.5 font-semibold">Perihal</th>
            <th class="px-3 py-2.5 font-semibold">Status</th>
            <th class="px-3 py-2.5 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in rows" :key="s.id" class="border-t border-slate-100 hover:bg-slate-50/60">
            <td class="px-3 py-2.5 text-center font-mono text-slate-400">{{ (page - 1) * limit + i + 1 }}</td>
            <td class="px-3 py-2.5 font-mono text-slate-700">{{ s.nomorSurat }}</td>
            <td class="px-3 py-2.5 font-mono text-slate-600">{{ formatTanggalID(s.tanggal) }}</td>
            <td class="px-3 py-2.5 text-slate-700">{{ s.pengirim || '-' }}</td>
            <td class="px-3 py-2.5 font-medium text-slate-800">{{ s.perihal }}</td>
            <td class="px-3 py-2.5"><AppBadge :label="s.status" :tone="toneStatus(s.status)" /></td>
            <td class="px-3 py-2.5">
              <div class="flex justify-end gap-0.5">
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700" title="Detail" :aria-label="`Detail ${s.nomorSurat}`" @click="openDetail(s)">
                  <Eye class="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Edit" :aria-label="`Edit ${s.nomorSurat}`" @click="openEdit(s)">
                  <Pencil class="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus" :aria-label="`Hapus ${s.nomorSurat}`" @click="confirmDelete(s)">
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <AppPagination v-if="total > limit" v-model="page" :total-items="total" :items-per-page="limit" @update:model-value="load" />
    </div>

    <!-- Modal form -->
    <AppModal v-model="showForm" :title="editing ? 'Edit Surat Masuk' : 'Tambah Surat Masuk'" subtitle="Nomor surat dibuat otomatis saat disimpan">
      <AppAlert v-if="formError" tone="danger">{{ formError }}</AppAlert>
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label for="f-tanggal" class="mb-1 block text-xs font-semibold text-slate-600">Tanggal surat *</label>
            <input id="f-tanggal" v-model="form.tanggal" type="date" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
          <div>
            <label for="f-status" class="mb-1 block text-xs font-semibold text-slate-600">Status</label>
            <select id="f-status" v-model="form.status" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600">
              <option v-for="st in STATUS_PILIHAN" :key="st" :value="st">{{ st }}</option>
            </select>
          </div>
        </div>
        <div>
          <label for="f-pengirim" class="mb-1 block text-xs font-semibold text-slate-600">Pengirim *</label>
          <input id="f-pengirim" v-model="form.pengirim" placeholder="Nama instansi / pengirim surat" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
        </div>
        <div>
          <label for="f-perihal" class="mb-1 block text-xs font-semibold text-slate-600">Perihal *</label>
          <input id="f-perihal" v-model="form.perihal" placeholder="Perihal surat" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
        </div>
        <div>
          <label for="f-ringkasan" class="mb-1 block text-xs font-semibold text-slate-600">Ringkasan isi</label>
          <textarea id="f-ringkasan" v-model="form.ringkasan" rows="3" placeholder="Ringkasan isi surat" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"></textarea>
        </div>
        <div>
          <label for="f-lampiran" class="mb-1 block text-xs font-semibold text-slate-600">URL lampiran</label>
          <input id="f-lampiran" v-model="form.lampiranUrl" placeholder="https://… (isi manual sementara)" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          <p class="mt-1 text-xs text-slate-400">Unggah berkas langsung belum tersedia; isi dengan URL berkas untuk sementara.</p>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showForm = false">Batal</AppButton>
        <AppButton :loading="saving" @click="save">Simpan</AppButton>
      </template>
    </AppModal>

    <!-- Modal detail -->
    <AppModal v-model="showDetail" title="Detail Surat" max-width="max-w-2xl">
      <div v-if="target" class="flex flex-col gap-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p class="text-xs font-semibold text-slate-500">Nomor surat</p>
            <p class="font-mono text-sm font-semibold text-slate-900">{{ target.nomorSurat }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-500">Tanggal</p>
            <p class="font-mono text-sm text-slate-800">{{ formatTanggalID(target.tanggal) }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-500">Pengirim</p>
            <p class="text-sm text-slate-800">{{ target.pengirim || '-' }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-500">Status</p>
            <p class="mt-0.5"><AppBadge :label="target.status" :tone="toneStatus(target.status)" /></p>
          </div>
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500">Perihal</p>
          <p class="text-sm text-slate-800">{{ target.perihal }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500">Ringkasan</p>
          <p class="text-sm text-slate-800">{{ target.ringkasan || '-' }}</p>
        </div>
        <div v-if="target.lampiranUrl">
          <p class="text-xs font-semibold text-slate-500">Lampiran</p>
          <a :href="target.lampiranUrl" target="_blank" rel="noopener" class="break-all font-mono text-sm text-emerald-700 hover:underline">{{ target.lampiranUrl }}</a>
        </div>

        <!-- Render dengan template -->
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <FileText class="h-3.5 w-3.5" aria-hidden="true" /> Render dengan template
          </p>
          <div class="flex flex-col gap-2 sm:flex-row">
            <select v-model="templateId" class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600">
              <option value="" disabled>Pilih template…</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.nama }}</option>
            </select>
            <AppButton size="sm" :loading="rendering" @click="renderDenganTemplate">Render</AppButton>
          </div>
          <p v-if="templates.length === 0" class="mt-1.5 text-xs text-slate-400">
            Belum ada template. Buat dulu di menu Template Surat.
          </p>
          <AppAlert v-if="renderError" tone="danger" class="mt-2">{{ renderError }}</AppAlert>
          <pre v-if="renderResult" class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-mono text-[13px] leading-relaxed text-slate-800">{{ renderResult }}</pre>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showDetail = false">Tutup</AppButton>
      </template>
    </AppModal>

    <!-- Konfirmasi hapus -->
    <AppConfirmDialog
      v-model="showDelete"
      title="Hapus Surat?"
      confirm-label="Hapus"
      :loading="saving"
      @confirm="hapus"
    >
      <template v-if="target">
        Surat <strong class="text-slate-900">{{ target.nomorSurat }}</strong>
        perihal "{{ target.perihal }}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
      </template>
    </AppConfirmDialog>
  </div>
</template>
