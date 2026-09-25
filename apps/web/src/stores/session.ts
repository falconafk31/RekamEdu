import { defineStore } from 'pinia'

export interface SessionUser {
  username: string
  kodeSekolah: string
  nama?: string
}

const SESSION_KEY = 'rekamedu_session'

export const useSessionStore = defineStore('session', {
  state: () => ({
    loggedIn: false as boolean,
    user: null as SessionUser | null,
  }),
  actions: {
    /**
     * Simpan sesi setelah login berhasil (Tahap 0).
     * Nantinya digantikan sesi cookie httpOnly dari server.
     */
    login(user: SessionUser) {
      this.loggedIn = true
      this.user = user
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user))
      } catch {
        // abaikan
      }
    },
    hydrate() {
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (raw) {
          this.user = JSON.parse(raw) as SessionUser
          this.loggedIn = true
        }
      } catch {
        // abaikan
      }
    },
    logout() {
      this.loggedIn = false
      this.user = null
      try {
        localStorage.removeItem(SESSION_KEY)
      } catch {
        // abaikan
      }
    },
  },
})
