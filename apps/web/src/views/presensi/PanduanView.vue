<script setup lang="ts">
import { BookOpenCheck, ScanLine, Keyboard, CalendarDays, BarChart3, FileSpreadsheet, Settings2, Users, History, ClipboardList } from 'lucide-vue-next'

const SECTIONS = [
  {
    icon: 'dashboard',
    title: 'Dashboard',
    desc: 'Ringkasan kehadiran hari ini: status presensi kelas, komposisi Hadir/Izin/Sakit/Alfa, tren bulan berjalan, dan kalender mini. Admin dapat beralih antar kelas; guru hanya melihat kelasnya sendiri.',
  },
  {
    icon: 'input',
    title: 'Input Presensi',
    desc: 'Isi presensi harian per kelas. Tersedia tombol aksi massal (semua Hadir, reset), pencarian siswa, dan simpan otomatis per baris atau simpan sekaligus. Perubahan yang belum disimpan akan memicu peringatan saat pindah halaman.',
  },
  {
    icon: 'scan',
    title: 'Scan QR',
    desc: 'Presensi cepat dengan memindai QR NISN siswa memakai kamera perangkat. Satu pemindaian = satu kehadiran; hasil dan riwayat pemindaian ditampilkan langsung di layar.',
  },
  {
    icon: 'rekap',
    title: 'Rekap Bulanan & Semester',
    desc: 'Rekapitulasi kehadiran per siswa untuk satu bulan atau satu semester, lengkap dengan total per status dan persentase kehadiran. Rekap dapat diekspor ke Excel dan dicetak sebagai PDF.',
  },
  {
    icon: 'kalender',
    title: 'Kalender Akademik',
    desc: 'Menandai tanggal libur dan masuk. Admin mengetuk tanggal untuk mengubah status; guru hanya dapat melihat. Hari libur menentukan apakah presensi perlu diisi pada tanggal tersebut.',
  },
  {
    icon: 'statistik',
    title: 'Statistik',
    desc: 'Analisis kehadiran per rentang tanggal: tren harian, komposisi status, dan perbandingan antar kelas dengan ambang batas persen kehadiran yang dapat diatur.',
  },
  {
    icon: 'siswa',
    title: 'Data Siswa & Guru',
    desc: 'Kelola data siswa (tambah, ubah, hapus) dan — khusus admin — akun guru beserta penetapan wali kelas dan reset password.',
  },
  {
    icon: 'lainnya',
    title: 'Riwayat Kelas, Aktivitas & Pengaturan',
    desc: 'Riwayat Kelas mengarsipkan susunan kelas per tahun ajaran. Aktivitas mencatat log perubahan penting. Pengaturan mengelola identitas sekolah, daftar kelas, hari libur mingguan, dan periode semester.',
  },
]

const STATUS = [
  { kode: 'H', nama: 'Hadir', warna: 'bg-emerald-100 text-emerald-700 ring-emerald-200', desc: 'Siswa hadir di sekolah.' },
  { kode: 'I', nama: 'Izin', warna: 'bg-sky-100 text-sky-700 ring-sky-200', desc: 'Siswa tidak hadir karena izin yang sah.' },
  { kode: 'S', nama: 'Sakit', warna: 'bg-amber-100 text-amber-700 ring-amber-200', desc: 'Siswa tidak hadir karena sakit.' },
  { kode: 'A', nama: 'Alfa', warna: 'bg-rose-100 text-rose-700 ring-rose-200', desc: 'Siswa tidak hadir tanpa keterangan.' },
]

const ROLES = [
  { nama: 'Admin / Kepala Sekolah', akses: 'Semua menu termasuk Guru, Pengaturan, dan Kalender (ubah status). Dapat melihat semua kelas.' },
  { nama: 'Guru', akses: 'Presensi kelas yang diampu, melihat kalender, rekap, dan statistik kelasnya. Tidak dapat mengubah pengaturan.' },
]

function iconFor(key: string) {
  switch (key) {
    case 'dashboard': return BarChart3
    case 'input': return Keyboard
    case 'scan': return ScanLine
    case 'rekap': return FileSpreadsheet
    case 'kalender': return CalendarDays
    case 'statistik': return BarChart3
    case 'siswa': return Users
    case 'lainnya': return History
    default: return BookOpenCheck
  }
}
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-3">
    <div>
      <h1 class="flex items-center gap-2 text-xl font-bold text-slate-900">
        <BookOpenCheck class="h-5 w-5 text-emerald-700" aria-hidden="true" />
        Panduan Penggunaan
      </h1>
      <p class="mt-0.5 text-sm text-slate-500">Modul Presensi — RekamEdu. Cara memakai setiap fitur aplikasi.</p>
    </div>

    <!-- Alur kerja -->
    <section class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="h-alur">
      <h2 id="h-alur" class="text-[15px] font-bold text-slate-900">Alur Kerja Harian</h2>
      <ol class="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-slate-600">
        <li>Cek <strong class="text-slate-800">Dashboard</strong> — pastikan hari ini bukan hari libur dan presensi belum diisi.</li>
        <li>Buka <strong class="text-slate-800">Input Presensi</strong> (atau <strong class="text-slate-800">Scan QR</strong>) lalu isi status setiap siswa.</li>
        <li>Simpan. Status <strong class="text-emerald-700">tersimpan</strong> berarti data sudah tercatat.</li>
        <li>Lihat <strong class="text-slate-800">Rekap</strong> atau <strong class="text-slate-800">Statistik</strong> untuk memantau kehadiran.</li>
      </ol>
    </section>

    <!-- Status presensi -->
    <section class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="h-status">
      <h2 id="h-status" class="text-[15px] font-bold text-slate-900">Status Kehadiran</h2>
      <p class="mb-2 text-xs text-slate-500">Empat status yang dipakai di seluruh aplikasi:</p>
      <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <li v-for="s in STATUS" :key="s.nama" class="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ring-1" :class="s.warna" aria-hidden="true">{{ s.kode }}</span>
          <span>
            <span class="block text-sm font-semibold text-slate-800">{{ s.nama }}</span>
            <span class="block text-[13px] text-slate-500">{{ s.desc }}</span>
          </span>
        </li>
      </ul>
    </section>

    <!-- Fitur per menu -->
    <section class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="h-fitur">
      <h2 id="h-fitur" class="text-[15px] font-bold text-slate-900">Fitur per Menu</h2>
      <ul class="mt-2 flex flex-col gap-3">
        <li v-for="f in SECTIONS" :key="f.title" class="flex items-start gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <component :is="iconFor(f.icon)" class="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <span>
            <span class="block text-sm font-semibold text-slate-800">{{ f.title }}</span>
            <span class="block text-[13px] text-slate-500">{{ f.desc }}</span>
          </span>
        </li>
      </ul>
    </section>

    <!-- Peran -->
    <section class="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="h-peran">
      <h2 id="h-peran" class="flex items-center gap-2 text-[15px] font-bold text-slate-900">
        <ClipboardList class="h-4 w-4 text-emerald-700" aria-hidden="true" />
        Peran Pengguna
      </h2>
      <ul class="mt-2 flex flex-col gap-2">
        <li v-for="r in ROLES" :key="r.nama" class="rounded-lg bg-slate-50 p-3">
          <p class="text-sm font-semibold text-slate-800">{{ r.nama }}</p>
          <p class="text-[13px] text-slate-500">{{ r.akses }}</p>
        </li>
      </ul>
    </section>

    <!-- Tips -->
    <section class="rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-labelledby="h-tips">
      <h2 id="h-tips" class="flex items-center gap-2 text-[15px] font-bold text-emerald-900">
        <Settings2 class="h-4 w-4" aria-hidden="true" />
        Tips
      </h2>
      <ul class="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-emerald-900/80">
        <li>Gunakan tombol <em>Semua Hadir</em> di Input Presensi, lalu ubah hanya siswa yang tidak hadir — lebih cepat.</li>
        <li>Pastikan tanggal di <strong>Kalender</strong> sudah benar sebelum mengisi presensi; presensi hari libur tidak dihitung.</li>
        <li>Ekspor rekap ke Excel sebelum akhir bulan sebagai arsip.</li>
        <li>Jika kamera tidak bisa dipakai untuk Scan QR, gunakan Input Presensi manual.</li>
      </ul>
    </section>
  </div>
</template>
