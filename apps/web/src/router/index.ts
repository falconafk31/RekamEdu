import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import AksesDitolakView from '../views/AksesDitolakView.vue'
import { useAuthStore } from '../stores/auth'
import type { AppRole } from '../types'

// AppRole didefinisikan di src/types.ts (kontrak tim view); di-export ulang di sini
// agar guard & view bisa mengimpornya dari router.
export type { AppRole } from '../types'

// Daftar role per modul. OWNER (pemilik platform) dianggap superuser → akses penuh.
const ROLE_PRESENSI: AppRole[] = ['OWNER', 'ADMIN', 'KEPALA_SEKOLAH', 'GURU']
const ROLE_PERPUS: AppRole[] = ['OWNER', 'ADMIN', 'KEPALA_SEKOLAH', 'PUSTAKAWAN']
const ROLE_ADMIN: AppRole[] = ['OWNER', 'ADMIN', 'KEPALA_SEKOLAH']

/** true bila role pengguna termasuk dalam daftar role yang diizinkan. */
export function roleCheck(role: AppRole | null | undefined, allowed: readonly AppRole[]): boolean {
  return role !== null && role !== undefined && allowed.includes(role)
}

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    roles?: AppRole[]
  }
}

// NOTE: file-file view di bawah adalah KONTRAK — dibuat oleh tim view.
// Stub minimal disediakan agar build/typecheck lolos; tim view menimpa isinya.

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      // Redirect cerdas by role.
      {
        path: '',
        name: 'dashboard',
        redirect: () => {
          const auth = useAuthStore()
          if (auth.canPerpus && !auth.canPresensi) return '/perpus/dashboard'
          if (auth.canPresensi || auth.user?.role === 'OWNER') return '/presensi/dashboard'
          return '/dashboard/akses-ditolak'
        },
      },
      // ---- Modul Presensi ----
      { path: '/presensi/dashboard', name: 'presensi-dashboard', component: () => import('../views/presensi/DashboardView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      { path: '/presensi/input', name: 'presensi-input', component: () => import('../views/presensi/InputPresensiView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      { path: '/presensi/scan', name: 'presensi-scan', component: () => import('../views/presensi/ScanQRView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      { path: '/presensi/rekap', name: 'presensi-rekap', component: () => import('../views/presensi/RekapView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      { path: '/presensi/rekap-semester', name: 'presensi-rekap-semester', component: () => import('../views/presensi/RekapSemesterView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      { path: '/presensi/siswa', name: 'presensi-siswa', component: () => import('../views/presensi/SiswaView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      { path: '/presensi/guru', name: 'presensi-guru', component: () => import('../views/presensi/GuruView.vue'), meta: { requiresAuth: true, roles: ROLE_ADMIN } },
      { path: '/presensi/kalender', name: 'presensi-kalender', component: () => import('../views/presensi/KalenderView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      { path: '/presensi/statistik', name: 'presensi-statistik', component: () => import('../views/presensi/StatistikView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      { path: '/presensi/riwayat-kelas', name: 'presensi-riwayat-kelas', component: () => import('../views/presensi/RiwayatKelasView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      { path: '/presensi/aktivitas', name: 'presensi-aktivitas', component: () => import('../views/presensi/AktivitasView.vue'), meta: { requiresAuth: true, roles: ROLE_ADMIN } },
      { path: '/presensi/pengaturan', name: 'presensi-pengaturan', component: () => import('../views/presensi/PengaturanView.vue'), meta: { requiresAuth: true, roles: ROLE_ADMIN } },
      { path: '/presensi/panduan', name: 'presensi-panduan', component: () => import('../views/presensi/PanduanView.vue'), meta: { requiresAuth: true, roles: ROLE_PRESENSI } },
      // ---- Modul Perpustakaan ----
      { path: '/perpus/dashboard', name: 'perpus-dashboard', component: () => import('../views/perpus/DashboardPerpusView.vue'), meta: { requiresAuth: true, roles: ROLE_PERPUS } },
      { path: '/perpus/buku', name: 'perpus-buku', component: () => import('../views/perpus/BukuView.vue'), meta: { requiresAuth: true, roles: ROLE_PERPUS } },
      { path: '/perpus/peminjaman', name: 'perpus-peminjaman', component: () => import('../views/perpus/PeminjamanView.vue'), meta: { requiresAuth: true, roles: ROLE_PERPUS } },
      { path: '/perpus/kunjungan', name: 'perpus-kunjungan', component: () => import('../views/perpus/KunjunganPerpusView.vue'), meta: { requiresAuth: true, roles: ROLE_PERPUS } },
      { path: '/perpus/rekap', name: 'perpus-rekap', component: () => import('../views/perpus/RekapPerpusView.vue'), meta: { requiresAuth: true, roles: ROLE_PERPUS } },
      { path: '/perpus/kartu', name: 'perpus-kartu', component: () => import('../views/perpus/CetakKartuView.vue'), meta: { requiresAuth: true, roles: ROLE_PERPUS } },
      // ---- Fallback role tanpa akses modul ----
      {
        path: '/dashboard/akses-ditolak',
        name: 'akses-ditolak',
        component: AksesDitolakView,
        meta: { requiresAuth: true },
      },
    ],
  },
  // Catch-all: kembali ke dashboard (guard mengarahkan ke /login bila belum login)
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { path: '/dashboard' }
  }

  const roles = to.meta.roles
  if (roles && roles.length > 0 && !roleCheck(auth.user?.role, roles)) {
    return { path: '/dashboard' }
  }

  return true
})

export default router
