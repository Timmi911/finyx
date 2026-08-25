import { Router } from 'express'
import { requireAuth, type AuthedRequest } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  createFamilySchema,
  listFamilyQuerySchema,
  updateFamilySchema,
} from '../schemas/family.schema.js'
import {
  createFamilyMember,
  deleteFamilyMember,
  getFamilyMember,
  listFamily,
  updateFamilyMember,
} from '../services/family.service.js'
import { ok } from '../types/api.types.js'
import type { FamilyMember } from '../types/domain.types.js'

export const familyRouter = Router()

familyRouter.use(requireAuth)

/** GET /api/family — 列表 + 筛选（role） */
familyRouter.get('/', validate({ schema: listFamilyQuerySchema, target: 'query' }), async (req: AuthedRequest, res, next) => {
  try {
    const result = await listFamily(req.userId!, req.query as any)
    res.json(ok(result))
  } catch (err) { next(err) }
})

/** GET /api/family/:id — 单条 */
familyRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const m: FamilyMember = await getFamilyMember(req.userId!, req.params.id)
    res.json(ok(m))
  } catch (err) { next(err) }
})

/** POST /api/family — 新增 */
familyRouter.post('/', validate({ schema: createFamilySchema }), async (req: AuthedRequest, res, next) => {
  try {
    const m: FamilyMember = await createFamilyMember(req.userId!, req.body)
    res.status(201).json(ok(m))
  } catch (err) { next(err) }
})

/** PATCH /api/family/:id — 更新 */
familyRouter.patch('/:id', validate({ schema: updateFamilySchema }), async (req: AuthedRequest, res, next) => {
  try {
    const m: FamilyMember = await updateFamilyMember(req.userId!, req.params.id, req.body)
    res.json(ok(m))
  } catch (err) { next(err) }
})

/** DELETE /api/family/:id — 删除 */
familyRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const result = await deleteFamilyMember(req.userId!, req.params.id)
    res.json(ok(result))
  } catch (err) { next(err) }
})
