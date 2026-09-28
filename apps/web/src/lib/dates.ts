// Util tanggal — semua dalam zona waktu lokal (WIB), format YYYY-MM-DD.

export function toISODate(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

// Semua tanggal dalam satu bulan (year, month 1-12) sebagai array YYYY-MM-DD.
export function daysInMonth(year: number, month: number): string[] {
  const total = new Date(year, month, 0).getDate()
  return Array.from({ length: total }, (_, i) => toISODate(new Date(year, month - 1, i + 1)))
}

export function dayNumber(iso: string): number {
  return Number(iso.slice(8, 10))
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function dayName(iso: string): string {
  return HARI[new Date(iso + 'T00:00:00').getDay()] ?? ''
}

// hariLiburMingguan: 0=Minggu..6=Sabtu. Default [0] (hanya Minggu).
export function isWeekend(iso: string, hariLiburMingguan: number[] = [0]): boolean {
  const d = new Date(iso + 'T00:00:00').getDay()
  return hariLiburMingguan.includes(d)
}

export function formatTanggalPanjang(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

export function namaBulan(month: number): string {
  return BULAN[month - 1] ?? ''
}

export function formatWaktu(ts: Date | string | number): string {
  return new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Alias: nama yang dipakai sebagian view.
export function formatTanggalWaktu(ts: Date | string | number): string {
  return formatWaktu(ts)
}
