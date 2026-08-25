import { http } from '../utils/api'
import type { Reimbursement, ReimbStatus } from '../types'

export interface ReimbListResult {
  items: Reimbursement[]
  nextCursor: string | null
}

export interface ListReimbsParams {
  status?: ReimbStatus
  limit?: number
  cursor?: string
}

/**
 * 创建/更新报销单时提交给后端的字段
 * totalAmount / submitDate / createdAt 由服务端管理，前端不传
 */
export interface ReimbInput {
  title: string
  billIds: string[]
  status?: ReimbStatus
  approver?: string
  note?: string
}

export const reimbursementsApi = {
  list(params: ListReimbsParams = {}) {
    return http.get<ReimbListResult>('/reimbursements', {
      status: params.status,
      limit: params.limit,
      cursor: params.cursor,
    })
  },

  get(id: string) {
    return http.get<Reimbursement>(`/reimbursements/${id}`)
  },

  create(payload: ReimbInput) {
    return http.post<Reimbursement>('/reimbursements', payload)
  },

  update(id: string, patch: Partial<ReimbInput>) {
    return http.patch<Reimbursement>(`/reimbursements/${id}`, patch)
  },

  remove(id: string) {
    return http.delete<{ id: string }>(`/reimbursements/${id}`)
  },
}
