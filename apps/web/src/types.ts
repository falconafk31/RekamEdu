// Tipe bersama RekamEdu — kontrak untuk semua view (tim view mengacu ke sini).

export type AppRole =
  | 'OWNER'
  | 'ADMIN'
  | 'KEPALA_SEKOLAH'
  | 'GURU'
  | 'PUSTAKAWAN'
  | 'TU'

export type StatusKehadiran = 'H' | 'I' | 'S' | 'A'

export interface Siswa {
  id: string
  nisn: string
  nama: string
  kelas: string
  jenisKelamin?: 'L' | 'P' | null
  tanggalLahir?: string | null
  namaOrtu?: string | null
}

export interface Guru {
  id: string
  nama: string
  nip?: string | null
  mapel?: string | null
  waliKelas?: string | null
}

export interface Buku {
  id: string
  judul: string
  penulis?: string | null
  penerbit?: string | null
  tahunTerbit?: number | null
  isbn?: string | null
  kategori?: string | null
  jumlah?: number
  tersedia?: number
  rak?: string | null
}

export type StatusPeminjaman = 'dipinjam' | 'dikembalikan' | 'terlambat'

export interface Peminjaman {
  id: string
  tanggalPinjam: string
  tanggalKembaliSeharusnya: string
  tanggalKembaliAktual?: string | null
  status: StatusPeminjaman
  siswa?: { nama: string; kelas?: string | null } | null
  buku?: { judul: string } | null
}

export interface Kunjungan {
  id: string
  tanggal: string
  waktu?: string | null
  keperluan?: string | null
  siswa?: { nama: string; kelas?: string | null } | null
}

export interface RingkasanKehadiran {
  H: number
  I: number
  S: number
  A: number
  persenH: number
  persenI: number
  persenS: number
  persenA: number
}

export interface RekapRow {
  nisn: string
  nama: string
  matrix: Record<string, StatusKehadiran>
  summary: RingkasanKehadiran
}

export interface Periode {
  id: string
  tahunAjaran: string
  semester: string
  tanggalMulai: string
  tanggalSelesai: string
  aktif?: boolean
}

// Pengaturan sekolah/tenant — dipakai sebagai argumen kop surat PDF.
export interface Pengaturan {
  namaSekolah?: string | null
  logoUrl?: string | null
  kopBaris1?: string | null
  kopBaris2?: string | null
  kopBaris3?: string | null
  kopBaris4?: string | null
  kopBaris5?: string | null
  kepalaSekolah?: string | null
  nipKepalaSekolah?: string | null
  namaPerpustakaan?: string | null
  kotaTtd?: string | null
  hariLiburMingguan?: number[]
}
