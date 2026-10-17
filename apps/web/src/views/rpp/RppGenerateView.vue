<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowLeft, Sparkles, Save, TriangleAlert,
  CircleCheck, LoaderCircle, Square,
} from 'lucide-vue-next'
import { api, ApiError, getApiToken } from '../../lib/api'

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface AiModel {
  id: string
  provider: string
  model: string
  displayName: string
}

interface SseChunk {
  type?: string
  message?: string
  tokensInput?: number
  tokensOutput?: number
  choices?: Array<{ delta?: { content?: string } }>
}

const JENJANG = ['SD', 'SMP', 'SMA', 'SMK']
const MODEL_PEMBELAJARAN = [
  'Problem Based Learning',
  'Project Based Learning',
  'Discovery Learning',
  'Inquiry Learning',
  'Cooperative Learning',
  'Ceramah Interaktif',
]

const models = ref<AiModel[]>([])
const loadingModels = ref(false)

const aiModelId = ref('')
const jenjang = ref('')
const kelas = ref('')
const mapel = ref('')
const materiPokok = ref('')
const modelPembelajaran = ref('')
const durasiMenit = ref<number | null>(null)
const tujuanTambahan = ref('')

const generating = ref(false)
const hasil = ref('')
const error = ref('')
const selesai = ref(false)
const tokenInfo = ref('')
const aborter = ref<AbortController | null>(null)

const judulSimpan = ref('')
const saving = ref(false)
const saveError = ref('')
const tersimpan = ref(false)

const formValid = computed(() =>
  aiModelId.value !== '' &&
  jenjang.value !== '' &&
  kelas.value.trim() !== '' &&
  mapel.value.trim() !== '' &&
  materiPokok.value.trim() !== '',
)

async function loadModels() {
  loadingModels.value = true
  try {
    models.value = await api<AiModel[]>('/rpp/ai/models')
    if (models.value.length === 1) aiModelId.value = models.value[0].id
  } catch (e) {
    error.value = pesanError(e)
  } finally {
    loadingModels.value = false
  }
}

function olahBaris(baris: string) {
  const rapi = baris.trim()
  if (!rapi.startsWith('data:')) return
  const muatan = rapi.slice(5).trim()
  if (!muatan || muatan === '[DONE]') return
  let json: SseChunk
  try {
    json = JSON.parse(muatan) as SseChunk
  } catch {
    return
  }
  if (json.type === 'error') {
    throw new Error(json.message || 'Terjadi galat saat menyusun RPP.')
  }
  if (json.type === 'done') {
    const masuk = typeof json.tokensInput === 'number' ? json.tokensInput : 0
    const keluar = typeof json.tokensOutput === 'number' ? json.tokensOutput : 0
    tokenInfo.value = `${masuk.toLocaleString('id-ID')} token masuk, ${keluar.toLocaleString('id-ID')} token keluar`
    return
  }
  const delta = json.choices?.[0]?.delta?.content
  if (typeof delta === 'string' && delta) hasil.value += delta
}

async function generate() {
  if (!formValid.value || generating.value) return
  const token = getApiToken()
  if (!token) {
    error.value = 'Sesi Anda berakhir. Silakan masuk kembali.'
    return
  }
  error.value = ''
  hasil.value = ''
  selesai.value = false
  tokenInfo.value = ''
  tersimpan.value = false
  saveError.value = ''
  generating.value = true
  judulSimpan.value = `RPP ${mapel.value.trim()} - ${materiPokok.value.trim()}`.slice(0, 200)
  aborter.value = new AbortController()

  try {
    const res = await fetch('/api/rpp/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        aiModelId: aiModelId.value,
        jenjang: jenjang.value,
        kelas: kelas.value.trim(),
        mapel: mapel.value.trim(),
        materiPokok: materiPokok.value.trim(),
        modelPembelajaran: modelPembelajaran.value || undefined,
        durasiMenit: durasiMenit.value ?? undefined,
        tujuanTambahan: tujuanTambahan.value.trim() || undefined,
      }),
      signal: aborter.value.signal,
    })

    if (res.status === 403) {
      error.value = 'Kuota AI harian sekolah habis. Coba lagi besok atau hubungi admin.'
      return
    }
    if (!res.ok || !res.body) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      error.value = data?.message ?? `Permintaan gagal (kode ${res.status}).`
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const baris = buffer.split('\n')
        buffer = baris.pop() ?? ''
        for (const b of baris) olahBaris(b)
      }
      olahBaris(buffer)
    } finally {
      reader.releaseLock()
    }
    selesai.value = true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      error.value = 'Penyusunan dibatalkan.'
    } else {
      error.value = e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga.'
    }
  } finally {
    generating.value = false
    aborter.value = null
  }
}

function batalkan() {
  aborter.value?.abort()
}

async function simpan() {
  if (!judulSimpan.value.trim() || !hasil.value.trim() || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    await api('/rpp/dokumen', {
      method: 'POST',
      body: {
        jenis: 'RPP',
        judul: judulSimpan.value.trim(),
        konten: hasil.value,
        status: 'DRAFT',
        metadata: {
          jenjang: jenjang.value,
          kelas: kelas.value.trim(),
          mapel: mapel.value.trim(),
          modelPembelajaran: modelPembelajaran.value || undefined,
          durasiMenit: durasiMenit.value ?? undefined,
        },
        aiModelId: aiModelId.value,
      },
    })
    tersimpan.value = true
  } catch (e) {
    saveError.value = pesanError(e)
  } finally {
    saving.value = false
  }
}

onMounted(loadModels)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <RouterLink
        to="/rpp"
        class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        title="Kembali ke daftar dokumen"
        aria-label="Kembali ke daftar dokumen"
      >
        <ArrowLeft class="h-5 w-5" aria-hidden="true" />
      </RouterLink>
      <div>
        <h1 class="text-xl font-bold text-slate-900">Buat RPP dengan AI</h1>
        <p class="mt-0.5 text-sm text-slate-500">Isi parameter pembelajaran, AI menyusun draf RPP secara langsung.</p>
      </div>
    </div>

    <div v-if="error" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div class="flex-1">{{ error }}</div>
      <button type="button" class="font-semibold underline" @click="error = ''">Tutup</button>
    </div>

    <!-- Form parameter -->
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="mb-3 text-sm font-bold text-slate-900">Parameter Pembelajaran</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="g-model" class="mb-1 block text-xs font-semibold text-slate-600">Model AI *</label>
          <select id="g-model" v-model="aiModelId" :disabled="generating || loadingModels" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100">
            <option value="" disabled>{{ loadingModels ? 'Memuat…' : 'Pilih model AI…' }}</option>
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.displayName }}</option>
          </select>
          <p v-if="!loadingModels && models.length === 0" class="mt-1 text-xs text-amber-700">Tidak ada model AI yang diizinkan untuk paket sekolah ini.</p>
        </div>
        <div>
          <label for="g-jenjang" class="mb-1 block text-xs font-semibold text-slate-600">Jenjang *</label>
          <select id="g-jenjang" v-model="jenjang" :disabled="generating" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100">
            <option value="" disabled>Pilih jenjang…</option>
            <option v-for="j in JENJANG" :key="j" :value="j">{{ j }}</option>
          </select>
        </div>
        <div>
          <label for="g-kelas" class="mb-1 block text-xs font-semibold text-slate-600">Kelas *</label>
          <input id="g-kelas" v-model="kelas" :disabled="generating" placeholder="mis. 4 / VII / X" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" />
        </div>
        <div>
          <label for="g-mapel" class="mb-1 block text-xs font-semibold text-slate-600">Mata pelajaran *</label>
          <input id="g-mapel" v-model="mapel" :disabled="generating" placeholder="mis. Matematika" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" />
        </div>
        <div class="sm:col-span-2">
          <label for="g-materi" class="mb-1 block text-xs font-semibold text-slate-600">Materi pokok *</label>
          <input id="g-materi" v-model="materiPokok" :disabled="generating" placeholder="mis. Pecahan senilai" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" />
        </div>
        <div>
          <label for="g-modelbelajar" class="mb-1 block text-xs font-semibold text-slate-600">Model pembelajaran</label>
          <select id="g-modelbelajar" v-model="modelPembelajaran" :disabled="generating" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100">
            <option value="">Otomatis (pilihan AI)</option>
            <option v-for="m in MODEL_PEMBELAJARAN" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div>
          <label for="g-durasi" class="mb-1 block text-xs font-semibold text-slate-600">Durasi (menit)</label>
          <input id="g-durasi" v-model.number="durasiMenit" :disabled="generating" type="number" min="10" max="600" placeholder="mis. 70" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" />
        </div>
        <div class="sm:col-span-2">
          <label for="g-tujuan" class="mb-1 block text-xs font-semibold text-slate-600">Tujuan / catatan tambahan</label>
          <textarea id="g-tujuan" v-model="tujuanTambahan" :disabled="generating" rows="2" placeholder="Contoh: tekankan pembelajaran diferensiasi untuk murid lambat belajar" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100" />
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-if="!generating"
          type="button"
          :disabled="!formValid"
          class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          @click="generate"
        >
          <Sparkles class="h-4 w-4" aria-hidden="true" />
          Susun RPP
        </button>
        <button
          v-else
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          @click="batalkan"
        >
          <Square class="h-4 w-4" aria-hidden="true" />
          Batalkan
        </button>
      </div>
    </div>

    <!-- Hasil streaming -->
    <div v-if="generating || hasil" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-bold text-slate-900">Draf RPP</h2>
        <span v-if="generating" class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700" aria-live="polite">
          <LoaderCircle class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Menyusun…
        </span>
        <span v-else-if="selesai" class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CircleCheck class="h-3.5 w-3.5" aria-hidden="true" />
          Selesai{{ tokenInfo ? ` — ${tokenInfo}` : '' }}
        </span>
      </div>
      <div class="max-h-[55vh] min-h-[12rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800" aria-live="polite">{{ hasil || ' ' }}</div>

      <div v-if="selesai && !tersimpan" class="mt-3 rounded-lg border border-slate-200 bg-white p-3">
        <div v-if="saveError" class="mb-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{{ saveError }}</div>
        </div>
        <label for="g-judul" class="mb-1 block text-xs font-semibold text-slate-600">Judul dokumen</label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input id="g-judul" v-model="judulSimpan" placeholder="Judul dokumen" class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" />
          <button
            type="button"
            :disabled="saving || !judulSimpan.trim()"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brandgreen px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            @click="simpan"
          >
            <Save class="h-4 w-4" aria-hidden="true" />
            {{ saving ? 'Menyimpan…' : 'Simpan sebagai Dokumen' }}
          </button>
        </div>
      </div>
      <div v-if="tersimpan" class="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
        <CircleCheck class="h-4 w-4 shrink-0" aria-hidden="true" />
        <div class="flex-1">Dokumen tersimpan sebagai draf.</div>
        <RouterLink to="/rpp" class="font-semibold underline">Lihat daftar dokumen</RouterLink>
      </div>
    </div>

    <!-- Kosong -->
    <div v-if="!generating && !hasil && !error" class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
      <p>Isi parameter di atas lalu tekan <strong class="text-slate-700">Susun RPP</strong>. Draf akan muncul di sini baris demi baris selagi AI menulis.</p>
    </div>
  </div>
</template>
