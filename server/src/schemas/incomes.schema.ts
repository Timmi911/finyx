import { z } from 'zod'

const monthRegex = /^\d{4}-\d{2}$/   // YYYY-MM
const dateRegex = /^\d{4}-\d{2}-\d{2}$/  // YYYY-MM-DD
const hexColorRegex = /^#[0-9a-fA-F]{6}$/

// ==================== Income Records ====================

export const createIncomeRecordSchema = z.object({
  month: z.string().regex(monthRegex, 'month 必须为 YYYY-MM'),
  date: z.string().regex(dateRegex, 'date 必须为 YYYY-MM-DD'),
  source: z.string().min(1, 'source 不能为空').max(100),
  amount: z.number().finite('amount 必须为数字'),
  note: z.string().default(''),
}).strict().refine(
  v => v.date.startsWith(v.month),
  { message: 'date 必须属于 month 指定的月份', path: ['date'] },
)

export const updateIncomeRecordSchema = z.object({
  month: z.string().regex(monthRegex).optional(),
  date: z.string().regex(dateRegex).optional(),
  source: z.string().min(1).max(100).optional(),
  amount: z.number().finite().optional(),
  note: z.string().optional(),
}).strict().refine(
  v => (v.date && v.month) ? v.date.startsWith(v.month) : true,
  { message: 'date 必须属于 month 指定的月份', path: ['date'] },
).refine(
  v => !((v.date && !v.month) || (!v.date && v.month)),
  { message: '修改 date/month 时必须同时提供匹配的一对', path: ['month'] },
)

export const listIncomeRecordsQuerySchema = z.object({
  month: z.string().regex(monthRegex).optional(),
  source: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
})

export type CreateIncomeRecordInput = z.infer<typeof createIncomeRecordSchema>
export type UpdateIncomeRecordInput = z.infer<typeof updateIncomeRecordSchema>
export type ListIncomeRecordsQuery = z.infer<typeof listIncomeRecordsQuerySchema>

// ==================== Custom Income Sources ====================

export const createCustomSourceSchema = z.object({
  label: z.string().min(1).max(30),
  color: z.string().regex(hexColorRegex, 'color 必须为 #RRGGBB').default('#a78bfa'),
}).strict()

export const updateCustomSourceSchema = z.object({
  label: z.string().min(1).max(30).optional(),
  color: z.string().regex(hexColorRegex).optional(),
}).strict()

// ==================== Income Source Overrides (预设来源 label/color 覆盖) ====================

export const upsertSourceOverrideSchema = z.object({
  value: z.string().min(1).max(100),
  label: z.string().min(1).max(30).optional(),
  color: z.string().regex(hexColorRegex).optional(),
}).strict().refine(
  v => (v.label !== undefined) || (v.color !== undefined),
  { message: 'label 与 color 至少提供一个', path: ['label'] },
)

export const deleteSourceOverrideQuerySchema = z.object({
  value: z.string().min(1).max(100),
})

export type CreateCustomSourceInput = z.infer<typeof createCustomSourceSchema>
export type UpdateCustomSourceInput = z.infer<typeof updateCustomSourceSchema>
export type UpsertSourceOverrideInput = z.infer<typeof upsertSourceOverrideSchema>
