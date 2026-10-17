<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { KeyRound, Pencil, Plus, Power, PowerOff, Trash2, TriangleAlert, X, ShieldCheck } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import AppBadge from '../../components/ui/AppBadge.vue'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface AiModel {
  id: string
  provider: string
  model: string
  displayName: string
  isActive: boolean
  _count: { planLinks: number; usageLogs: number }
}

interface PlanLink {
  id: string
  plan: 'trial' | 'pro' | 'custom'
  aiModel: { id: string; provider: string; model: string; displayName: string; isActive: boolean }
}

type PlanValue = 'trial' | 'pro' | 'custom'
const PLANS: { value: PlanValue; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'pro', label: 'Pro' },
  { value: 'custom', label: 'Kustom' },
]

// ---- Panel A: daftar model ----
const models = ref<AiModel[]>([])
const loading = ref(false)
const loadError = ref('')

const showForm = ref(false)
const editing = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ id: '', provider: '', model: '', displayName: '', apiKey: '', isActive: true })

const showDelete = ref(false)
const target = ref<AiModel | null>(null)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api<AiModel[]>('/owner/ai-models')
    models.value = Array.isArray(res) ? res : []
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = false
  form.value = { id: '', provider: '', model: '', displayName: '', apiKey: '', isActive: true }
  formError.value = ''
  showForm.value = true
}

function openEdit(m: AiModel) {
  editing.value = true
  form.value = { id: m.id, provider: m.provider, model: m.model, displayName: m.displayName, apiKey: '', isActive: m.isActive }
  formError.value = ''
  showForm.value = true
}

async function save() {
  if (!form.value.provider.trim() || !form.value.model.trim() || !form.value.displayName.trim()) {
    formError.value = 'Provider, model, dan nama tampilan wajib diisi'
    return
  }
  if (!editing.value && !form.value.apiKey) {
    formError.value = 'API key wajib diisi untuk model baru'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      const body: Record<string, unknown> = {
        displayName: form.value.displayName.trim(),
        isActive: form.value.isActive,
      }
      if (form.value.apiKey) body.apiKey = form.value.apiKey
      await api(`/owner/ai-models/${form.value.id}`, { method: 'PATCH', body })
    } else {
      await api('/owner/ai-models', {
        method: 'POST',
        body: {
          provider: form.value.provider.trim(),
          model: form.value.model.trim(),
          displayName: form.value.displayName.trim(),
          apiKey: form.value.apiKey,
          isActive: form.value.isActive,
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

async function toggleActive(m: AiModel) {
  try {
    await api(`/owner/ai-models/${m.id}`, { method: 'PATCH', body: { isActive: !m.isActive } })
    await load()
  } catch (e) {
    loadError.value = pesanError(e)
  }
}

function confirmDelete(m: AiModel) {
  target.value = m
  showDelete.value = true
}

async function hapus() {
  if (!target.value) return
  saving.value = true
  try {
    await api(`/owner/ai-models/${target.value.id}`, { method: 'DELETE' })
    showDelete.value = false
    target.value = null
    await load()
    await loadPlanLinks()
  } catch (e) {
    loadError.value = pesanError(e)
    showDelete.value = false
  } finally {
    saving.value = false
  }
}

// ---- Panel B: izin per paket ----
const planTab = ref<PlanValue>('trial')
const planLinks = ref<PlanLink[]>([])
const planLoading = ref(false)
const planError = ref('')
const checked = ref<Record<string, boolean>>({})
const syncing = ref(false)

const planLinkCount = computed(() => planLinks.value.filter((l) => l.plan === planTab.value).length)

async function loadPlanLinks() {
  planLoading.value = true
  planError.value = ''
  try {
    const res = await api<PlanLink[]>('/owner/plan-models')
    planLinks.value = Array.isArray(res) ? res : []
  } catch (e) {
    planError.value = pesanError(e)
  } finally {
    planLoading.value = false
  }
}

function refreshChecked() {
  const next: Record<string, boolean> = {}
  for (const m of models.value) next[m.id] = false
  for (const l of planLinks.value) {
    if (l.plan === planTab.value) next[l.aiModel.id] = true
  }
  checked.value = next
}

watch([planTab, planLinks, models], refreshChecked)

async function simpanIzin() {
  syncing.value = true
  planError.value = ''
  try {
    const wanted = new Set(Object.entries(checked.value).filter(([, v]) => v).map(([k]) => k))
    const current = new Map(planLinks.value.filter((l) => l.plan === planTab.value).map((l) => [l.aiModel.id, l.id]))
    const toAdd = [...wanted].filter((id) => !current.has(id))
    const toRemove = [...current.entries()].filter(([id]) => !wanted.has(id))
    for (const id of toAdd) {
      await api('/owner/plan-models', { method: 'POST', body: { plan: planTab.value, aiModelId: id } })
    }
    for (const [, linkId] of toRemove) {
      await api(`/owner/plan-models/${linkId}`, { method: 'DELETE' })
    }
    await loadPlanLinks()
    await load()
  } catch (e) {
    planError.value = pesanError(e)
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  await load()
  await loadPlanLinks()
})
</script>

<template>
  <div v-if="!auth.isOwner" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
    <TriangleAlert class="h-10 w-10 text-amber-400" aria-hidden="true" />
    <p class="text-sm font-semibold text-slate-800">Akses ditolak</p>
    <p class="max-w-sm text-[13px] text-slate-500">Halaman ini hanya dapat diakses oleh Owner platform.</p>
  </div>
  <div v-else class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Model AI</h1>
        <p class="mt-0.5 text-sm text-slate-500">Kunci API provider AI milik platform</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />
        Tambah Model
      </button>
    </div>

    <p class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
      <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>API key terenkripsi di server dan tidak pernah ditampilkan.</span>
    </p>

    <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="flex-1">{{ loadError }}</div>
      <button type="button" class="font-semibold underline" @click="load()">Coba lagi</button>
    </div>

    <!-- Panel A: daftar model -->
    <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="text-sm font-bold text-slate-900">Daftar Model AI</h2>
      <div v-if="loading" class="flex flex-col gap-2" aria-live="polite">
        <div v-for="i in 4" :key="i" class="h-8 animate-pulse rounded bg-slate-100" />
      </div>
      <div v-else-if="models.length === 0" class="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <KeyRound class="h-10 w-10 text-slate-300" aria-hidden="true" />
        <p class="text-sm font-semibold text-slate-800">Belum ada model AI</p>
        <p class="max-w-sm text-[13px] text-slate-500">Tambahkan model melalui tombol di atas.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-left text-sm">
          <caption class="sr-only">Daftar model AI</caption>
          <thead>
            <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th class="px-3 py-2.5 font-semibold">Provider</th>
              <th class="px-3 py-2.5 font-semibold">Model</th>
              <th class="px-3 py-2.5 font-semibold">Nama Tampilan</th>
              <th class="px-3 py-2.5 font-semibold">Status</th>
              <th class="px-3 py-2.5 text-center font-semibold">Paket Mengizinkan</th>
              <th class="px-3 py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in models" :key="m.id" class="border-t border-slate-100 hover:bg-slate-50/60">
              <td class="px-3 py-2.5 text-slate-700">{{ m.provider }}</td>
              <td class="px-3 py-2.5 font-mono text-slate-500">{{ m.model }}</td>
              <td class="px-3 py-2.5 font-medium text-slate-800">{{ m.displayName }}</td>
              <td class="px-3 py-2.5">
                <AppBadge :label="m.isActive ? 'Aktif' : 'Nonaktif'" :tone="m.isActive ? 'success' : 'neutral'" />
              </td>
              <td class="px-3 py-2.5 text-center font-mono text-slate-600">{{ m._count?.planLinks ?? 0 }}</td>
              <td class="px-3 py-2.5">
                <div class="flex justify-end gap-0.5">
                  <button
                    type="button"
                    class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    :title="m.isActive ? 'Nonaktifkan' : 'Aktifkan'"
                    :aria-label="`${m.isActive ? 'Nonaktifkan' : 'Aktifkan'} ${m.displayName}`"
                    @click="toggleActive(m)"
                  >
                    <component :is="m.isActive ? PowerOff : Power" class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Edit" :aria-label="`Edit ${m.displayName}`" @click="openEdit(m)">
                    <Pencil class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus" :aria-label="`Hapus ${m.displayName}`" @click="confirmDelete(m)">
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Panel B: izin per paket -->
    <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-slate-900">Izin per Paket</h2>
        <div class="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            v-for="p in PLANS"
            :key="p.value"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-semibold"
            :class="planTab === p.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            @click="planTab = p.value"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
      <div v-if="planError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>{{ planError }}</div>
      </div>
      <p class="text-[13px] text-slate-500">Pilih model yang boleh dipakai tenant paket <strong class="text-slate-800">{{ PLANS.find((p) => p.value === planTab)?.label }}</strong> ({{ planLinkCount }} diizinkan).</p>
      <div v-if="planLoading" class="flex flex-col gap-2">
        <div v-for="i in 3" :key="i" class="h-8 animate-pulse rounded bg-slate-100" />
      </div>
      <div v-else-if="models.length === 0" class="text-sm text-slate-400">Belum ada model AI.</div>
      <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label v-for="m in models" :key="m.id" class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50/60">
          <input v-model="checked[m.id]" type="checkbox" class="h-4 w-4 rounded accent-emerald-700" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-slate-800">{{ m.displayName }}</span>
            <span class="block truncate font-mono text-xs text-slate-400">{{ m.provider }} / {{ m.model }}</span>
          </span>
          <AppBadge v-if="!m.isActive" label="Nonaktif" tone="neutral" />
        </label>
      </div>
      <div class="flex justify-end">
        <button type="button" :disabled="syncing" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="simpanIzin">
          {{ syncing ? 'Menyimpan…' : 'Simpan Izin' }}
        </button>
      </div>
    </div>

    <!-- Modal tambah/edit -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showForm = false">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div class="mb-4 flex items-start justify-between">
          <h2 class="text-base font-bold text-slate-900">{{ editing ? 'Edit Model AI' : 'Tambah Model AI' }}</h2>
          <button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup" @click="showForm = false">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div v-if="formError" class="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{{ formError }}</div>
        </div>
        <div class="flex flex-col gap-3">
          <div>
            <label for="am-provider" class="mb-1 block text-xs font-semibold text-slate-600">Provider *</label>
            <input id="am-provider" v-model="form.provider" :disabled="editing" placeholder="mis. openai" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" />
          </div>
          <div>
            <label for="am-model" class="mb-1 block text-xs font-semibold text-slate-600">Model *</label>
            <input id="am-model" v-model="form.model" :disabled="editing" placeholder="mis. gpt-4o-mini" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" />
          </div>
          <div>
            <label for="am-display" class="mb-1 block text-xs font-semibold text-slate-600">Nama tampilan *</label>
            <input id="am-display" v-model="form.displayName" placeholder="mis. GPT-4o Mini" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          </div>
          <div>
            <label for="am-key" class="mb-1 block text-xs font-semibold text-slate-600">API key {{ editing ? '(opsional)' : '*' }}</label>
            <input id="am-key" v-model="form.apiKey" type="password" autocomplete="new-password" :placeholder="editing ? 'Isi untuk mengganti key lama' : 'Tempel API key provider'" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            <p class="mt-1 text-xs text-slate-400">Key terenkripsi di server dan tidak pernah ditampilkan.</p>
          </div>
          <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded accent-emerald-700" />
            Model aktif
          </label>
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
        <h2 class="text-base font-bold text-slate-900">Hapus Model AI?</h2>
        <p v-if="target" class="mt-2 text-sm text-slate-600">
          Model <strong class="text-slate-900">{{ target.displayName }}</strong>
          <span class="font-mono text-slate-400">({{ target.provider }}/{{ target.model }})</span>
          akan dihapus beserta izin paket dan riwayat pemakaiannya. Tindakan ini tidak dapat dibatalkan.
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
