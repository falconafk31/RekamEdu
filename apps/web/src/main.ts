import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { useSessionStore } from './stores/session'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Terapkan tema tersimpan + pulihkan penanda sesi tahap 0
const theme = useThemeStore(pinia)
theme.applyTheme()
if (typeof window !== 'undefined' && window.matchMedia) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => theme.applyTheme())
}
const session = useSessionStore(pinia)
session.hydrate()

app.mount('#app')
