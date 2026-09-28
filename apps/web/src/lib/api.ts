// Klien HTTP JWT RekamEdu — KONTRAK untuk semua view.
// path diawali '/' TANPA prefix '/api' (fungsi menambahkan '/api' sendiri),
// mis. api('/presensi/siswa', { query: { q } }).

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

let accessToken: string | null = null

// Dipanggil oleh auth store saat login / refresh / logout.
export function setApiToken(t: string | null): void {
  accessToken = t
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
}

function buildUrl(path: string, query?: ApiOptions['query']): string {
  const base = `/api${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return base
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.append(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

function messageFrom(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (typeof d.message === 'string' && d.message) return d.message
    if (typeof d.error === 'string' && d.error) return d.error
  }
  return fallback
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const data = (await res.json().catch(() => null)) as { accessToken?: unknown } | null
    const token = data?.accessToken
    if (typeof token === 'string' && token) {
      setApiToken(token)
      return true
    }
    return false
  } catch {
    return false
  }
}

async function request<T>(path: string, options: ApiOptions, retried: boolean): Promise<T> {
  const headers: Record<string, string> = {}
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  let body: string | undefined
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body,
  })

  // 401: coba refresh sekali, lalu ulangi request.
  if (res.status === 401 && !retried) {
    const refreshed = await tryRefreshToken()
    if (refreshed) return request<T>(path, options, true)
    throw new ApiError(401, 'Sesi Anda berakhir. Silakan masuk kembali.')
  }

  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null)
    throw new ApiError(
      res.status,
      messageFrom(data, `Permintaan gagal (kode ${res.status}).`),
      data ?? undefined,
    )
  }

  if (res.status === 204) return undefined as T
  const data = (await res.json().catch(() => null)) as T
  return data
}

export async function api<T>(path: string, options?: ApiOptions): Promise<T> {
  return request<T>(path, options ?? {}, false)
}
