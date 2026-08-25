import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const hexColorRegex = /^#[0-9a-fA-F]{6}$/

const goalTypeEnum = z.enum(['saving', 'debt'])
const goalStatusEnum = z.enum(['active', 'done'])

export const goalRecordSchema = z.object({
  date: z.string().regex(dateRegex, 'date 必须为 YYYY-MM-DD'),
  amount: z.number().finite('amount 必须为数字').nonnegative('amount 不能为负'),
  note: z.string().default(''),
}).strict()

/** 创建 Goal */
export const createGoalSchema = z.object({
  type: goalTypeEnum,
  title: z.string().min(1).max(100),
  targetAmount: z.number().finite('targetAmount 必须为数字').positive('targetAmount 必须 > 0'),
  records: z.array(goalRecordSchema).default([]),
  status: goalStatusEnum.default('active'),
  color: z.string().regex(hexColorRegex, 'color 必须为 #RRGGBB').default('#3b82f6'),
  deadline: z.string().regex(dateRegex, 'deadline 必须为 YYYY-MM-DD'),
}).strict()

/** 更新 Goal（顶层字段。records 走专用子接口） */
export const updateGoalSchema = z.object({
  type: goalTypeEnum.optional(),
  title: z.string().min(1).max(100).optional(),
  targetAmount: z.number().finite().positive().optional(),
  status: goalStatusEnum.optional(),
  color: z.string().regex(hexColorRegex).optional(),
  deadline: z.string().regex(dateRegex).optional(),
}).strict()

/** 列表筛选 */
export const listGoalsQuerySchema = z.object({
  status: goalStatusEnum.optional(),
  type: goalTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
})

/** 追加 record */
export const addRecordSchema = goalRecordSchema

/** 更新 record 按索引 */
export const updateRecordSchema = goalRecordSchema

export type CreateGoalInput = z.infer<typeof createGoalSchema>
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>
export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>
export type AddRecordInput = z.infer<typeof addRecordSchema>
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>
