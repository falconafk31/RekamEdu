<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import AppAlert from '../../components/ui/AppAlert.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppConfirmDialog from '../../components/ui/AppConfirmDialog.vue'
import AppEmptyState from '../../components/ui/AppEmptyState.vue'
import AppModal from '../../components/ui/AppModal.vue'

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface SuratTemplate {
  id: string
  nama: string
  isi: string
  createdAt: string
  updatedAt: string
}

interface TemplateForm {
  nama: string
  isi: string
}

const PLACEHOLDER_HINT = [
  ['{{nomor}}', 'nomor surat otomatis, mis. 007/SMK-RE/K/III/2026'],
  ['{{tanggal}}', 'tanggal surat format dd/mm/yyyy'],
  ['{{perihal}}', 'perihal surat'],
  ['{{pengirim}}', 'pengirim (surat masuk)'],
  ['{{penerima}}', 'penerima (surat keluar)'],
  ['{{namaSekolah}}', 'nama sekolah dari pengaturan'],
  ['{{tahun}}', 'tahun surat'],
]

const rows = ref<SuratTemplate[]>([])
const loading = ref(false)
const loadError = ref('')
const showForm = ref(false)
const showDelete = ref(false)
const showPreview = ref(false)
const saving = ref(false)
const editing = ref(false)
const target = ref<SuratTemplate | null>(null)
const formError = ref('')
const successMsg = ref('')
const form = ref<TemplateForm>({ nama: '', isi: '' })

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api<SuratTemplate[]>('/surat/template')
    rows.value = res || []
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = false
  target.value = null
  form.value = { nama: '', isi: '' }
  formError.value = ''
  showForm.value = true
}

function openEdit(t: SuratTemplate) {
  editing.value = true
  target.value = t
  form.value = { nama: t.nama, isi: t.isi }
  formError.value = ''
  showForm.value = true
}

function openPreview(t: SuratTemplate) {
  target.value = t
  showPreview.value = true
}

async function save() {
  if (!form.value.nama.trim() || !form.value.isi.trim()) {
    formError.value = 'Nama dan isi template wajib diisi'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = { nama: form.value.nama.trim(), isi: form.value.isi }
    if (editing.value && target.value) {
      await api(`/surat/template/${target.value.id}`, { method: 'PATCH', body })
      successMsg.value = 'Template berhasil diperbarui'
    } else {
      await api('/surat/template', { method: 'POST', body })
      successMsg.value = 'Template berhasil disimpan'
    }
    showForm.value = false
    await load()
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    saving.value = false
  }
}

function confirmDelete(t: SuratTemplate) {
  target.value = t
  showDelete.value = true
}

async function hapus() {
  if (!target.value) return
  saving.value = true
  try {
    await api(`/surat/template/${target.value.id}`, { method: 'DELETE' })
    showDelete.value = false
    target.value = null
    successMsg.value = 'Template berhasil dihapus'
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
        <h1 class="text-xl font-bold text-slate-900">Template Surat</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ rows.length }} template tersimpan</p>
      </div>
      <AppButton @click="openCreate">
        <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
        Tambah Template
      </AppButton>
    </div>

    <AppAlert v-if="successMsg" tone="success" title="Berhasil">{{ successMsg }}</AppAlert>
    <AppAlert v-if="loadError" tone="danger" title="Gagal memuat data">
      {{ loadError }}
      <template #action>
        <AppButton size="sm" variant="secondary" @click="load()">Coba lagi</AppButton>
      </template>
    </AppAlert>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-4" aria-live="polite">
      <div class="flex flex-col gap-2">
        <div v-for="i in 4" :key="i" class="h-8 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
    <AppEmptyState v-else-if="rows.length === 0" title="Belum ada template surat" description="Buat template agar isi surat dapat dibuat otomatis dari data surat masuk/keluar.">
      <template #action>
        <AppButton size="sm" @click="openCreate">
          <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Tambah Template
        </AppButton>
      </template>
    </AppEmptyState>
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <article v-for="t in rows" :key="t.id" class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2">
            <FileText class="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <h2 class="truncate text-[15px] font-semibold text-slate-900">{{ t.nama }}</h2>
          </div>
        </div>
        <p class="line-clamp-3 whitespace-pre-wrap font-mono text-[13px] text-slate-500">{{ t.isi }}</p>
        <div class="mt-auto flex justify-end gap-0.5 pt-1">
          <AppButton size="sm" variant="ghost" @click="openPreview(t)">Pratinjau</AppButton>
          <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Edit" :aria-label="`Edit ${t.nama}`" @click="openEdit(t)">
            <Pencil class="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus" :aria-label="`Hapus ${t.nama}`" @click="confirmDelete(t)">
            <Trash2 class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>

    <!-- Modal form -->
    <AppModal v-model="showForm" :title="editing ? 'Edit Template' : 'Tambah Template'" max-width="max-w-2xl">
      <AppAlert v-if="formError" tone="danger">{{ formError }}</AppAlert>
      <div class="flex flex-col gap-3">
        <div>
          <label for="t-nama" class="mb-1 block text-xs font-semibold text-slate-600">Nama template *</label>
          <input id="t-nama" v-model="form.nama" placeholder="mis. Surat Keterangan" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
        </div>
        <div>
          <label for="t-isi" class="mb-1 block text-xs font-semibold text-slate-600">Isi template *</label>
          <textarea id="t-isi" v-model="form.isi" rows="10" placeholder="Tulis isi surat di sini, gunakan placeholder di bawah…" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"></textarea>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p class="mb-1.5 text-xs font-semibold text-slate-600">Placeholder yang didukung</p>
          <dl class="grid grid-cols-1 gap-1 sm:grid-cols-2">
            <div v-for="[ph, desc] in PLACEHOLDER_HINT" :key="ph" class="flex items-start gap-1.5 text-xs">
              <dt class="shrink-0 font-mono text-emerald-700">{{ ph }}</dt>
              <dd class="text-slate-500">- {{ desc }}</dd>
            </div>
          </dl>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showForm = false">Batal</AppButton>
        <AppButton :loading="saving" @click="save">Simpan</AppButton>
      </template>
    </AppModal>

    <!-- Pratinjau -->
    <AppModal v-model="showPreview" title="Pratinjau Template" max-width="max-w-2xl">
      <div v-if="target" class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold text-slate-900">{{ target.nama }}</h3>
        <pre class="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-slate-800">{{ target.isi }}</pre>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showPreview = false">Tutup</AppButton>
      </template>
    </AppModal>

    <!-- Konfirmasi hapus -->
    <AppConfirmDialog
      v-model="showDelete"
      title="Hapus Template?"
      confirm-label="Hapus"
      :loading="saving"
      @confirm="hapus"
    >
      <template v-if="target">
        Template <strong class="text-slate-900">{{ target.nama }}</strong>
        akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
      </template>
    </AppConfirmDialog>
  </div>
</template>
