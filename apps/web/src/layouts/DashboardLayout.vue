<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 flex">
    <!-- Overlay saat sidebar mobile terbuka -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
      @click="sidebarOpen = false"
      aria-hidden="true"
    />

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-700 dark:bg-slate-800 lg:static lg:z-auto"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      aria-label="Navigasi utama"
    >
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-5">
        <div>
          <p class="text-xl font-extrabold tracking-tight text-brandcyan">
            RekamEdu
          </p>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Setiap Aktivitas, Tercatat untuk Masa Depan
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden"
          aria-label="Tutup menu"
          @click="sidebarOpen = false"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <section v-for="group in menuGroups" :key="group.title" aria-label="group.title">
          <p class="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {{ group.title }}
          </p>
          <div class="space-y-1">
            <router-link
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              :class="[
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive(item.to)
                  ? 'bg-brandgreen text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
              ]"
              @click="sidebarOpen = false"
            >
              <component :is="item.icon" class="h-5 w-5 shrink-0" aria-hidden="true" />
              {{ item.label }}
            </router-link>
          </div>
        </section>
      </nav>

      <div class="px-3 py-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          @click="handleLogout"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <LogOut class="h-5 w-5" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </aside>

    <!-- Kolom utama -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Topbar -->
      <header
        class="h-16 shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between px-4 sm:px-6"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden"
            aria-label="Buka menu"
            @click="sidebarOpen = true"
          >
            <Menu class="h-5 w-5" />
          </button>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Halo, <span class="font-semibold text-slate-800 dark:text-slate-200">{{ displayName }}</span>
            <span class="ml-2 hidden sm:inline-block rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {{ roleLabel }}
            </span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      <!-- Konten -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  BookCopy,
  BookOpen,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Footprints,
  History,
  IdCard,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  QrCode,
  Settings,
  UserCog,
  Users,
  X,
} from 'lucide-vue-next'
import ThemeToggle from '../components/ThemeToggle.vue'
import { useAuthStore } from '../stores/auth'
import type { AppRole } from '../types'

interface MenuItem {
  to: string
  label: string
  icon: Component
  admin?: boolean
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

const PRESENSI_ITEMS: MenuItem[] = [
  { to: '/presensi/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/presensi/input', label: 'Input Presensi', icon: ClipboardList },
  { to: '/presensi/scan', label: 'Scan QR', icon: QrCode },
  { to: '/presensi/rekap', label: 'Rekap', icon: ClipboardCheck },
  { to: '/presensi/rekap-semester', label: 'Rekap Semester', icon: CalendarDays },
  { to: '/presensi/siswa', label: 'Data Siswa', icon: Users },
  { to: '/presensi/guru', label: 'Data Guru', icon: UserCog, admin: true },
  { to: '/presensi/kalender', label: 'Kalender', icon: Calendar },
  { to: '/presensi/statistik', label: 'Statistik', icon: BarChart3 },
  { to: '/presensi/riwayat-kelas', label: 'Riwayat Kelas', icon: History },
  { to: '/presensi/aktivitas', label: 'Aktivitas', icon: Activity, admin: true },
  { to: '/presensi/pengaturan', label: 'Pengaturan', icon: Settings, admin: true },
  { to: '/presensi/panduan', label: 'Panduan', icon: BookOpen },
]

const PERPUS_ITEMS: MenuItem[] = [
  { to: '/perpus/dashboard', label: 'Dashboard', icon: Library },
  { to: '/perpus/buku', label: 'Data Buku', icon: BookCopy },
  { to: '/perpus/peminjaman', label: 'Peminjaman', icon: ArrowLeftRight },
  { to: '/perpus/kunjungan', label: 'Kunjungan', icon: Footprints },
  { to: '/perpus/rekap', label: 'Rekap', icon: FileText },
  { to: '/perpus/kartu', label: 'Cetak Kartu', icon: IdCard },
]

const ROLE_LABELS: Record<AppRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  GURU: 'Guru',
  PUSTAKAWAN: 'Pustakawan',
  TU: 'Tata Usaha',
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sidebarOpen = ref(false)

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(to + '/')
}

const menuGroups = computed<MenuGroup[]>(() => {
  const groups: MenuGroup[] = []
  if (auth.canPresensi) {
    groups.push({
      title: 'Presensi',
      items: PRESENSI_ITEMS.filter((item) => !item.admin || auth.isAdmin),
    })
  }
  if (auth.canPerpus) {
    groups.push({
      title: 'Perpustakaan',
      items: PERPUS_ITEMS.filter((item) => !item.admin || auth.isAdmin),
    })
  }
  return groups
})

const displayName = computed(
  () => auth.user?.nama || auth.user?.username || 'Pengguna',
)

const roleLabel = computed(() =>
  auth.user ? ROLE_LABELS[auth.user.role] : '',
)

async function handleLogout(): Promise<void> {
  sidebarOpen.value = false
  await auth.logout()
  await router.push('/login')
}
</script>
