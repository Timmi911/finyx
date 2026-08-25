import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.js'
import { emptyDatabase, type Database } from './types/db.types.js'

let cache: Database | null = null
let writeChain: Promise<void> = Promise.resolve()

/** 读取整个数据库。首次调用从磁盘加载并缓存。 */
export async function loadDb(): Promise<Database> {
  if (cache) return cache
  try {
    const raw = await fs.readFile(config.dataFile, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Database>
    cache = {
      users: parsed.users ?? [],
      bills: parsed.bills ?? [],
      reimbursements: parsed.reimbursements ?? [],
      accounts: parsed.accounts ?? [],
      families: parsed.families ?? [],
      goals: parsed.goals ?? [],
      incomeRecords: parsed.incomeRecords ?? [],
      customIncomeSources: parsed.customIncomeSources ?? [],
      incomeSourceOverrides: parsed.incomeSourceOverrides ?? [],
    }
  } catch {
    // 文件不存在或损坏：用空结构初始化磁盘
    cache = { ...emptyDatabase }
    await saveDb()
  }
  return cache
}

/** 原子写：先写 .tmp 再 rename，串行化避免并发覆盖。 */
export function saveDb(): Promise<void> {
  const dir = path.dirname(config.dataFile)
  const tmp = config.dataFile + '.tmp'
  writeChain = writeChain
    .then(async () => {
      if (!cache) cache = await loadDb()
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(tmp, JSON.stringify(cache, null, 2), 'utf-8')
      await fs.rename(tmp, config.dataFile)
    })
    .catch((err) => {
      console.error('[db] save failed:', err)
    })
  return writeChain
}

/** 仅测试用：重置缓存为空结构（不写盘） */
export function __resetCacheForTest(): void {
  cache = null
}
