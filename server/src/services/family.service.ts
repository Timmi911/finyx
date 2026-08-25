import { loadDb, saveDb } from '../db.js'
import { generateId } from '../utils/id.js'
import { ApiError } from '../types/api.types.js'
import type { FamilyMember } from '../types/domain.types.js'
import type {
  CreateFamilyInput,
  UpdateFamilyInput,
  ListFamilyQuery,
} from '../schemas/family.schema.js'

/** 找到当前用户的 family member（带越权保护） */
async function findOwnedMember(userId: string, id: string): Promise<FamilyMember> {
  const db = await loadDb()
  const m = db.families.find(x => x.id === id && x.userId === userId)
  if (!m) throw new ApiError('family_not_found', '家庭成员不存在', 404)
  return m
}

/** 校验 linkedAccountIds 都属于当前用户 */
async function validateLinkedAccounts(userId: string, ids: string[]): Promise<void> {
  if (!ids.length) return
  const db = await loadDb()
  const owned = new Set(db.accounts.filter(a => a.userId === userId).map(a => a.id))
  const invalid = ids.filter(id => !owned.has(id))
  if (invalid.length > 0) {
    throw new ApiError('account_not_found', `账户 ${invalid[0]} 不存在或无权限`, 404)
  }
}

/** 列表查询 */
export async function listFamily(
  userId: string,
  query: ListFamilyQuery,
): Promise<{ items: FamilyMember[] }> {
  const db = await loadDb()
  let items = db.families.filter(m => m.userId === userId)
  if (query.role) items = items.filter(m => m.role === query.role)
  items.sort((a, b) => a.createdAt - b.createdAt)
  return { items }
}

export async function getFamilyMember(userId: string, id: string): Promise<FamilyMember> {
  return findOwnedMember(userId, id)
}

export async function createFamilyMember(
  userId: string,
  input: CreateFamilyInput,
): Promise<FamilyMember> {
  const db = await loadDb()
  await validateLinkedAccounts(userId, input.linkedAccountIds)
  const m: FamilyMember = {
    id: generateId(),
    ...input,
    createdAt: Date.now(),
    userId,
  }
  db.families.push(m)
  await saveDb()
  return m
}

export async function updateFamilyMember(
  userId: string,
  id: string,
  patch: UpdateFamilyInput,
): Promise<FamilyMember> {
  const db = await loadDb()
  const m = await findOwnedMember(userId, id)
  if (patch.linkedAccountIds !== undefined) {
    await validateLinkedAccounts(userId, patch.linkedAccountIds)
  }
  Object.assign(m, patch)
  m.userId = userId
  await saveDb()
  return m
}

export async function deleteFamilyMember(userId: string, id: string): Promise<{ id: string }> {
  const db = await loadDb()
  const m = await findOwnedMember(userId, id)
  db.families = db.families.filter(x => !(x.id === id && x.userId === userId))
  await saveDb()
  return { id: m.id }
}
