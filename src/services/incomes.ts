import { http } from '../utils/api'
import type { IncomeRecord, CustomIncomeSource, IncomeSourceOverride, IncomeSource } from '../types'

// ==================== Income Records ====================

export interface IncomeRecordListResult {
  items: IncomeRecord[]
  total: number
}

export interface ListIncomeRecordsParams {
  month?: string
  source?: IncomeSource
  limit?: number
}

/** 创建/更新收入记录时提交的字段（id/createdAt 由服务端管理） */
export interface IncomeRecordInput {
  month: string
  date: string
  source: IncomeSource
  amount: number
  note?: string
}

export const incomeRecordsApi = {
  list(params: ListIncomeRecordsParams = {}) {
    return http.get<IncomeRecordListResult>('/incomes/records', {
      month: params.month,
      source: params.source,
      limit: params.limit,
    })
  },

  get(id: string) {
    return http.get<IncomeRecord>(`/incomes/records/${id}`)
  },

  create(payload: IncomeRecordInput) {
    return http.post<IncomeRecord>('/incomes/records', payload)
  },

  update(id: string, patch: Partial<IncomeRecordInput>) {
    return http.patch<IncomeRecord>(`/incomes/records/${id}`, patch)
  },

  remove(id: string) {
    return http.delete<{ id: string }>(`/incomes/records/${id}`)
  },
}

// ==================== Custom Income Sources ====================

export interface CustomSourceListResult {
  items: CustomIncomeSource[]
}

export interface CustomSourceInput {
  label: string
  color: string
}

export const customSourcesApi = {
  list() {
    return http.get<CustomSourceListResult>('/incomes/sources')
  },

  create(payload: CustomSourceInput) {
    return http.post<CustomIncomeSource>('/incomes/sources', payload)
  },

  update(id: string, patch: Partial<CustomSourceInput>) {
    return http.patch<CustomIncomeSource>(`/incomes/sources/${id}`, patch)
  },

  remove(id: string) {
    return http.delete<{ id: string }>(`/incomes/sources/${id}`)
  },
}

// ==================== Source Overrides ====================

export interface SourceOverrideListResult {
  items: IncomeSourceOverride[]
}

export interface UpsertSourceOverrideInput {
  value: string
  label?: string
  color?: string
}

export const sourceOverridesApi = {
  list() {
    return http.get<SourceOverrideListResult>('/incomes/overrides')
  },

  upsert(payload: UpsertSourceOverrideInput) {
    return http.put<IncomeSourceOverride>('/incomes/overrides', payload)
  },

  reset(value: string) {
    return http.delete<{ value: string }>('/incomes/overrides', { value })
  },
}
