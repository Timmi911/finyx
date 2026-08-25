/**
 * 后端 API fetch 封装
 * - baseURL '/api'，配合 Vite proxy 转发到 http://localhost:3000
 * - 自动注入 Authorization: Bearer
 * - 401 自动 refresh（单飞 promise 防并发风暴）
 * - 失败抛 ApiError，业务层 try/catch
 */

const API_BASE = '/api'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** authStore 注入的访问器，避免循环依赖 */
export interface AuthAccessor {
  getToken(): string | null
  getRefreshToken(): string | null
  setTokens(accessToken: string, refreshToken: string): void
  clear(): void
}

let authAccessor: AuthAccessor = {
  getToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {},
  clear: () => {},
}

export function setAuthAccessor(a: AuthAccessor) {
  authAccessor = a
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined | null>
  /** 内部标记：跳过 401 自动 refresh，防止递归 */
  _isRetry?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return url
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return params.length ? `${url}?${params.join('&')}` : url
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) {
    if (!res.ok) throw new ApiError('http_error', `HTTP ${res.status}`, res.status)
    return undefined as unknown as T
  }
  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    throw new ApiError('http_error', `HTTP ${res.status} 响应非 JSON`, res.status)
  }
  if (!res.ok) {
    const err = json.error || { code: 'http_error', message: `HTTP ${res.status}` }
    throw new ApiError(err.code || 'http_error', err.message || '请求失败', res.status, err.details)
  }
  return json.data as T
}

// refresh 单飞 promise：并发 401 时只触发一次 refresh
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null

async function tryRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (refreshPromise) return refreshPromise
  const refreshToken = authAccessor.getRefreshToken()
  if (!refreshToken) return null
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return null
      const json = await res.json()
      const tokens = json.data as { accessToken: string; refreshToken: string }
      authAccessor.setTokens(tokens.accessToken, tokens.refreshToken)
      return tokens
    } catch {
      return null
    } finally {
      // 立即清空让后续若再次失败可重新触发
      refreshPromise = null
    }
  })()
  return refreshPromise
}

export async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query)
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = authAccessor.getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  // 401：尝试 refresh 后重放一次
  if (res.status === 401 && !opts._isRetry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request<T>(path, { ...opts, _isRetry: true })
    }
    // refresh 失败：清理认证态
    authAccessor.clear()
    throw new ApiError('unauthenticated', '登录已失效，请重新登录', 401)
  }

  return parseResponse<T>(res)
}

/** 业务层友好的快捷方法 */
export const http = {
  get: <T = any>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'GET', query }),
  post: <T = any>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T = any>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T = any>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T = any>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'DELETE', query }),
}
