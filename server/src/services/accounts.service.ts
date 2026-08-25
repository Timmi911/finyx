import { loadDb, saveDb } from '../db.js'
import { generateId } from '../utils/id.js'
import { ApiError } from '../types/api.types.js'
import type { Account } from '../types/domain.types.js'
import type {
  CreateAccountInput,
  UpdateAccountInput,
  ListAccountsQuery,
} from '../schemas/accounts.schema.js'

/** 找到当前用户的 account（带越权保护） */
async function findOwnedAccount(userId: string, id: string): Promise<Account> {
  const db = await loadDb()
  const acc = db.accounts.find(a => a.id === id && a.userId === userId)
  if (!acc) throw new ApiError('account_not_found', '账户不存在', 404)
  return acc
}

/** 列表查询（含 tier/kind 筛选） */
export async function listAccounts(
  userId: string,
  query: ListAccountsQuery,
): Promise<{ items: Account[] }> {
  const db = await loadDb()
  let items = db.accounts.filter(a => a.userId === userId)
  if (query.tier) items = items.filter(a => a.tier === query.tier)
  if (query.kind) items = items.filter(a => a.kind === query.kind)
  items.sort((a, b) => a.createdAt - b.createdAt)
  return { items }
}

export async function getAccount(userId: string, id: string): Promise<Account> {
  return findOwnedAccount(userId, id)
}

/** 创建：sub 账户需校验 parentId 属于当前用户且 tier=main */
export async function createAccount(userId: string, input: CreateAccountInput): Promise<Account> {
  const db = await loadDb()
  if (input.parentId) {
    const parent = db.accounts.find(
      a => a.id === input.parentId && a.userId === userId && a.tier === 'main',
    )
    if (!parent) throw new ApiError('parent_not_found', '父账户不存在或无权限', 404)
    if (input.tier !== 'sub') {
      throw new ApiError('invalid_tier', '子账户必须 tier=sub', 400)
    }
  } else if (input.tier === 'sub') {
    throw new ApiError('parent_required', '子账户必须指定 parentId', 400)
  }

  const acc: Account = {
    id: generateId(),
    ...input,
    createdAt: Date.now(),
    userId,
  }
  db.accounts.push(acc)
  await saveDb()
  return acc
}

/** 更新：禁止改 parentId 关系链（避免循环依赖）；允许编辑 initialBalance/icon/name 等 */
export async function updateAccount(
  userId: string,
  id: string,
  patch: UpdateAccountInput,
): Promise<Account> {
  const db = await loadDb()
  const acc = await findOwnedAccount(userId, id)
  if (patch.parentId !== undefined) {
    throw new ApiError('parent_immutable', '不允许修改 parentId，请删除后重建', 400)
  }
  Object.assign(acc, patch)
  acc.userId = userId
  await saveDb()
  return acc
}

/** 删除：级联删除子账户 + bills.accountId=null（避免悬空引用） */
export async function deleteAccount(userId: string, id: string): Promise<{ id: string }> {
  const db = await loadDb()
  const acc = await findOwnedAccount(userId, id)

  // 级联删除子账户（sub tier 的 parentId 指向当前账户）
  const childIds = db.accounts
    .filter(a => a.userId === userId && a.parentId === id)
    .map(a => a.id)
  const removeIds = [id, ...childIds]

  // bills 关联清理
  for (const bill of db.bills) {
    if (bill.userId === userId && bill.accountId && removeIds.includes(bill.accountId)) {
      bill.accountId = null
    }
  }
  db.accounts = db.accounts.filter(a => !(removeIds.includes(a.id) && a.userId === userId))
  await saveDb()
  return { id: acc.id }
}
