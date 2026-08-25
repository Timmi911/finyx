// ===== 票据类型（核心实体）=====
/** 票据来源 */
export type BillSource = 'upload' | 'ocr' | 'import' | 'capture' | 'manual'

/** 票据大类 */
export type BillKind =
  | 'invoice'        // 电子发票（普票/专票/数电票）
  | 'receipt'        // 购物小票/消费凭证
  | 'transport'      // 交通出行票据（机票/火车/出租/停车/ETC/加油）
  | 'medical'        // 医疗票据
  | 'utility'        // 生活缴费（水电宽带物业）
  | 'other'          // 其他

/** 发票类型（仅 invoice 有） */
export type InvoiceType = 'general' | 'special' | 'digital' | ''

/** 票据用途 */
export type BillUsage = 'personal' | 'reimbursable'  // 个人消费 / 可报销

/** 票据状态 */
export type BillStatus = 'archived' | 'pending' | 'reimbursed' | 'void'
// archived=已归档(个人消费), pending=待报销(已打包未提交), reimbursed=已报销, void=已作废

export interface Bill {
  id: string
  kind: BillKind
  invoiceType: InvoiceType      // 仅电子发票
  merchant: string              // 开票方 / 商户
  amount: number                // 金额（发票为价税合计）
  taxAmount: number             // 税额（仅发票）
  invoiceNumber: string         // 发票号码（仅发票）
  date: string                  // 开票/消费日期 YYYY-MM-DD
  category: string              // 用途分类（餐饮/交通/办公...）
  usage: BillUsage              // 用途
  status: BillStatus
  source: BillSource
  imageUrl: string              // 票据图片 dataURL 或空
  reimbursementId: string | null // 关联报销单
  note: string                  // 备注
  accountId: string | null      // 支付账户（辅助记账）
  createdAt: number
}

// ===== 报销单 =====
export type ReimbStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected'

export interface Reimbursement {
  id: string
  title: string                 // 报销事由
  billIds: string[]
  totalAmount: number
  status: ReimbStatus
  submitDate: string | null
  approver: string              // 企业端对接（第二阶段）
  note: string
  createdAt: number
}

// ===== 账户类型（辅助记账）=====
export type AccountKind = 'cash' | 'bank' | 'wechat' | 'alipay' | 'card' | 'custom'
export type AccountTier = 'main' | 'sub'

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
}

// ===== 家庭成员 =====
export type FamilyRole = 'parent' | 'child'

export interface FamilyMember {
  id: string
  name: string
  role: FamilyRole
  avatar: string
  color: string
  linkedAccountIds: string[]
  createdAt: number
}

// ===== 目标管理 =====
export type GoalType = 'saving' | 'debt'  // 积攒 / 消除
export type GoalStatus = 'active' | 'done'

export interface GoalRecord {
  date: string       // YYYY-MM-DD
  amount: number     // 本次存入/还款金额
  note: string
}

export interface Goal {
  id: string
  type: GoalType
  title: string         // 目标名称
  targetAmount: number  // 目标金额
  records: GoalRecord[] // 记录列表（时间线）
  status: GoalStatus
  color: string
  deadline: string      // 目标日期 YYYY-MM-DD
  createdAt: number
}

// ===== 月度收入记录 =====
export type IncomeSource = string  // 预设 'salary'|'bonus'|'side'|'refund'|'other' + 用户自定义

export interface IncomeRecord {
  id: string
  month: string          // YYYY-MM 归属月份
  date: string           // YYYY-MM-DD 实际日期
  source: IncomeSource
  amount: number
  note: string
  createdAt: number
}

/** 自定义收入来源 */
export interface CustomIncomeSource {
  id: string
  label: string
  color: string
  createdAt: number
}

/** 预设来源覆盖（用户修改预设的 label/color） */
export interface IncomeSourceOverride {
  value: string
  label?: string
  color?: string
}

export interface Profile {
  name: string
  avatar: string
}

// ===== 预设分类 =====
export interface CategoryPreset {
  name: string
  icon: string
  color: string
}

/** 用途分类（票据归类） */
export const BILL_CATEGORIES: CategoryPreset[] = [
  { name: '餐饮', icon: 'UtensilsCrossed', color: '#f97316' },
  { name: '交通', icon: 'Bus', color: '#3b82f6' },
  { name: '办公', icon: 'Briefcase', color: '#6366f1' },
  { name: '购物', icon: 'ShoppingBag', color: '#ec4899' },
  { name: '差旅', icon: 'Plane', color: '#06b6d4' },
  { name: '医疗', icon: 'HeartPulse', color: '#ef4444' },
  { name: '通讯', icon: 'Smartphone', color: '#14b8a6' },
  { name: '居住', icon: 'Home', color: '#a855f7' },
  { name: '教育', icon: 'GraduationCap', color: '#8b5cf6' },
  { name: '其他', icon: 'MoreHorizontal', color: '#64748b' },
]

// ===== 趣味功能（模块化、默认关闭、用户解锁） =====

/** 趣味功能标识 */
export type FunFeatureKey =
  | 'mouthpiece'   // 金句嘴替
  | 'fortune'      // 消费运势
  | 'achievements' // 成就徽章墙
  | 'selfbet'      // 自赌挑战
  | 'moneytree'    // 金钱树养成
  | 'pkchallenge'  // 好友PK挑战

export interface FunFeatureState {
  key: FunFeatureKey
  unlocked: boolean      // 是否已解锁
  unlockedAt: number | null
  enabled: boolean       // 解锁后是否启用（可手动关闭）
}

// --- 金句嘴替 ---
export interface MouthpieceLog {
  id: string
  date: string       // YYYY-MM-DD HH:mm
  billId: string
  amount: number
  category: string
  quote: string      // 吐槽/鼓励文案
  mood: 'roast' | 'cheer' | 'neutral'
}

// --- 消费运势 ---
export interface DailyFortune {
  date: string            // YYYY-MM-DD
  star: number            // 1-5 星
  suit: string[]          // 宜
  avoid: string[]         // 忌
  luckyCategory: string   // 幸运分类
  warningCategory: string // 警示分类
  word: string            // 一句话
}

// --- 成就徽章 ---
export type AchievementCategory = 'saving' | 'spending' | 'streak' | 'collection' | 'special'
export interface Achievement {
  id: string
  key: string              // 唯一标识
  title: string
  en: string
  desc: string
  category: AchievementCategory
  icon: string             // emoji
  unlocked: boolean
  unlockedAt: number | null
  progress: number         // 0-100
}

// --- 自赌挑战 ---
export type BetStatus = 'active' | 'won' | 'lost' | 'cancelled'
export interface SelfBet {
  id: string
  title: string            // 挑战内容
  type: 'spend_limit' | 'save_target' | 'no_category' | 'streak'
  target: number           // 目标值
  stake: number            // 赌注金额
  punishment: string       // 惩罚描述
  startDate: string
  endDate: string
  status: BetStatus
  progress: number         // 当前值
  createdAt: number
}

// --- 金钱树 ---
export interface MoneyTree {
  level: number            // 等级
  exp: number              // 当前经验
  leaves: number           // 叶子数
  totalWatered: number     // 累计浇水金额
  lastWaterDate: string    // 最后浇水日
  withered: boolean        // 是否枯萎
  stage: 'seed' | 'sprout' | 'sapling' | 'tree' | 'flower'
}

// --- 好友PK挑战 ---
export type PkStatus = 'invited' | 'active' | 'finished'
export interface PkParticipant {
  name: string
  avatar: string
  score: number
  isMe: boolean
}
export interface PkChallenge {
  id: string
  title: string
  type: 'save' | 'no_spend' | 'less_spend'
  target: number
  startDate: string
  endDate: string
  stake: number            // 输的请客金额
  participants: PkParticipant[]
  status: PkStatus
  createdAt: number
}


/** 票据大类预设 */
export const BILL_KIND_PRESETS: { kind: BillKind; label: string; icon: string; color: string }[] = [
  { kind: 'invoice', label: '电子发票', icon: 'FileText', color: '#22d3ee' },
  { kind: 'receipt', label: '购物小票', icon: 'Receipt', color: '#f472b6' },
  { kind: 'transport', label: '交通出行', icon: 'Plane', color: '#3b82f6' },
  { kind: 'medical', label: '医疗票据', icon: 'HeartPulse', color: '#ef4444' },
  { kind: 'utility', label: '生活缴费', icon: 'Zap', color: '#fbbf24' },
  { kind: 'other', label: '其他', icon: 'MoreHorizontal', color: '#64748b' },
]

/** 发票类型预设 */
export const INVOICE_TYPE_PRESETS: { value: InvoiceType; label: string }[] = [
  { value: 'general', label: '增值税普票' },
  { value: 'special', label: '增值税专票' },
  { value: 'digital', label: '数电票' },
]

/** 收入来源预设 */
export const INCOME_SOURCE_PRESETS: { value: IncomeSource; label: string; icon: string; color: string }[] = [
  { value: 'salary', label: '工资', icon: 'Wallet', color: '#10b981' },
  { value: 'bonus', label: '奖金', icon: 'Gift', color: '#f59e0b' },
  { value: 'side', label: '副业', icon: 'Briefcase', color: '#3b82f6' },
  { value: 'refund', label: '退款/报销', icon: 'RotateCcw', color: '#8b5cf6' },
  { value: 'other', label: '其他', icon: 'MoreHorizontal', color: '#64748b' },
]

export const ACCOUNT_KIND_PRESETS: { kind: AccountKind; label: string; icon: string; color: string }[] = [
  { kind: 'cash', label: '现金', icon: 'Banknote', color: '#34d399' },
  { kind: 'bank', label: '银行卡', icon: 'CreditCard', color: '#3b82f6' },
  { kind: 'wechat', label: '微信', icon: 'MessageCircle', color: '#10b981' },
  { kind: 'alipay', label: '支付宝', icon: 'Wallet', color: '#06b6d4' },
  { kind: 'card', label: '信用卡', icon: 'CreditCard', color: '#f472b6' },
  { kind: 'custom', label: '自定义', icon: 'Wallet', color: '#a78bfa' },
]
