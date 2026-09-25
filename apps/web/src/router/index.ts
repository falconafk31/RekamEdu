import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import DashboardView from '../views/DashboardView.vue'

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
      {
        path: '',
        name: 'dashboard',
        component: DashboardView,
      },
    ],
  },
  // Catch-all: kembali ke dashboard (guard akan mengarahkan ke /login bila belum ada sesi)
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Tahap 0: sesi ditandai via localStorage 'rekamedu_session'.
// Auth penuh (cookie httpOnly + verifikasi server) diimplementasikan di tahap berikutnya.
router.beforeEach((to) => {
  const hasSession = typeof localStorage !== 'undefined' && !!localStorage.getItem('rekamedu_session')

  if (to.meta.requiresAuth && !hasSession) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && hasSession) {
    return { path: '/dashboard' }
  }

  return true
})

export default router
