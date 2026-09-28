import { defineStore } from 'pinia'
import { api, setApiToken } from '../lib/api'
import type { AppRole } from '../types'

export interface AuthUser {
  id: string
  username: string
  nama: string | null
  role: AppRole
  kelas: string | null
  tenantId: string | null
  kodeSekolah: string
}

interface LoginUserPayload {
  id: string
  username: string
  nama?: string | null
  role: AppRole
  kelas?: string | null
  tenantId?: string | null
}

interface LoginResponse {
  accessToken: string
  user: LoginUserPayload
}

interface MeResponse {
  user: LoginUserPayload
}

const AUTH_USER_KEY = 'rekamedu_auth_user'

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function writeCachedUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(AUTH_USER_KEY)
  } catch {
    // abaikan: storage penuh / mode privat
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
  }),
  getters: {
    isAuthenticated: (state): boolean => state.user !== null,
    isAdmin: (state): boolean =>
      state.user?.role === 'ADMIN' || state.user?.role === 'KEPALA_SEKOLAH',
    canPresensi: (state): boolean => {
      const role = state.user?.role
      return role === 'ADMIN' || role === 'KEPALA_SEKOLAH' || role === 'GURU'
    },
    canPerpus: (state): boolean => {
      const role = state.user?.role
      return role === 'ADMIN' || role === 'KEPALA_SEKOLAH' || role === 'PUSTAKAWAN'
    },
  },
  actions: {
    async login(kodeSekolah: string, username: string, password: string): Promise<void> {
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { kodeSekolah, username, password },
      })
      setApiToken(data.accessToken)
      this.user = {
        id: data.user.id,
        username: data.user.username,
        nama: data.user.nama ?? null,
        role: data.user.role,
        kelas: data.user.kelas ?? null,
        tenantId: data.user.tenantId ?? null,
        kodeSekolah,
      }
      writeCachedUser(this.user)
    },

    async logout(): Promise<void> {
      try {
        await api('/auth/logout', { method: 'POST' })
      } catch {
        // abaikan: token mungkin sudah kedaluwarsa
      }
      setApiToken(null)
      this.user = null
      writeCachedUser(null)
    },

    // Dipanggil sinkron saat boot: pulihkan user dari cache lokal.
    hydrate(): void {
      this.user = readCachedUser()
    },

    // Dipanggil async setelah boot: coba refresh token lalu sinkronkan profil.
    // Tidak pernah melempar — bila endpoint belum ada, fallback ke cache.
    async refresh(): Promise<void> {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        if (!res.ok) return
        const data = (await res.json().catch(() => null)) as { accessToken?: unknown } | null
        if (typeof data?.accessToken === 'string' && data.accessToken) {
          setApiToken(data.accessToken)
        }
        try {
          const me = await api<MeResponse>('/auth/me')
          const cached = readCachedUser()
          this.user = {
            id: me.user.id,
            username: me.user.username,
            nama: me.user.nama ?? null,
            role: me.user.role,
            kelas: me.user.kelas ?? null,
            tenantId: me.user.tenantId ?? null,
            kodeSekolah: cached?.kodeSekolah ?? '',
          }
          writeCachedUser(this.user)
        } catch {
          // /api/auth/me belum ada — tetap pakai cache
        }
      } catch {
        // offline / server mati — tetap pakai cache, jangan gagalkan boot
      }
    },
  },
})
