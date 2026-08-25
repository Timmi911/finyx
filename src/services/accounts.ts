import { http } from '../utils/api'
import type { Account, AccountKind, AccountTier } from '../types'

export interface AccountListResult {
  items: Account[]
}

export interface ListAccountsParams {
  tier?: AccountTier
  kind?: AccountKind
  limit?: number
}

/** 创建/更新账户时提交给后端的字段（id/createdAt 由服务端管理） */
export interface AccountInput {
  name: string
  tier: AccountTier
  kind: AccountKind
  category?: string
  parentId?: string | null
  icon?: string
  color?: string
  budget?: number
  initialBalance?: number
}

export const accountsApi = {
  list(params: ListAccountsParams = {}) {
    return http.get<AccountListResult>('/accounts', {
      tier: params.tier,
      kind: params.kind,
      limit: params.limit,
    })
  },

  get(id: string) {
    return http.get<Account>(`/accounts/${id}`)
  },

  create(payload: AccountInput) {
    return http.post<Account>('/accounts', payload)
  },

  update(id: string, patch: Partial<AccountInput>) {
    return http.patch<Account>(`/accounts/${id}`, patch)
  },

  remove(id: string) {
    return http.delete<{ id: string }>(`/accounts/${id}`)
  },
}
