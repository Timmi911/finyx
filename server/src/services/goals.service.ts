import { loadDb, saveDb } from '../db.js'
import { generateId } from '../utils/id.js'
import { ApiError } from '../types/api.types.js'
import type { Goal, GoalRecord } from '../types/domain.types.js'
import type {
  CreateGoalInput, UpdateGoalInput, ListGoalsQuery,
  AddRecordInput, UpdateRecordInput,
} from '../schemas/goals.schema.js'

async function findOwnedGoal(userId: string, id: string, db = loadDb()): Promise<Goal> {
  const d = await db
  const g = d.goals.find(x => x.id === id && x.userId === userId)
  if (!g) throw new ApiError('goal_not_found', '目标不存在', 404)
  return g
}

/** 列表 + 筛选（status/type） */
export async function listGoals(
  userId: string,
  query: ListGoalsQuery,
): Promise<{ items: Goal[] }> {
  const db = await loadDb()
  let items = db.goals.filter(g => g.userId === userId)
  if (query.status) items = items.filter(g => g.status === query.status)
  if (query.type) items = items.filter(g => g.type === query.type)
  items.sort((a, b) => a.createdAt - b.createdAt)
  if (query.limit && items.length > query.limit) items = items.slice(0, query.limit)
  return { items }
}

export async function getGoal(userId: string, id: string): Promise<Goal> {
  return findOwnedGoal(userId, id)
}

/** 新增：自动校验 records 非空后金额累计 ≤ targetAmount 没有强制（前端可先空再加） */
export async function createGoal(userId: string, input: CreateGoalInput): Promise<Goal> {
  const db = await loadDb()
  const g: Goal = {
    id: generateId(),
    userId,
    ...input,
    createdAt: Date.now(),
  }
  db.goals.push(g)
  await saveDb()
  return g
}

/** 更新（顶层字段） */
export async function updateGoal(
  userId: string,
  id: string,
  patch: UpdateGoalInput,
): Promise<Goal> {
  const g = await findOwnedGoal(userId, id)
  Object.assign(g, patch as Partial<Goal>)
  await saveDb()
  return g
}

/** 删除目标 */
export async function deleteGoal(userId: string, id: string): Promise<{ id: string }> {
  const g = await findOwnedGoal(userId, id)
  const db = await loadDb()
  db.goals = db.goals.filter(x => !(x.id === g.id && x.userId === userId))
  await saveDb()
  return { id: g.id }
}

// ==================== Goal Records（内嵌数组操作） ====================

/** 追加一条 record（前端方法：addGoalRecord push） */
export async function addGoalRecord(
  userId: string,
  goalId: string,
  input: AddRecordInput,
): Promise<Goal> {
  const g = await findOwnedGoal(userId, goalId)
  const rec: GoalRecord = { date: input.date, amount: input.amount, note: input.note }
  g.records.push(rec)
  await saveDb()
  return g
}

/** 按索引更新一条 record（对应前端：按 idx 覆盖） */
export async function updateGoalRecord(
  userId: string,
  goalId: string,
  recordIndex: number,
  input: UpdateRecordInput,
): Promise<Goal> {
  const g = await findOwnedGoal(userId, goalId)
  if (!Number.isInteger(recordIndex) || recordIndex < 0 || recordIndex >= g.records.length) {
    throw new ApiError('record_index_invalid', `record 索引 ${recordIndex} 越界`, 404)
  }
  g.records[recordIndex] = { date: input.date, amount: input.amount, note: input.note }
  await saveDb()
  return g
}

/** 按索引删除一条 record（对应前端：deleteGoalRecord 按 idx） */
export async function deleteGoalRecord(
  userId: string,
  goalId: string,
  recordIndex: number,
): Promise<Goal> {
  const g = await findOwnedGoal(userId, goalId)
  if (!Number.isInteger(recordIndex) || recordIndex < 0 || recordIndex >= g.records.length) {
    throw new ApiError('record_index_invalid', `record 索引 ${recordIndex} 越界`, 404)
  }
  g.records.splice(recordIndex, 1)
  await saveDb()
  return g
}
