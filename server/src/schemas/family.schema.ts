import { z } from 'zod'

const familyRoleEnum = z.enum(['parent', 'child'])

/** 创建家庭成员 */
export const createFamilySchema = z.object({
  name: z.string().min(1).max(30),
  role: familyRoleEnum.default('child'),
  avatar: z.string().default('🧒'),
  color: z.string().default('#a78bfa'),
  linkedAccountIds: z.array(z.string()).default([]),
}).strict()

/** 更新家庭成员 */
export const updateFamilySchema = z.object({
  name: z.string().min(1).max(30).optional(),
  role: familyRoleEnum.optional(),
  avatar: z.string().optional(),
  color: z.string().optional(),
  linkedAccountIds: z.array(z.string()).optional(),
}).strict()

/** 列表筛选 */
export const listFamilyQuerySchema = z.object({
  role: familyRoleEnum.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
})

export type CreateFamilyInput = z.infer<typeof createFamilySchema>
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>
export type ListFamilyQuery = z.infer<typeof listFamilyQuerySchema>
