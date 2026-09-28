import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { useAuthStore } from './stores/auth'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Terapkan tema tersimpan
const theme = useThemeStore(pinia)
theme.applyTheme()
if (typeof window !== 'undefined' && window.matchMedia) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => theme.applyTheme())
}

// Pulihkan user dari cache secara sinkron, lalu coba refresh token di background
// (tidak memblokir boot; bila gagal, cache tetap dipakai).
const auth = useAuthStore(pinia)
auth.hydrate()
void auth.refresh()

app.mount('#app')
