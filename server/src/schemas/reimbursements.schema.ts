import { z } from 'zod'

const reimbStatusEnum = z.enum(['draft', 'submitted', 'approved', 'paid', 'rejected'])

/** 创建报销单：必须至少关联 1 张 billId；totalAmount / submitDate 由服务端计算 */
export const createReimbSchema = z.object({
  title: z.string().min(1).max(100),
  billIds: z.array(z.string().min(1)).min(1, '至少关联 1 张票据').max(200),
  status: reimbStatusEnum.default('draft'),
  approver: z.string().default(''),
  note: z.string().default(''),
})

/** 更新报销单：全字段可选；改 billIds 或 status 会触发副作用 */
export const updateReimbSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  billIds: z.array(z.string().min(1)).min(1).max(200).optional(),
  status: reimbStatusEnum.optional(),
  approver: z.string().optional(),
  note: z.string().optional(),
}).strict()

/** 列表筛选 */
export const listReimbQuerySchema = z.object({
  status: reimbStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().optional(),
})

export type CreateReimbInput = z.infer<typeof createReimbSchema>
export type UpdateReimbInput = z.infer<typeof updateReimbSchema>
export type ListReimbQuery = z.infer<typeof listReimbQuerySchema>
