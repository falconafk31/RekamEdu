<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Building2, Pencil, TriangleAlert, X } from 'lucide-vue-next'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import AppBadge from '../../components/ui/AppBadge.vue'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

type PlanValue = 'trial' | 'pro' | 'custom'
type StatusValue = 'active' | 'expired' | 'suspended'

interface SubscriptionInfo {
  plan: PlanValue
  status: StatusValue
  expiresAt: string | null
}

interface Tenant {
  id: string
  kodeSekolah: string
  nama: string
  createdAt: string
  subscription: SubscriptionInfo | null
  _count: { users: number }
}

const rows = ref<Tenant[]>([])
const loading = ref(false)
const loadError = ref('')

const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const target = ref<Tenant | null>(null)
const form = ref<{ plan: PlanValue; status: StatusValue; expiresAt: string }>({
  plan: 'trial',
  status: 'active',
  expiresAt: '',
})

const PLAN_LABEL: Record<string, string> = { trial: 'Trial', pro: 'Pro', custom: 'Kustom' }
const STATUS_LABEL: Record<string, string> = { active: 'Aktif', expired: 'Kedaluwarsa', suspended: 'Ditangguhkan' }

function planTone(plan: string): string {
  return plan === 'pro' ? 'success' : plan === 'custom' ? 'info' : 'neutral'
}
function statusTone(status: string): string {
  return status === 'active' ? 'success' : status === 'expired' ? 'warning' : 'danger'
}

function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api<Tenant[]>('/owner/tenants')
    rows.value = Array.isArray(res) ? res : []
  } catch (e) {
    loadError.value = pesanError(e)
  } finally {
    loading.value = false
  }
}

function openModal(t: Tenant) {
  target.value = t
  form.value = {
    plan: t.subscription?.plan ?? 'trial',
    status: t.subscription?.status ?? 'active',
    expiresAt: t.subscription?.expiresAt ? t.subscription.expiresAt.slice(0, 10) : '',
  }
  formError.value = ''
  showModal.value = true
}

async function save() {
  if (!target.value) return
  saving.value = true
  formError.value = ''
  try {
    await api(`/owner/tenants/${target.value.id}`, {
      method: 'PATCH',
      body: {
        plan: form.value.plan,
        status: form.value.status,
        expiresAt: form.value.expiresAt ? form.value.expiresAt : null,
      },
    })
    showModal.value = false
    target.value = null
    await load()
  } catch (e) {
    formError.value = pesanError(e)
  } finally {
    saving.value = false
  }
}

onMounted(() => { void load() })
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
        <h1 class="text-xl font-bold text-slate-900">Kelola Tenant</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ rows.length }} tenant terdaftar</p>
      </div>
    </div>

    <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="flex-1">{{ loadError }}</div>
      <button type="button" class="font-semibold underline" @click="load()">Coba lagi</button>
    </div>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-4" aria-live="polite">
      <div class="flex flex-col gap-2">
        <div v-for="i in 6" :key="i" class="h-8 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
    <div v-else-if="rows.length === 0" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <Building2 class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Belum ada tenant</p>
      <p class="max-w-sm text-[13px] text-slate-500">Tenant baru muncul di sini setelah mendaftar.</p>
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[760px] text-left text-sm">
        <caption class="sr-only">Daftar tenant</caption>
        <thead>
          <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th class="px-3 py-2.5 font-semibold">Kode Sekolah</th>
            <th class="px-3 py-2.5 font-semibold">Nama Sekolah</th>
            <th class="px-3 py-2.5 font-semibold">Paket</th>
            <th class="px-3 py-2.5 font-semibold">Status</th>
            <th class="px-3 py-2.5 font-semibold">Kedaluwarsa</th>
            <th class="px-3 py-2.5 font-semibold">Terdaftar</th>
            <th class="px-3 py-2.5 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id" class="border-t border-slate-100 hover:bg-slate-50/60">
            <td class="px-3 py-2.5 font-mono text-slate-500">{{ t.kodeSekolah }}</td>
            <td class="px-3 py-2.5 font-medium text-slate-800">
              {{ t.nama }}
              <span class="block text-xs font-normal text-slate-400">{{ t._count?.users ?? 0 }} pengguna</span>
            </td>
            <td class="px-3 py-2.5">
              <AppBadge v-if="t.subscription" :label="PLAN_LABEL[t.subscription.plan] ?? t.subscription.plan" :tone="planTone(t.subscription.plan)" />
              <span v-else class="text-xs text-slate-400">Belum diatur</span>
            </td>
            <td class="px-3 py-2.5">
              <AppBadge v-if="t.subscription" :label="STATUS_LABEL[t.subscription.status] ?? t.subscription.status" :tone="statusTone(t.subscription.status)" />
              <span v-else class="text-xs text-slate-400">—</span>
            </td>
            <td class="px-3 py-2.5 font-mono text-slate-600">{{ formatTanggal(t.subscription?.expiresAt) }}</td>
            <td class="px-3 py-2.5 font-mono text-slate-600">{{ formatTanggal(t.createdAt) }}</td>
            <td class="px-3 py-2.5">
              <div class="flex justify-end">
                <button type="button" class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Kelola Langganan" :aria-label="`Kelola langganan ${t.nama}`" @click="openModal(t)">
                  <Pencil class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal kelola langganan -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" @click.self="showModal = false">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Kelola Langganan</h2>
            <p v-if="target" class="mt-0.5 text-sm text-slate-500">{{ target.nama }} <span class="font-mono text-slate-400">({{ target.kodeSekolah }})</span></p>
          </div>
          <button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup" @click="showModal = false">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div v-if="formError" class="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{{ formError }}</div>
        </div>
        <div class="flex flex-col gap-3">
          <div>
            <label for="ot-plan" class="mb-1 block text-xs font-semibold text-slate-600">Paket</label>
            <select id="ot-plan" v-model="form.plan" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600">
              <option value="trial">Trial</option>
              <option value="pro">Pro</option>
              <option value="custom">Kustom</option>
            </select>
          </div>
          <div>
            <label for="ot-status" class="mb-1 block text-xs font-semibold text-slate-600">Status</label>
            <select id="ot-status" v-model="form.status" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600">
              <option value="active">Aktif</option>
              <option value="expired">Kedaluwarsa</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>
          <div>
            <label for="ot-expires" class="mb-1 block text-xs font-semibold text-slate-600">Tanggal kedaluwarsa</label>
            <input id="ot-expires" v-model="form.expiresAt" type="date" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            <p class="mt-1 text-xs text-slate-400">Kosongkan untuk tanpa batas waktu.</p>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="showModal = false">Batal</button>
          <button type="button" :disabled="saving" class="rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" @click="save">
            {{ saving ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
