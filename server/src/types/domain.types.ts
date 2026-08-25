// 与前端 finyx/src/types/index.ts 对齐的核心业务模型（仅包含后端持久化的 4 集合 + user）

export type BillKind = 'invoice' | 'receipt' | 'transport' | 'medical' | 'utility' | 'other'
export type BillStatus = 'archived' | 'pending' | 'reimbursed' | 'void'
export type BillUsage = 'personal' | 'reimbursable'
export type BillSource = 'upload' | 'ocr' | 'import' | 'capture' | 'manual'
export type InvoiceType = '' | 'general' | 'digital' | 'special'

export interface Bill {
  id: string
  kind: BillKind
  invoiceType: InvoiceType
  merchant: string
  amount: number
  taxAmount: number
  invoiceNumber: string
  date: string // YYYY-MM-DD
  category: string
  usage: BillUsage
  status: BillStatus
  source: BillSource
  imageUrl: string
  reimbursementId: string | null
  note: string
  accountId: string | null
  createdAt: number
  userId: string // 后端权限隔离字段
}

export type ReimbStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected'

export interface Reimbursement {
  id: string
  title: string
  billIds: string[]
  totalAmount: number
  status: ReimbStatus
  submitDate: string | null
  approver: string
  note: string
  createdAt: number
  userId: string
}

export type AccountTier = 'main' | 'sub'
export type AccountKind = 'cash' | 'bank' | 'wechat' | 'alipay' | 'card' | 'custom'

export interface Account {
  id: string
  name: string
  tier: AccountTier
  kind: AccountKind
  category: string
  parentId: string | null
  icon: string
  color: string
  budget: number
  initialBalance: number
  createdAt: number
  userId: string
}

export type FamilyRole = 'parent' | 'child'

export interface FamilyMember {
  id: string
  name: string
  role: FamilyRole
  avatar: string
  color: string
  linkedAccountIds: string[]
  createdAt: number
  userId: string
}

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string // 永不返回到响应中
  createdAt: number
}

/** 响应中可暴露的 user（剥离 passwordHash） */
export type PublicUser = Omit<User, 'passwordHash'>

// ===== 目标管理 =====
export type GoalType = 'saving' | 'debt'
export type GoalStatus = 'active' | 'done'

export interface GoalRecord {
  date: string       // YYYY-MM-DD
  amount: number     // 本次存入/还款金额
  note: string
}

export interface Goal {
  id: string
  userId: string
  type: GoalType
  title: string
  targetAmount: number
  records: GoalRecord[]
  status: GoalStatus
  color: string
  deadline: string   // YYYY-MM-DD
  createdAt: number
}

// ===== 收入 =====
export type IncomeSource = string  // 预设 salary/bonus/side/refund/other 或自定义 id

export interface IncomeRecord {
  id: string
  userId: string
  month: string     // YYYY-MM
  date: string      // YYYY-MM-DD
  source: IncomeSource
  amount: number
  note: string
  createdAt: number
}

export interface CustomIncomeSource {
  id: string
  userId: string
  label: string
  color: string
  createdAt: number
}

/** 预设来源的 label/color 覆盖（per user per preset value） */
export interface IncomeSourceOverride {
  userId: string
  value: string
  label?: string
  color?: string
}
