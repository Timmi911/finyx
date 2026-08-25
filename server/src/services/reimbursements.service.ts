import { loadDb, saveDb } from '../db.js'
import { generateId } from '../utils/id.js'
import { ApiError } from '../types/api.types.js'
import type { Bill, Reimbursement } from '../types/domain.types.js'
import type {
  CreateReimbInput,
  UpdateReimbInput,
  ListReimbQuery,
} from '../schemas/reimbursements.schema.js'

/** 找到当前用户的 reimbursement（带越权保护） */
async function findOwnedReimb(userId: string, id: string): Promise<Reimbursement> {
  const db = await loadDb()
  const r = db.reimbursements.find(x => x.id === id && x.userId === userId)
  if (!r) throw new ApiError('reimb_not_found', '报销单不存在', 404)
  return r
}

/** 校验 billIds：必须都属于当前用户且不被其他报销单占用（除非是自己已关联的） */
async function validateBillIds(
  userId: string,
  billIds: string[],
  excludeReimbId?: string,
): Promise<Bill[]> {
  const db = await loadDb()
  const bills: Bill[] = []
  const seen = new Set<string>()
  for (const bid of billIds) {
    if (seen.has(bid)) throw new ApiError('bill_duplicate', `票据 ${bid} 重复`, 400)
    seen.add(bid)
    const bill = db.bills.find(b => b.id === bid && b.userId === userId)
    if (!bill) throw new ApiError('bill_not_found', `票据 ${bid} 不存在或无权限`, 404)
    // 被其他报销单占用（非自己当前这张）
    if (bill.reimbursementId && bill.reimbursementId !== excludeReimbId) {
      throw new ApiError('bill_already_linked', `票据 ${bid} 已被报销单 ${bill.reimbursementId} 关联`, 409)
    }
    bills.push(bill)
  }
  return bills
}

/** 计算报销单总金额：基于 billIds 对应 bills 的 amount 求和 */
function calcTotal(db: { bills: Bill[] }, userId: string, billIds: string[]): number {
  return billIds.reduce((sum, bid) => {
    const b = db.bills.find(x => x.id === bid && x.userId === userId)
    return sum + (b?.amount || 0)
  }, 0)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 列表查询 + 简单分页 */
export async function listReimbursements(
  userId: string,
  query: ListReimbQuery,
): Promise<{ items: Reimbursement[]; nextCursor: string | null }> {
  const db = await loadDb()
  let items = db.reimbursements.filter(r => r.userId === userId)
  if (query.status) items = items.filter(r => r.status === query.status)
  items.sort((a, b) => b.createdAt - a.createdAt)

  let cursorCreatedAt = -1
  if (query.cursor) {
    const cursor = Number(query.cursor)
    if (!Number.isNaN(cursor)) cursorCreatedAt = cursor
  }
  if (cursorCreatedAt >= 0) {
    items = items.filter(r => r.createdAt < cursorCreatedAt)
  }

  const limit = query.limit
  const slice = items.slice(0, limit)
  const nextCursor = slice.length === limit && items.length > limit
    ? String(slice[slice.length - 1].createdAt)
    : null
  return { items: slice, nextCursor }
}

export async function getReimbursement(userId: string, id: string): Promise<Reimbursement> {
  return findOwnedReimb(userId, id)
}

/** 创建：校验 billIds → 建对象 → 关联 bills status=pending → saveDb */
export async function createReimbursement(userId: string, input: CreateReimbInput): Promise<Reimbursement> {
  const db = await loadDb()
  await validateBillIds(userId, input.billIds)

  const now = Date.now()
  const reimb: Reimbursement = {
    id: generateId(),
    title: input.title,
    billIds: [...input.billIds],
    totalAmount: 0,
    status: input.status,
    submitDate: null,
    approver: input.approver,
    note: input.note,
    createdAt: now,
    userId,
  }
  reimb.totalAmount = calcTotal(db, userId, reimb.billIds)

  // 副作用：创建时若初始 status 不是 draft，同步 bills 状态
  const initialStatus = input.status
  for (const bill of db.bills) {
    if (bill.userId !== userId) continue
    if (reimb.billIds.includes(bill.id)) {
      bill.reimbursementId = reimb.id
      bill.status = initialStatus === 'paid' ? 'reimbursed'
        : initialStatus === 'rejected' ? 'archived'
        : 'pending'
    }
  }
  if (initialStatus === 'submitted' || initialStatus === 'approved') reimb.submitDate = todayStr()

  db.reimbursements.push(reimb)
  await saveDb()
  return reimb
}

/** 更新：改 billIds 先解旧关再绑新关；改 status 触发状态机副作用 */
export async function updateReimbursement(
  userId: string,
  id: string,
  patch: UpdateReimbInput,
): Promise<Reimbursement> {
  const db = await loadDb()
  const reimb = await findOwnedReimb(userId, id)

  // 1. billIds 变更：先解除旧关联（reimbursementId + status），再校验新关联，最后绑定
  if (patch.billIds !== undefined) {
    const newIds = patch.billIds
    const removedIds = reimb.billIds.filter(bid => !newIds.includes(bid))
    const addedIds = newIds.filter(bid => !reimb.billIds.includes(bid))

    // 解除被去掉的 bills
    for (const bill of db.bills) {
      if (bill.userId !== userId) continue
      if (removedIds.includes(bill.id)) {
        bill.reimbursementId = null
        bill.status = 'archived'
      }
    }

    // 校验新加入的 bills（不冲突）
    if (addedIds.length > 0) {
      await validateBillIds(userId, addedIds, id)
    }

    // 绑定新 bills（若报销单已 paid，直接改状态）
    for (const bill of db.bills) {
      if (bill.userId !== userId) continue
      if (addedIds.includes(bill.id)) {
        bill.reimbursementId = reimb.id
        bill.status = reimb.status === 'paid' ? 'reimbursed' : 'pending'
      }
    }

    reimb.billIds = newIds
    reimb.totalAmount = calcTotal(db, userId, newIds)
  }

  // 2. status 变更：触发状态机副作用
  if (patch.status !== undefined && patch.status !== reimb.status) {
    const newStatus = patch.status
    const allIds = reimb.billIds

    // bills 状态联动
    for (const bill of db.bills) {
      if (bill.userId !== userId) continue
      if (allIds.includes(bill.id)) {
        if (newStatus === 'paid') bill.status = 'reimbursed'
        else if (newStatus === 'rejected') bill.status = 'archived'
        else bill.status = 'pending' // draft/submitted/approved → pending
      }
    }

    // submitDate：首次进入 submitted/approved/paid 时写入
    if (
      ['submitted', 'approved', 'paid'].includes(newStatus) &&
      !reimb.submitDate
    ) {
      reimb.submitDate = todayStr()
    }

    reimb.status = newStatus
  }

  // 3. 简单字段
  if (patch.title !== undefined) reimb.title = patch.title
  if (patch.approver !== undefined) reimb.approver = patch.approver
  if (patch.note !== undefined) reimb.note = patch.note

  // billIds 可能没变但 status 变化导致 totalAmount 仍需保持一致（totalAmount 仅由 billIds 决定，无需重算）

  await saveDb()
  return reimb
}

/** 删除：关联 bills 回滚 status=archived + reimbursementId=null → 从集合移除 */
export async function deleteReimbursement(userId: string, id: string): Promise<{ id: string }> {
  const db = await loadDb()
  const reimb = await findOwnedReimb(userId, id)

  // 解除所有 bills 的关联
  for (const bill of db.bills) {
    if (bill.userId === userId && reimb.billIds.includes(bill.id)) {
      bill.reimbursementId = null
      bill.status = 'archived'
    }
  }

  db.reimbursements = db.reimbursements.filter(r => !(r.id === id && r.userId === userId))
  await saveDb()
  return { id: reimb.id }
}
