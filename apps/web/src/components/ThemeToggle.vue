<template>
  <div
    class="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden"
    role="group"
    aria-label="Pilih tema"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :aria-pressed="theme.theme === opt.value"
      @click="theme.setTheme(opt.value)"
      :class="[
        'px-3 py-1.5 text-xs font-semibold transition-colors',
        theme.theme === opt.value
          ? 'bg-brandgreen text-white'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
      ]"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore, type ThemeMode } from '../stores/theme'

const theme = useThemeStore()

const options: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
  { value: 'auto', label: 'Otomatis' },
]
</script>
