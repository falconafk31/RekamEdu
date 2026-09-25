<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 flex">
    <!-- Sidebar -->
    <aside
      class="w-60 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col"
    >
      <div class="px-5 py-5 border-b border-slate-200 dark:border-slate-700">
        <p class="text-xl font-extrabold tracking-tight text-brandcyan">
          RekamEdu
        </p>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Setiap Aktivitas, Tercatat untuk Masa Depan
        </p>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-1" aria-label="Menu utama">
        <router-link
          v-for="item in menu"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
            isActive(item.to)
              ? 'bg-brandgreen text-white'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
          ]"
        >
          <span
            class="inline-flex h-5 w-5 items-center justify-center"
            aria-hidden="true"
            v-html="item.icon"
          ></span>
          {{ item.label }}
        </router-link>
      </nav>

      <div class="px-3 py-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          @click="handleLogout"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
          </svg>
          Keluar
        </button>
      </div>
    </aside>

    <!-- Kolom utama -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Topbar -->
      <header
        class="h-16 shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between px-6"
      >
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Halo, <span class="font-semibold text-slate-800 dark:text-slate-200">{{ displayName }}</span>
        </p>
        <div class="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      <!-- Konten -->
      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import { useSessionStore } from '../stores/session'

// Tahap 0: hanya menu placeholder. Menu modul 1–5 TIDAK dibuat di tahap ini.
const menu = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  },
  {
    to: '/pengaturan',
    label: 'Pengaturan',
    icon: '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  },
]

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

function isActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/')
}

const displayName = computed(() => session.user?.nama || session.user?.username || 'Pengguna')

function handleLogout() {
  session.logout()
  void router.push('/login')
}
</script>
