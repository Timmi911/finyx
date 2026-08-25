import { z } from 'zod'

const billKindEnum = z.enum(['invoice', 'receipt', 'transport', 'medical', 'utility', 'other'])
const invoiceTypeEnum = z.enum(['general', 'special', 'digital', ''])
const billUsageEnum = z.enum(['personal', 'reimbursable'])
const billStatusEnum = z.enum(['archived', 'pending', 'reimbursed', 'void'])
const billSourceEnum = z.enum(['upload', 'ocr', 'import', 'capture', 'manual'])

/** 创建票据：必填业务字段，可选字段给默认值 */
export const createBillSchema = z.object({
  kind: billKindEnum,
  invoiceType: invoiceTypeEnum.default(''),
  merchant: z.string().default(''),
  amount: z.number().nonnegative(),
  taxAmount: z.number().default(0),
  invoiceNumber: z.string().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date 必须为 YYYY-MM-DD'),
  category: z.string().default('其他'),
  usage: billUsageEnum.default('personal'),
  status: billStatusEnum.default('archived'),
  source: billSourceEnum.default('manual'),
  imageUrl: z.string().default(''),
  note: z.string().default(''),
  accountId: z.string().nullable().default(null),
  reimbursementId: z.string().nullable().default(null),
})

/** 更新票据：所有字段可选，禁止改 id/userId/createdAt */
export const updateBillSchema = z.object({
  kind: billKindEnum.optional(),
  invoiceType: invoiceTypeEnum.optional(),
  merchant: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  taxAmount: z.number().optional(),
  invoiceNumber: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().optional(),
  usage: billUsageEnum.optional(),
  status: billStatusEnum.optional(),
  source: billSourceEnum.optional(),
  imageUrl: z.string().optional(),
  note: z.string().optional(),
  accountId: z.string().nullable().optional(),
  reimbursementId: z.string().nullable().optional(),
}).strict()

/** 列表查询 */
export const listBillsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  kind: billKindEnum.optional(),
  usage: billUsageEnum.optional(),
  status: billStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().optional(),
})

/** 批量导入 */
export const batchImportSchema = z.object({
  items: z.array(createBillSchema).min(1).max(500),
})

export type CreateBillInput = z.infer<typeof createBillSchema>
export type UpdateBillInput = z.infer<typeof updateBillSchema>
export type ListBillsQuery = z.infer<typeof listBillsQuerySchema>
export type BatchImportInput = z.infer<typeof batchImportSchema>
