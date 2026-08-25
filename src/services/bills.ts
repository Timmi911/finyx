import { http } from '../utils/api'
import type { Bill } from '../types'

export interface BillListResult {
  items: Bill[]
  nextCursor: string | null
}

export interface ListBillsParams {
  month?: string
  kind?: Bill['kind']
  usage?: Bill['usage']
  status?: Bill['status']
  limit?: number
  cursor?: string
}

/** 创建/更新票据时提交给后端的字段（与 server createBillSchema 对齐） */
export type BillInput = Omit<Bill, 'id' | 'createdAt' | 'userId'> & {
  // reimbursementId 由后端通过报销模块联动管理，前端不应直接传
  reimbursementId?: string | null
}

export const billsApi = {
  list(params: ListBillsParams = {}) {
    return http.get<BillListResult>('/bills', {
      month: params.month,
      kind: params.kind,
      usage: params.usage,
      status: params.status,
      limit: params.limit,
      cursor: params.cursor,
    })
  },

  get(id: string) {
    return http.get<Bill>(`/bills/${id}`)
  },

  create(payload: BillInput) {
    return http.post<Bill>('/bills', payload)
  },

  update(id: string, patch: Partial<BillInput>) {
    return http.patch<Bill>(`/bills/${id}`, patch)
  },

  remove(id: string) {
    return http.delete<{ id: string }>(`/bills/${id}`)
  },

  batchImport(items: BillInput[]) {
    return http.post<{ created: number; ids: string[] }>('/bills/batch', { items })
  },
}
