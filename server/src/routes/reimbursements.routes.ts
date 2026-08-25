import { Router } from 'express'
import { requireAuth, type AuthedRequest } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  createReimbSchema,
  listReimbQuerySchema,
  updateReimbSchema,
} from '../schemas/reimbursements.schema.js'
import {
  createReimbursement,
  deleteReimbursement,
  getReimbursement,
  listReimbursements,
  updateReimbursement,
} from '../services/reimbursements.service.js'
import { ok } from '../types/api.types.js'
import type { Reimbursement } from '../types/domain.types.js'

export const reimbursementsRouter = Router()

reimbursementsRouter.use(requireAuth)

/** GET /api/reimbursements — 列表 + 筛选 + 游标分页 */
reimbursementsRouter.get('/', validate({ schema: listReimbQuerySchema, target: 'query' }), async (req: AuthedRequest, res, next) => {
  try {
    const result = await listReimbursements(req.userId!, req.query as any)
    res.json(ok(result))
  } catch (err) { next(err) }
})

/** GET /api/reimbursements/:id — 单条 */
reimbursementsRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const r: Reimbursement = await getReimbursement(req.userId!, req.params.id)
    res.json(ok(r))
  } catch (err) { next(err) }
})

/** POST /api/reimbursements — 新增（副作用：关联 bills status=pending） */
reimbursementsRouter.post('/', validate({ schema: createReimbSchema }), async (req: AuthedRequest, res, next) => {
  try {
    const r: Reimbursement = await createReimbursement(req.userId!, req.body)
    res.status(201).json(ok(r))
  } catch (err) { next(err) }
})

/** PATCH /api/reimbursements/:id — 更新（副作用：status/billIds 联动 bills） */
reimbursementsRouter.patch('/:id', validate({ schema: updateReimbSchema }), async (req: AuthedRequest, res, next) => {
  try {
    const r: Reimbursement = await updateReimbursement(req.userId!, req.params.id, req.body)
    res.json(ok(r))
  } catch (err) { next(err) }
})

/** DELETE /api/reimbursements/:id — 删除（副作用：关联 bills 回滚 archived + reimbursementId=null） */
reimbursementsRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const result = await deleteReimbursement(req.userId!, req.params.id)
    res.json(ok(result))
  } catch (err) { next(err) }
})
