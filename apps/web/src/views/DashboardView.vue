<template>
  <div
    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm"
  >
    <span class="text-xs font-semibold text-brandcyan uppercase tracking-wide">
      Ringkasan
    </span>
    <h1 class="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
      Selamat datang di RekamEdu
    </h1>
    <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
      Ini adalah fondasi tahap 0. Modul akan hadir di tahap berikutnya —
      halaman ini dan menu di samping akan diisi bertahap.
    </p>

    <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4"
      >
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
          Total Pengguna
        </p>
        <p class="mt-1 font-mono text-2xl font-semibold text-slate-900 dark:text-white">
          0
        </p>
      </div>
      <div
        class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4"
      >
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
          Status Langganan
        </p>
        <p class="mt-1 text-2xl font-semibold text-brandgreen">
          Trial
        </p>
      </div>
      <div
        class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4"
      >
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
          Kuota AI
        </p>
        <p class="mt-1 font-mono text-2xl font-semibold text-slate-900 dark:text-white">
          0<span class="text-base text-slate-400"> / 0</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Tahap 0: placeholder dashboard. Data dummy, diganti API di tahap berikutnya.
</script>
