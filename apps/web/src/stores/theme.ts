import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'rekamedu_theme'

function readStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw
  } catch {
    // abaikan: localStorage tidak tersedia
  }
  return 'light'
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: readStoredTheme() as ThemeMode,
  }),
  actions: {
    setTheme(mode: ThemeMode) {
      this.theme = mode
      try {
        localStorage.setItem(STORAGE_KEY, mode)
      } catch {
        // abaikan
      }
      this.applyTheme()
    },
    applyTheme() {
      const root = document.documentElement
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      const isDark = this.theme === 'dark' || (this.theme === 'auto' && prefersDark)
      root.classList.toggle('dark', isDark)
    },
  },
})
