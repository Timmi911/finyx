import { billsApi } from '../services/bills'
import { accountsApi } from '../services/accounts'
import { reimbursementsApi } from '../services/reimbursements'
import { familyApi } from '../services/family'
import type { Bill, Account, Reimbursement, FamilyMember } from '../types'

const STORAGE_KEY = 'finyx-data-v2'
const BATCH_SIZE = 500

/** legacy localStorage 中需要迁移的 4 个集合 */
interface LegacyData {
  bills?: Bill[]
  reimbursements?: Reimbursement[]
  accounts?: Account[]
  family?: FamilyMember[]
}

export interface MigrationSummary {
  accounts: number
  bills: number
  reimbursements: number
  family: number
}

/** 读取 legacy localStorage；无数据返回 null */
function readLegacy(): LegacyData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as LegacyData
    if (
      !data ||
      (!data.bills?.length && !data.reimbursements?.length && !data.accounts?.length && !data.family?.length)
    ) {
      return null
    }
    return data
  } catch (err) {
    console.warn('[migrateLegacy] 读取 legacy localStorage 失败:', err)
    return null
  }
}

/** 从 localStorage JSON 中剔除已迁移成功的集合字段，保留 profile/funFeatures 等本地字段 */
function stripMigratedFields(done: { accounts: boolean; bills: boolean; reimbursements: boolean; family: boolean }) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as Record<string, unknown>
    let changed = false
    if (done.accounts && 'accounts' in data) { delete data.accounts; changed = true }
    if (done.bills && 'bills' in data) { delete data.bills; changed = true }
    if (done.reimbursements && 'reimbursements' in data) { delete data.reimbursements; changed = true }
    if (done.family && 'family' in data) { delete data.family; changed = true }
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('[migrateLegacy] 清理 localStorage 字段失败:', err)
  }
}

function chunkBy<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** 迁移账户：先主后子，建立 oldId→newId 映射 */
async function migrateAccounts(
  legacy: Account[],
  idMap: Map<string, string>,
): Promise<number> {
  const mains = legacy.filter(a => a.tier === 'main' || !a.parentId)
  const subs = legacy.filter(a => a.tier === 'sub' && a.parentId)
  for (const a of mains) {
    const created = await accountsApi.create({
      name: a.name,
      tier: 'main',
      kind: a.kind,
      category: a.category,
      parentId: null,
      icon: a.icon,
      color: a.color,
      budget: a.budget,
      initialBalance: a.initialBalance,
    })
    idMap.set(a.id, created.id)
  }
  for (const a of subs) {
    const newParentId = a.parentId ? idMap.get(a.parentId) ?? null : null
    const created = await accountsApi.create({
      name: a.name,
      tier: 'sub',
      kind: a.kind,
      category: a.category,
      parentId: newParentId,
      icon: a.icon,
      color: a.color,
      budget: a.budget,
      initialBalance: a.initialBalance,
    })
    idMap.set(a.id, created.id)
  }
  return idMap.size
}

/** 迁移票据：分批 batchImport，accountId 重映射、reimbursementId 置 null，建立 oldId→newId 映射 */
async function migrateBills(
  legacy: Bill[],
  accIdMap: Map<string, string>,
  idMap: Map<string, string>,
): Promise<number> {
  let migrated = 0
  for (const chunk of chunkBy(legacy, BATCH_SIZE)) {
    const items = chunk.map(b => ({
      kind: b.kind,
      invoiceType: b.invoiceType,
      merchant: b.merchant,
      amount: b.amount,
      taxAmount: b.taxAmount,
      invoiceNumber: b.invoiceNumber,
      date: b.date,
      category: b.category,
      usage: b.usage,
      status: b.status,
      source: b.source,
      imageUrl: b.imageUrl,
      note: b.note,
      accountId: b.accountId ? accIdMap.get(b.accountId) ?? null : null,
      // reimbursementId 由报销单创建时回填，这里置 null
      reimbursementId: null,
    }))
    const { ids } = await billsApi.batchImport(items)
    chunk.forEach((b, i) => idMap.set(b.id, ids[i]))
    migrated += chunk.length
  }
  return migrated
}

/** 迁移报销单：billIds 重映射，传原 status（后端副作用回填 bills.reimbursementId+status） */
async function migrateReimbursements(
  legacy: Reimbursement[],
  billIdMap: Map<string, string>,
): Promise<number> {
  let migrated = 0
  for (const r of legacy) {
    const mapped = r.billIds
      .map(bid => billIdMap.get(bid))
      .filter((id): id is string => !!id)
    // 原 billIds 非空但全部映射失败 → 跳过（避免创建空报销单丢数据）
    if (r.billIds.length > 0 && mapped.length === 0) continue
    await reimbursementsApi.create({
      title: r.title,
      billIds: mapped,
      status: r.status,
      approver: r.approver,
      note: r.note,
    })
    migrated++
  }
  return migrated
}

/** 迁移家庭成员：linkedAccountIds 重映射 */
async function migrateFamily(
  legacy: FamilyMember[],
  accIdMap: Map<string, string>,
): Promise<number> {
  let migrated = 0
  for (const m of legacy) {
    const linkedAccountIds = (m.linkedAccountIds || [])
      .map(id => accIdMap.get(id))
      .filter((id): id is string => !!id)
    await familyApi.create({
      name: m.name,
      role: m.role,
      avatar: m.avatar,
      color: m.color,
      linkedAccountIds,
    })
    migrated++
  }
  return migrated
}

/**
 * 注册成功后调用：将 legacy localStorage 中的 4 个集合迁移到后端。
 * - 按依赖顺序：accounts → bills → reimbursements → family
 * - 每集合独立 try/catch，失败不中断后续无依赖集合
 * - 仅迁移成功的集合从 localStorage 剔除（避免数据丢失）
 */
export async function migrateLegacyData(): Promise<MigrationSummary> {
  const summary: MigrationSummary = { accounts: 0, bills: 0, reimbursements: 0, family: 0 }
  const legacy = readLegacy()
  if (!legacy) return summary

  const accIdMap = new Map<string, string>()
  const billIdMap = new Map<string, string>()
  const done = { accounts: false, bills: false, reimbursements: false, family: false }

  // 1. Accounts（先主后子）
  if (legacy.accounts?.length) {
    try {
      summary.accounts = await migrateAccounts(legacy.accounts, accIdMap)
      done.accounts = true
    } catch (err) {
      console.warn('[migrateLegacy] accounts 迁移失败:', err)
    }
  } else {
    done.accounts = true
  }

  // 2. Bills（accountId 重映射；accounts 失败时回退 null，仍可迁移）
  if (legacy.bills?.length) {
    try {
      summary.bills = await migrateBills(legacy.bills, accIdMap, billIdMap)
      done.bills = true
    } catch (err) {
      console.warn('[migrateLegacy] bills 迁移失败:', err)
    }
  } else {
    done.bills = true
  }

  // 3. Reimbursements（billIds 重映射；bills 失败时全部跳过）
  if (legacy.reimbursements?.length) {
    try {
      summary.reimbursements = await migrateReimbursements(legacy.reimbursements, billIdMap)
      done.reimbursements = true
    } catch (err) {
      console.warn('[migrateLegacy] reimbursements 迁移失败:', err)
    }
  } else {
    done.reimbursements = true
  }

  // 4. Family（linkedAccountIds 重映射）
  if (legacy.family?.length) {
    try {
      summary.family = await migrateFamily(legacy.family, accIdMap)
      done.family = true
    } catch (err) {
      console.warn('[migrateLegacy] family 迁移失败:', err)
    }
  } else {
    done.family = true
  }

  stripMigratedFields(done)

  console.info('[migrateLegacy] 迁移完成:', summary)
  return summary
}
