<template>
  <div class="mx-auto max-w-lg">
    <div class="state-box">
      <div class="state-icon !text-amber-500">
        <ShieldAlert class="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 class="text-[15px] font-semibold text-slate-900">Akses Ditolak</h1>
      <p class="mt-1 max-w-sm text-sm text-slate-500">
        Akun Anda tidak memiliki akses ke modul mana pun. Hubungi administrator
        sekolah bila Anda merasa ini keliru.
      </p>
      <div class="mt-5">
        <AppButton variant="secondary" @click="handleLogout">Keluar</AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ShieldAlert } from 'lucide-vue-next'
import AppButton from '../components/ui/AppButton.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

async function handleLogout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}
</script>
