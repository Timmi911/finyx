import { z } from 'zod'

const accountKindEnum = z.enum(['cash', 'bank', 'wechat', 'alipay', 'card', 'custom'])
const accountTierEnum = z.enum(['main', 'sub'])

/** 创建账户 */
export const createAccountSchema = z.object({
  name: z.string().min(1).max(50),
  tier: accountTierEnum,
  kind: accountKindEnum,
  category: z.string().default(''),
  parentId: z.string().nullable().default(null),
  icon: z.string().default('Wallet'),
  color: z.string().default('#a78bfa'),
  budget: z.number().nonnegative().default(0),
  initialBalance: z.number().default(0),
}).strict()

/** 更新账户：全字段可选（id/createdAt/userId 不可改，由服务端保护） */
export const updateAccountSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  tier: accountTierEnum.optional(),
  kind: accountKindEnum.optional(),
  category: z.string().optional(),
  parentId: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  initialBalance: z.number().optional(),
}).strict()

/** 列表筛选 */
export const listAccountsQuerySchema = z.object({
  tier: accountTierEnum.optional(),
  kind: accountKindEnum.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>
