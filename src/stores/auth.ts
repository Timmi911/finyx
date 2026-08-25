import { reactive, computed } from 'vue'
import { http, setAuthAccessor } from '../utils/api'
import type { PublicUser } from '../../server/src/types/domain.types'

/**
 * 独立 auth store
 * - token/refreshToken 存 localStorage.finyx-auth
 * - 通过 setAuthAccessor 把读写能力注入 utils/api.ts（避免循环依赖）
 * - bootstrap() 在 app 启动时从 localStorage 恢复登录态
 */
const AUTH_KEY = 'finyx-auth'

interface AuthState {
  user: PublicUser | null
  token: string | null
  refreshToken: string | null
}

interface PersistedAuth {
  user: PublicUser | null
  token: string
  refreshToken: string
}

class AuthStore {
  state = reactive<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
  })

  isAuthenticated = computed(() => !!this.state.token)

  constructor() {
    // 把访问器注入 api.ts（避免循环 import）
    setAuthAccessor({
      getToken: () => this.state.token,
      getRefreshToken: () => this.state.refreshToken,
      setTokens: (access, refresh) => {
        this.state.token = access
        this.state.refreshToken = refresh
        this.persist()
      },
      clear: () => this.clear(),
    })
  }

  /** 从 localStorage 恢复登录态，应在 app mount 前调用 */
  bootstrap() {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as PersistedAuth
      if (data.token && data.refreshToken) {
        this.state.token = data.token
        this.state.refreshToken = data.refreshToken
        this.state.user = data.user || null
      }
    } catch {
      localStorage.removeItem(AUTH_KEY)
    }
  }

  async login(email: string, password: string): Promise<PublicUser> {
    const result = await http.post<{ user: PublicUser; accessToken: string; refreshToken: string }>(
      '/auth/login',
      { email, password },
    )
    this.applyAuth(result.user, result.accessToken, result.refreshToken)
    return result.user
  }

  async register(name: string, email: string, password: string): Promise<PublicUser> {
    const result = await http.post<{ user: PublicUser; accessToken: string; refreshToken: string }>(
      '/auth/register',
      { name, email, password },
    )
    this.applyAuth(result.user, result.accessToken, result.refreshToken)
    return result.user
  }

  async fetchMe(): Promise<PublicUser | null> {
    if (!this.state.token) return null
    try {
      const user = await http.get<PublicUser>('/auth/me')
      this.state.user = user
      this.persist()
      return user
    } catch {
      // token 失效已被 api.ts clear；这里 swallow
      return null
    }
  }

  logout() {
    this.clear()
  }

  private applyAuth(user: PublicUser, access: string, refresh: string) {
    this.state.user = user
    this.state.token = access
    this.state.refreshToken = refresh
    this.persist()
  }

  private persist() {
    if (!this.state.token || !this.state.refreshToken) {
      localStorage.removeItem(AUTH_KEY)
      return
    }
    const data: PersistedAuth = {
      user: this.state.user,
      token: this.state.token,
      refreshToken: this.state.refreshToken,
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(data))
  }

  private clear() {
    this.state.user = null
    this.state.token = null
    this.state.refreshToken = null
    localStorage.removeItem(AUTH_KEY)
  }
}

export const authStore = new AuthStore()
