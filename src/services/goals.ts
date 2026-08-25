import { http } from '../utils/api'
import type { Goal, GoalType, GoalStatus, GoalRecord } from '../types'

export interface GoalListResult {
  items: Goal[]
}

export interface ListGoalsParams {
  status?: GoalStatus
  type?: GoalType
  limit?: number
}

/** 创建目标时提交的字段（id/createdAt 由服务端管理） */
export interface GoalInput {
  type: GoalType
  title: string
  targetAmount: number
  records?: GoalRecord[]
  status?: GoalStatus
  color?: string
  deadline: string
}

/** 内嵌 record 操作时提交的字段 */
export interface GoalRecordInput {
  date: string
  amount: number
  note: string
}

export const goalsApi = {
  list(params: ListGoalsParams = {}) {
    return http.get<GoalListResult>('/goals', {
      status: params.status,
      type: params.type,
      limit: params.limit,
    })
  },

  get(id: string) {
    return http.get<Goal>(`/goals/${id}`)
  },

  create(payload: GoalInput) {
    return http.post<Goal>('/goals', payload)
  },

  update(id: string, patch: Partial<GoalInput>) {
    return http.patch<Goal>(`/goals/${id}`, patch)
  },

  remove(id: string) {
    return http.delete<{ id: string }>(`/goals/${id}`)
  },

  // ===== 内嵌 records（按 index 操作） =====

  addRecord(goalId: string, input: GoalRecordInput) {
    return http.post<Goal>(`/goals/${goalId}/records`, input)
  },

  updateRecord(goalId: string, index: number, input: GoalRecordInput) {
    return http.patch<Goal>(`/goals/${goalId}/records/${index}`, input)
  },

  deleteRecord(goalId: string, index: number) {
    return http.delete<Goal>(`/goals/${goalId}/records/${index}`)
  },
}
