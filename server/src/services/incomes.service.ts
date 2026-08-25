import { loadDb, saveDb } from '../db.js'
import { generateId } from '../utils/id.js'
import { ApiError } from '../types/api.types.js'
import type {
  IncomeRecord, CustomIncomeSource, IncomeSourceOverride,
} from '../types/domain.types.js'
import type {
  CreateIncomeRecordInput, UpdateIncomeRecordInput, ListIncomeRecordsQuery,
  CreateCustomSourceInput, UpdateCustomSourceInput, UpsertSourceOverrideInput,
} from '../schemas/incomes.schema.js'

// ============================================================
// Income Records
// ============================================================

async function findOwnedRecord(userId: string, id: string): Promise<IncomeRecord> {
  const db = await loadDb()
  const r = db.incomeRecords.find(x => x.id === id && x.userId === userId)
  if (!r) throw new ApiError('record_not_found', '收入记录不存在', 404)
  return r
}

export async function listIncomeRecords(
  userId: string,
  query: ListIncomeRecordsQuery,
): Promise<{ items: IncomeRecord[]; total: number }> {
  const db = await loadDb()
  let items = db.incomeRecords.filter(r => r.userId === userId)
  if (query.month) items = items.filter(r => r.month === query.month)
  if (query.source) items = items.filter(r => r.source === query.source)
  items.sort((a, b) => b.createdAt - a.createdAt)
  const total = items.length
  if (query.limit && items.length > query.limit) items = items.slice(0, query.limit)
  return { items, total }
}

export async function getIncomeRecord(userId: string, id: string): Promise<IncomeRecord> {
  return findOwnedRecord(userId, id)
}

export async function createIncomeRecord(
  userId: string,
  input: CreateIncomeRecordInput,
): Promise<IncomeRecord> {
  const db = await loadDb()
  const rec: IncomeRecord = {
    id: generateId(),
    userId,
    ...input,
    createdAt: Date.now(),
  }
  db.incomeRecords.push(rec)
  await saveDb()
  return rec
}

export async function updateIncomeRecord(
  userId: string,
  id: string,
  patch: UpdateIncomeRecordInput,
): Promise<IncomeRecord> {
  const r = await findOwnedRecord(userId, id)
  const next = { ...r, ...patch }
  // 若只更新 date 或只更新 month 后跨月，拒绝；schema 已保证「同时提供或都不提供」，再校验一致性
  if (patch.date && patch.month && !patch.date.startsWith(patch.month)) {
    throw new ApiError('invalid_month_pair', 'date 必须属于 month 指定的月份', 400)
  }
  // 若 patch 其中之一，需与现有另一字段组合后仍匹配
  if (patch.date && !patch.month && !patch.date.startsWith(r.month)) {
    throw new ApiError('invalid_month_pair', 'date 必须属于 month 指定的月份', 400)
  }
  if (patch.month && !patch.date && !r.date.startsWith(patch.month)) {
    throw new ApiError('invalid_month_pair', 'date 必须属于 month 指定的月份', 400)
  }
  Object.assign(r, patch as Partial<IncomeRecord>)
  await saveDb()
  return next
}

export async function deleteIncomeRecord(userId: string, id: string): Promise<{ id: string }> {
  const r = await findOwnedRecord(userId, id)
  const db = await loadDb()
  db.incomeRecords = db.incomeRecords.filter(x => !(x.id === r.id && x.userId === userId))
  await saveDb()
  return { id: r.id }
}

// ============================================================
// Custom Income Sources
// ============================================================

async function findOwnedSource(userId: string, id: string): Promise<CustomIncomeSource> {
  const db = await loadDb()
  const s = db.customIncomeSources.find(x => x.id === id && x.userId === userId)
  if (!s) throw new ApiError('source_not_found', '自定义来源不存在', 404)
  return s
}

export async function listCustomSources(userId: string): Promise<{ items: CustomIncomeSource[] }> {
  const db = await loadDb()
  const items = db.customIncomeSources
    .filter(s => s.userId === userId)
    .sort((a, b) => a.createdAt - b.createdAt)
  return { items }
}

export async function createCustomSource(
  userId: string,
  input: CreateCustomSourceInput,
): Promise<CustomIncomeSource> {
  const db = await loadDb()
  // 同用户不允许重名
  if (db.customIncomeSources.some(s => s.userId === userId && s.label === input.label)) {
    throw new ApiError('source_label_exists', '该自定义来源名称已存在', 400)
  }
  const s: CustomIncomeSource = {
    id: generateId(),
    userId,
    ...input,
    createdAt: Date.now(),
  }
  db.customIncomeSources.push(s)
  await saveDb()
  return s
}

export async function updateCustomSource(
  userId: string,
  id: string,
  patch: UpdateCustomSourceInput,
): Promise<CustomIncomeSource> {
  const s = await findOwnedSource(userId, id)
  const db = await loadDb()
  if (patch.label && patch.label !== s.label) {
    if (db.customIncomeSources.some(x => x.userId === userId && x.id !== id && x.label === patch.label)) {
      throw new ApiError('source_label_exists', '该自定义来源名称已存在', 400)
    }
  }
  Object.assign(s, patch)
  await saveDb()
  return s
}

export async function deleteCustomSource(userId: string, id: string): Promise<{ id: string }> {
  const s = await findOwnedSource(userId, id)
  const db = await loadDb()
  // 禁止删仍被 incomeRecords 引用的自定义来源
  const stillUsed = db.incomeRecords.some(r => r.userId === userId && r.source === s.id)
  if (stillUsed) throw new ApiError('source_in_use', '该自定义来源仍被收入记录引用，无法删除', 400)
  db.customIncomeSources = db.customIncomeSources.filter(x => !(x.id === s.id && x.userId === userId))
  await saveDb()
  return { id: s.id }
}

// ============================================================
// Income Source Overrides（针对预设来源 value 的 label/color 覆盖）
// ============================================================

export async function listSourceOverrides(
  userId: string,
): Promise<{ items: IncomeSourceOverride[] }> {
  const db = await loadDb()
  const items = db.incomeSourceOverrides.filter(o => o.userId === userId)
  return { items }
}

/** upsert：同 userId+value 存在则更新，不存在则插入 */
export async function upsertSourceOverride(
  userId: string,
  input: UpsertSourceOverrideInput,
): Promise<IncomeSourceOverride> {
  const db = await loadDb()
  let target = db.incomeSourceOverrides.find(o => o.userId === userId && o.value === input.value)
  if (!target) {
    target = { userId, value: input.value }
    if (input.label !== undefined) target.label = input.label
    if (input.color !== undefined) target.color = input.color
    db.incomeSourceOverrides.push(target)
  } else {
    if (input.label !== undefined) target.label = input.label
    if (input.color !== undefined) target.color = input.color
  }
  await saveDb()
  // 返回副本：避免把 userId 暴露给前端（前端不需要）
  const { userId: _uid, ...rest } = target
  void _uid
  return rest as unknown as IncomeSourceOverride
}

export async function resetSourceOverride(userId: string, value: string): Promise<{ value: string }> {
  const db = await loadDb()
  const before = db.incomeSourceOverrides.length
  db.incomeSourceOverrides = db.incomeSourceOverrides.filter(
    o => !(o.userId === userId && o.value === value),
  )
  if (db.incomeSourceOverrides.length === before) {
    throw new ApiError('override_not_found', `预设来源 "${value}" 未被覆盖`, 404)
  }
  await saveDb()
  return { value }
}
