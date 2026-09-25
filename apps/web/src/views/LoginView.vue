<template>
  <div
    class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-10"
  >
    <div class="w-full max-w-sm">
      <!-- Logo / brand -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold tracking-tight text-brandcyan">
          RekamEdu
        </h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Setiap Aktivitas, Tercatat untuk Masa Depan
        </p>
      </div>

      <!-- Kartu login -->
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 sm:p-8"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-1">
          Masuk ke Akun Sekolah
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Gunakan kode sekolah dan akun yang diberikan administrator.
        </p>

        <form @submit.prevent="handleSubmit" novalidate>
          <div class="space-y-4">
            <div>
              <label
                for="kodeSekolah"
                class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Kode Sekolah
              </label>
              <input
                id="kodeSekolah"
                v-model.trim="form.kodeSekolah"
                type="text"
                required
                autocomplete="organization"
                placeholder="cth: SMKN1JKT"
                class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandgreen focus:border-brandgreen"
              />
            </div>

            <div>
              <label
                for="username"
                class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                v-model.trim="form.username"
                type="text"
                required
                autocomplete="username"
                placeholder="cth: budi.santoso"
                class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandgreen focus:border-brandgreen"
              />
            </div>

            <div>
              <label
                for="password"
                class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Kata Sandi
              </label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandgreen focus:border-brandgreen"
              />
            </div>
          </div>

          <p
            v-if="errorMessage"
            role="alert"
            class="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2.5 text-sm text-red-700 dark:text-red-300"
          >
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            :disabled="loading"
            class="mt-6 w-full rounded-lg bg-brandgreen hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brandgreen"
          >
            {{ loading ? 'Memeriksa…' : 'Masuk' }}
          </button>
        </form>
      </div>

      <p class="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Butuh bantuan? Hubungi administrator sekolah Anda.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSessionStore } from '../stores/session'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

const form = reactive({
  kodeSekolah: '',
  username: '',
  password: '',
})

const loading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kodeSekolah: form.kodeSekolah,
        username: form.username,
        password: form.password,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      errorMessage.value =
        (data && (data.message || data.error)) ||
        'Login gagal. Periksa kode sekolah, username, dan kata sandi Anda.'
      return
    }

    const data = await res.json().catch(() => ({}))
    session.login({
      username: form.username,
      kodeSekolah: form.kodeSekolah,
      nama: data?.user?.nama,
    })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.push(redirect)
  } catch {
    errorMessage.value =
      'Tidak dapat menghubungi server. Periksa koneksi internet Anda lalu coba lagi.'
  } finally {
    loading.value = false
  }
}
</script>
