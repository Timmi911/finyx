import { http } from '../utils/api'
import type { FamilyMember, FamilyRole } from '../types'

export interface FamilyListResult {
  items: FamilyMember[]
}

export interface ListFamilyParams {
  role?: FamilyRole
  limit?: number
}

/** 创建/更新家庭成员时提交给后端的字段（id/createdAt 由服务端管理） */
export interface FamilyInput {
  name: string
  role?: FamilyRole
  avatar?: string
  color?: string
  linkedAccountIds?: string[]
}

export const familyApi = {
  list(params: ListFamilyParams = {}) {
    return http.get<FamilyListResult>('/family', {
      role: params.role,
      limit: params.limit,
    })
  },

  get(id: string) {
    return http.get<FamilyMember>(`/family/${id}`)
  },

  create(payload: FamilyInput) {
    return http.post<FamilyMember>('/family', payload)
  },

  update(id: string, patch: Partial<FamilyInput>) {
    return http.patch<FamilyMember>(`/family/${id}`, patch)
  },

  remove(id: string) {
    return http.delete<{ id: string }>(`/family/${id}`)
  },
}
