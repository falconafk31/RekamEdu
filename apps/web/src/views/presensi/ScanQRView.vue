<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { CheckCircle2, XCircle, ScanLine, Clock, TriangleAlert } from 'lucide-vue-next'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { todayISO } from '../../lib/dates'

const auth = useAuthStore()

function pesanError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga'
}

interface ScanSiswa {
  nama: string
  kelas?: string
  nisn: string
}

interface ScanRecord {
  success: boolean
  student: ScanSiswa
  time: number
  message: string
}

interface ScanResp {
  message?: string
  data?: {
    nama?: string
    kelas?: string
    nisn?: string
    status?: string
    sudahTercatat?: boolean
  }
}

const scanning = ref(false)
const lastScanned = ref<ScanRecord | null>(null)
const recentScans = ref<ScanRecord[]>([])
const loadError = ref('')
let html5QrcodeScanner: Html5QrcodeScanner | null = null
let isProcessing = false

let audioCtx: AudioContext | null = null
function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new AC()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // abaikan — audio hanya pemanis
  }
}

let wakeLock: { release: () => Promise<void> } | null = null
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen')
    } catch {
      // abaikan
    }
  }
}
function releaseWakeLock() {
  if (wakeLock !== null) {
    void wakeLock.release().catch(() => undefined)
    wakeLock = null
  }
}

const handleVisibilityChange = () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    void requestWakeLock()
  }
}

function initScanner() {
  if (html5QrcodeScanner) return
  html5QrcodeScanner = new Html5QrcodeScanner(
    'qr-reader',
    {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      rememberLastUsedCamera: true,
    },
    false,
  )
  html5QrcodeScanner.render(onScanSuccess, onScanFailure)
  scanning.value = true
}

function stopScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch((err: unknown) => {
      console.error('Gagal menghentikan scanner: ', err)
    })
    html5QrcodeScanner = null
    scanning.value = false
  }
}

async function onScanSuccess(decodedText: string) {
  if (isProcessing) return
  const nisn = decodedText.trim()
  if (!nisn) return
  if (lastScanned.value?.student.nisn === nisn && Date.now() - lastScanned.value.time < 3000) return

  isProcessing = true
  loadError.value = ''
  try {
    const res = await api<ScanResp>('/presensi/presensi/scan', {
      method: 'POST',
      body: { nisn, tanggal: todayISO(), status: 'Hadir' },
    })
    const d = res.data || {}
    const student: ScanSiswa = {
      nama: d.nama || 'Siswa',
      kelas: d.kelas,
      nisn: d.nisn || nisn,
    }
    const sudah = d.sudahTercatat === true
    if (sudah) playTone(300, 0.3, 'sawtooth')
    else { playTone(880, 0.1, 'sine'); setTimeout(() => playTone(1760, 0.2, 'sine'), 100) }
    const record: ScanRecord = {
      success: !sudah,
      student,
      time: Date.now(),
      message: res.message || (sudah ? 'Sudah tercatat hari ini' : 'Kehadiran berhasil dicatat'),
    }
    lastScanned.value = record
    addToHistory(record)
  } catch (e) {
    playTone(300, 0.3, 'sawtooth')
    loadError.value = pesanError(e)
  } finally {
    setTimeout(() => { isProcessing = false }, 1500)
  }
}

function onScanFailure() {
  // Abaikan kegagalan baca bingkai — scanner tetap berjalan.
}

function addToHistory(record: ScanRecord) {
  recentScans.value.unshift(record)
  if (recentScans.value.length > 5) recentScans.value.pop()
}

function formatTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

onMounted(() => {
  const unlockAudio = () => {
    try {
      const ctx = getAudioCtx()
      if (ctx.state === 'suspended') void ctx.resume()
    } catch {
      // abaikan
    }
    document.removeEventListener('click', unlockAudio)
    document.removeEventListener('touchstart', unlockAudio)
  }
  document.addEventListener('click', unlockAudio)
  document.addEventListener('touchstart', unlockAudio)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (auth.canPresensi) {
    initScanner()
    void requestWakeLock()
  }
})

onUnmounted(() => {
  stopScanner()
  releaseWakeLock()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Scan QR Presensi</h1>
        <p class="mt-0.5 text-sm text-slate-500">Pindai QR Code pada kartu pelajar dengan kamera</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="scanning"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          @click="stopScanner"
        >
          Matikan Kamera
        </button>
        <button
          v-else
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-brandgreen px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          @click="initScanner"
        >
          <ScanLine class="h-4 w-4" aria-hidden="true" />
          Nyalakan Kamera
        </button>
      </div>
    </div>

    <div v-if="!auth.canPresensi" class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
      <ScanLine class="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p class="text-sm font-semibold text-slate-800">Anda tidak memiliki akses scan presensi</p>
      <p class="max-w-sm text-[13px] text-slate-500">Hubungi administrator bila Anda seharusnya dapat mencatat kehadiran via QR.</p>
    </div>

    <template v-else>
      <div v-if="loadError" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div class="flex-1">{{ loadError }}</div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- Scanner -->
        <div class="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 class="text-[15px] font-bold text-slate-900">Kamera Scanner</h2>
          <p class="mb-3 text-xs text-slate-500">Arahkan QR Code ke dalam bingkai</p>
          <div class="relative min-h-[380px] w-full overflow-hidden rounded-xl bg-slate-950 sm:min-h-[420px]">
            <div id="qr-reader" class="h-full w-full" />
            <div v-if="!scanning" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/85 px-4 text-center text-white">
              <ScanLine class="mb-3 h-14 w-14 opacity-40" aria-hidden="true" />
              <p class="text-[15px] font-semibold">Kamera nonaktif</p>
              <p class="mt-1 text-[13px] text-slate-300">Nyalakan kamera untuk mulai memindai</p>
              <button type="button" class="mt-4 inline-flex items-center gap-2 rounded-lg bg-brandgreen px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800" @click="initScanner">
                <ScanLine class="h-4 w-4" aria-hidden="true" />
                Nyalakan Kamera
              </button>
            </div>
          </div>
          <p class="mt-3 text-center text-[13px] text-slate-400">
            Izinkan akses kamera (Allow Camera) pada browser agar scanner berfungsi.
          </p>
        </div>

        <div class="flex flex-col gap-4">
          <!-- Status terakhir -->
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <h2 class="text-[15px] font-bold text-slate-900">Status Terakhir</h2>
            <div v-if="!lastScanned" class="py-4 text-center">
              <ScanLine class="mx-auto mb-2 h-10 w-10 text-slate-200" aria-hidden="true" />
              <p class="text-sm text-slate-400">Menunggu scan QR Code…</p>
            </div>
            <div v-else class="py-2 text-center" aria-live="polite">
              <CheckCircle2 v-if="lastScanned.success" class="mx-auto mb-3 h-14 w-14 text-emerald-500" aria-hidden="true" />
              <XCircle v-else class="mx-auto mb-3 h-14 w-14 text-rose-500" aria-hidden="true" />
              <h3 class="text-lg font-bold text-slate-900">{{ lastScanned.student.nama }}</h3>
              <p class="mb-3 font-mono text-[13px] text-slate-500">Kelas {{ lastScanned.student.kelas || '–' }} · {{ lastScanned.student.nisn }}</p>
              <span
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                :class="lastScanned.success ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'"
              >
                {{ lastScanned.message }}
              </span>
            </div>
          </div>

          <!-- Riwayat -->
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <h2 class="text-[15px] font-bold text-slate-900">Riwayat Sesi Ini</h2>
            <p class="mb-2 text-xs text-slate-500">{{ recentScans.length }} pindaian</p>
            <div v-if="recentScans.length === 0" class="flex flex-col items-center gap-2 py-6 text-center">
              <Clock class="h-10 w-10 text-slate-200" aria-hidden="true" />
              <p class="text-sm font-semibold text-slate-700">Belum ada riwayat</p>
              <p class="text-[13px] text-slate-500">Hasil pindaian sesi ini akan tercatat di sini.</p>
            </div>
            <ul v-else class="divide-y divide-slate-100">
              <li v-for="scan in recentScans" :key="scan.time" class="flex items-start gap-3 py-3">
                <CheckCircle2 v-if="scan.success" class="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
                <XCircle v-else class="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-slate-800">{{ scan.student.nama }}</p>
                  <p class="truncate text-xs text-slate-400">{{ scan.message }}</p>
                </div>
                <span class="shrink-0 font-mono text-xs font-medium text-slate-400">{{ formatTime(scan.time) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
/* Override default styling dari html5-qrcode */
#qr-reader {
  border: none !important;
}

#qr-reader__scan_region {
  background-color: #000;
}

#qr-reader__dashboard_section_csr span {
  color: white !important;
  font-family: inherit;
}

#qr-reader__dashboard_section_csr button {
  background-color: #047857 !important;
  color: white !important;
  border: none !important;
  padding: 8px 16px !important;
  border-radius: 8px !important;
  font-weight: 500 !important;
  cursor: pointer;
  margin-top: 10px;
}

#qr-reader a {
  color: #fbbf24 !important;
}
</style>
