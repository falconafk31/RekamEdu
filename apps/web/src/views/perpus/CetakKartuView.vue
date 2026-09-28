<script setup lang="ts">
import { ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import QRCodeVue from 'qrcode.vue'
import { Search, Printer, TriangleAlert, IdCard, School, X } from 'lucide-vue-next'

interface KartuAnggota {
  siswa: { nisn: string; nama: string; kelas: string }
  perpustakaan: { nama: string; logoUrl: string | null; kepalaSekolah: string | null }
}

const auth = useAuthStore()

const nisn = ref('')
const memuat = ref(false)
const galat = ref('')
const kartu = ref<KartuAnggota | null>(null)

function pesanGalat(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.'
}

const tanggalCetak = (() => {
  const d = new Date()
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
})()

async function cari(): Promise<void> {
  const kunci = nisn.value.trim()
  if (!kunci) {
    galat.value = 'Masukkan NISN siswa terlebih dahulu.'
    return
  }
  memuat.value = true
  galat.value = ''
  kartu.value = null
  try {
    kartu.value = await api<KartuAnggota>('/perpus/anggota/' + encodeURIComponent(kunci) + '/kartu')
  } catch (e) {
    galat.value = 'Gagal memuat kartu anggota: ' + pesanGalat(e)
  } finally {
    memuat.value = false
  }
}

function cetak(): void {
  window.print()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Tampilan layar (disembunyikan saat cetak) -->
    <div class="flex flex-col gap-4 print:hidden">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-slate-900">Kartu Anggota</h1>
          <p class="mt-0.5 text-sm text-slate-500">Cari siswa berdasarkan NISN, lalu cetak kartu perpustakaan</p>
        </div>
        <button
          v-if="kartu"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brandgreen px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          @click="cetak"
        >
          <Printer class="h-4 w-4" aria-hidden="true" />
          Cetak Kartu
        </button>
      </div>

      <div v-if="galat" class="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
        <p class="flex items-start gap-2">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {{ galat }}
        </p>
        <button type="button" class="shrink-0 font-medium underline" @click="galat = ''">Tutup</button>
      </div>

      <form class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end" @submit.prevent="cari">
        <div class="relative flex-1">
          <label for="cari-nisn" class="mb-1 block text-xs font-semibold text-slate-600">NISN siswa</label>
          <input
            id="cari-nisn"
            v-model="nisn"
            type="text"
            inputmode="numeric"
            placeholder="Contoh: 0071234567"
            autocomplete="off"
            class="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-brandgreen focus:outline-none focus:ring-2 focus:ring-brandgreen/30"
          />
          <Search class="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
          <button v-if="nisn" type="button" class="absolute bottom-2 right-2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Hapus NISN" @click="nisn = ''; kartu = null">
            <X class="h-4 w-4" />
          </button>
        </div>
        <button
          type="submit"
          :disabled="memuat || !auth.canPerpus"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brandgreen px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          <Search class="h-4 w-4" aria-hidden="true" />
          {{ memuat ? 'Mencari…' : 'Cari Kartu' }}
        </button>
      </form>

      <div v-if="memuat" class="flex justify-center p-10" aria-live="polite">
        <div class="h-8 w-8 animate-spin rounded-full border-[3px] border-brandgreen border-t-transparent" role="status" aria-label="Memuat kartu" />
      </div>

      <div v-else-if="!kartu" class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <IdCard class="h-10 w-10 text-slate-300" aria-hidden="true" />
        <p class="text-sm font-semibold text-slate-700">Belum ada kartu ditampilkan</p>
        <p class="text-sm text-slate-500">Masukkan NISN siswa lalu tekan Cari Kartu untuk melihat pratinjau.</p>
      </div>
    </div>

    <!-- Pratinjau kartu (ikut tercetak) -->
    <div v-if="kartu" class="print-container">
      <!-- KARTU DEPAN -->
      <div class="id-card id-card-front">
        <div class="id-card-header">
          <div class="id-card-logo">
            <img v-if="kartu.perpustakaan.logoUrl" :src="kartu.perpustakaan.logoUrl" alt="Logo sekolah" class="h-full w-full object-contain" />
            <School v-else class="h-full w-full text-white" aria-hidden="true" />
          </div>
          <div class="text-center">
            <h2 class="m-0 text-[8pt] font-bold leading-tight">KARTU PERPUSTAKAAN</h2>
            <h1 class="m-0 mt-[1px] text-[9pt] font-bold leading-tight">{{ kartu.perpustakaan.nama.toUpperCase() }}</h1>
          </div>
        </div>
        <div class="id-card-body">
          <div class="id-card-watermark">
            <img v-if="kartu.perpustakaan.logoUrl" :src="kartu.perpustakaan.logoUrl" alt="" class="h-full w-full object-contain" />
            <School v-else class="h-full w-full text-black" aria-hidden="true" />
          </div>
          <dl class="id-card-data">
            <div class="id-card-row">
              <dt>Nama</dt>
              <dd class="font-bold">{{ kartu.siswa.nama.toUpperCase() }}</dd>
            </div>
            <div class="id-card-row">
              <dt>Kelas</dt>
              <dd>{{ kartu.siswa.kelas }}</dd>
            </div>
            <div class="id-card-row">
              <dt>NISN</dt>
              <dd>
                <span class="font-bold">{{ kartu.siswa.nisn }}</span>
                <span class="id-card-note">(Nomor Induk Siswa Nasional)</span>
              </dd>
            </div>
          </dl>
          <div class="id-card-qr">
            <QRCodeVue :value="kartu.siswa.nisn" :size="72" level="M" render-as="svg" />
          </div>
        </div>
        <div class="id-card-footer">
          <span class="id-card-footnote">* Kartu perpus aktif selama menjadi siswa di {{ kartu.perpustakaan.nama }}.</span>
          <span class="id-card-footnote">Tanggal Cetak: {{ tanggalCetak }}</span>
        </div>
      </div>

      <!-- KARTU BELAKANG -->
      <div class="id-card id-card-back">
        <div class="id-card-watermark id-card-watermark-back">
          <img v-if="kartu.perpustakaan.logoUrl" :src="kartu.perpustakaan.logoUrl" alt="" class="h-full w-full object-contain" />
          <School v-else class="h-full w-full text-black" aria-hidden="true" />
        </div>
        <div class="id-card-header id-card-header-back">
          <h2 class="m-0 text-[8pt] font-bold tracking-wide">TATA TERTIB PERPUSTAKAAN</h2>
        </div>
        <div class="id-card-body-back">
          <ol class="m-0 list-decimal pl-[3mm] text-[5.5pt] leading-[1.6]">
            <li>Kartu anggota dibawa saat berkunjung, meminjam, dan mengembalikan koleksi perpustakaan.</li>
            <li class="mt-[1mm]">Kartu ini <span class="font-bold">TIDAK BOLEH</span> digunakan orang lain.</li>
            <li class="mt-[1mm]">Jumlah buku yang dipinjam maksimal 2 judul.</li>
            <li class="mt-[1mm]">Pinjaman berlaku untuk 7 hari.</li>
            <li class="mt-[1mm]">Kehilangan/kerusakan buku pinjaman menjadi tanggung jawab pemilik kartu.</li>
            <li class="mt-[1mm]">Apabila kartu hilang, pemilik kartu harus melakukan registrasi ulang.</li>
            <li class="mt-[1mm]">Taatilah peraturan perpustakaan untuk kepentingan bersama.</li>
          </ol>
          <div class="id-card-ttd">
            <p class="m-0">Mengetahui,</p>
            <p class="m-0">Kepala Perpustakaan</p>
            <p class="m-0 mt-[8mm] font-bold underline">{{ kartu.perpustakaan.kepalaSekolah || '( ............................................ )' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Pratinjau di layar */
.print-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

/* Ukuran standar CR80: 86mm x 54mm */
.id-card {
  position: relative;
  width: 86mm;
  height: 54mm;
  background-color: #ffffff;
  border: 0.3mm solid #c8c8c8;
  border-radius: 2mm;
  overflow: hidden;
  box-sizing: border-box;
  font-family: 'Helvetica', 'Arial', sans-serif;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  color: #1e1e1e;
}
.id-card * {
  box-sizing: border-box;
}

.id-card-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 12mm;
  background-color: #047857;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2mm 2mm 0 0;
}
.id-card-header-back {
  height: 10mm;
}
.id-card-logo {
  position: absolute;
  left: 3mm;
  top: 2mm;
  width: 8mm;
  height: 8mm;
}

.id-card-body {
  position: absolute;
  top: 12mm;
  left: 0;
  width: 100%;
  height: 38mm;
  overflow: hidden;
}
.id-card-watermark {
  position: absolute;
  left: 30.5mm;
  top: 6mm;
  width: 25mm;
  height: 25mm;
  opacity: 0.05;
  pointer-events: none;
}
.id-card-watermark-back {
  top: 14mm;
}

.id-card-data {
  position: absolute;
  left: 4mm;
  top: 5mm;
  width: 58mm;
  margin: 0;
}
.id-card-row {
  display: flex;
  margin-bottom: 3.5mm;
  font-size: 6pt;
}
.id-card-row dt {
  width: 20mm;
  flex-shrink: 0;
  font-weight: 700;
}
.id-card-row dd {
  margin: 0;
  display: flex;
  flex-direction: column;
}
.id-card-row dd::before {
  content: ':';
  position: absolute;
  margin-left: -2.5mm;
  font-weight: 700;
}
.id-card-note {
  font-size: 4.5pt;
  font-style: italic;
  color: #787878;
  margin-top: 0.8mm;
}

.id-card-qr {
  position: absolute;
  right: 4mm;
  top: 9mm;
  width: 19mm;
  height: 19mm;
}

.id-card-footer {
  position: absolute;
  bottom: 1.5mm;
  left: 0;
  width: 100%;
  padding: 0 3mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 2mm;
}
.id-card-footnote {
  font-size: 5pt;
  font-style: italic;
  color: #787878;
}

.id-card-body-back {
  position: absolute;
  top: 11mm;
  left: 0;
  width: 100%;
  height: 43mm;
  padding: 2mm 5.5mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.id-card-ttd {
  text-align: right;
  font-size: 5.5pt;
}

/* Cetak: hanya kartu yang terlihat */
@media print {
  @page {
    margin: 1cm;
    size: A4 portrait;
  }
  body * {
    visibility: hidden;
  }
  .print-container,
  .print-container * {
    visibility: visible;
  }
  .print-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5cm;
    justify-items: center;
  }
  .id-card {
    box-shadow: none;
    break-inside: avoid;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>
