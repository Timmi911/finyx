import { loadDb, saveDb } from '../db.js'
import { generateId } from '../utils/id.js'
import { ApiError } from '../types/api.types.js'
import type { Bill } from '../types/domain.types.js'
import type {
  CreateBillInput,
  UpdateBillInput,
  ListBillsQuery,
  BatchImportInput,
} from '../schemas/bills.schema.js'

/** 找到当前用户的 bill（带越权保护） */
async function findOwnedBill(userId: string, id: string): Promise<Bill> {
  const db = await loadDb()
  const bill = db.bills.find(b => b.id === id && b.userId === userId)
  if (!bill) {
    // 越权或不存在都返回 404，避免暴露存在性
    throw new ApiError('bill_not_found', '票据不存在', 404)
  }
  return bill
}

/** 列表查询 + 简单分页（基于 createdAt 降序游标） */
export async function listBills(userId: string, query: ListBillsQuery): Promise<{ items: Bill[]; nextCursor: string | null }> {
  const db = await loadDb()
  let items = db.bills.filter(b => b.userId === userId)

  if (query.month) items = items.filter(b => b.date.startsWith(query.month!))
  if (query.kind) items = items.filter(b => b.kind === query.kind)
  if (query.usage) items = items.filter(b => b.usage === query.usage)
  if (query.status) items = items.filter(b => b.status === query.status)

  items.sort((a, b) => b.createdAt - a.createdAt)

  let cursorCreatedAt = -1
  if (query.cursor) {
    const cursor = Number(query.cursor)
    if (!Number.isNaN(cursor)) cursorCreatedAt = cursor
  }
  if (cursorCreatedAt >= 0) {
    items = items.filter(b => b.createdAt < cursorCreatedAt)
  }

  const limit = query.limit
  const slice = items.slice(0, limit)
  const nextCursor = slice.length === limit && items.length > limit
    ? String(slice[slice.length - 1].createdAt)
    : null

  return { items: slice, nextCursor }
}

export async function getBill(userId: string, id: string): Promise<Bill> {
  return findOwnedBill(userId, id)
}

export async function createBill(userId: string, input: CreateBillInput): Promise<Bill> {
  const db = await loadDb()
  const now = Date.now()
  const bill: Bill = {
    id: generateId(),
    ...input,
    createdAt: now,
    userId,
  }
  db.bills.push(bill)
  await saveDb()
  return bill
}

/** 事务式批量导入：内存构造全部对象，任一失败回滚整批 */
export async function batchImportBills(userId: string, input: BatchImportInput): Promise<{ created: number; ids: string[] }> {
  const db = await loadDb()
  const now = Date.now()
  const newBills: Bill[] = input.items.map(item => ({
    id: generateId(),
    ...item,
    createdAt: now,
    userId,
  }))
  // 这里没有外部校验失败的可能（zod 已在路由层校验），但仍保留事务模式供未来扩展
  db.bills.push(...newBills)
  await saveDb()
  return { created: newBills.length, ids: newBills.map(b => b.id) }
}

export async function updateBill(userId: string, id: string, patch: UpdateBillInput): Promise<Bill> {
  const db = await loadDb()
  const bill = await findOwnedBill(userId, id)
  Object.assign(bill, patch)
  // 确保 userId 不可被篡改
  bill.userId = userId
  await saveDb()
  return bill
}

export async function deleteBill(userId: string, id: string): Promise<{ id: string }> {
  const db = await loadDb()
  const bill = await findOwnedBill(userId, id)
  // 同步清理 reimbursements[*].billIds（避免悬空引用）
  let reimbursedChanged = false
  for (const r of db.reimbursements) {
    if (r.userId === userId && r.billIds.includes(id)) {
      r.billIds = r.billIds.filter(bid => bid !== id)
      reimbursedChanged = true
    }
  }
  if (reimbursedChanged) {
    // 重新计算 totalAmount（基于当前仍关联的 bills）
    for (const r of db.reimbursements) {
      if (r.userId === userId) {
        const total = r.billIds
          .map(bid => db.bills.find(b => b.id === bid))
          .filter((b): b is Bill => !!b)
          .reduce((sum, b) => sum + b.amount, 0)
        r.totalAmount = total
      }
    }
  }
  db.bills = db.bills.filter(b => !(b.id === id && b.userId === userId))
  await saveDb()
  return { id: bill.id }
}
