import { Router } from 'express'
import { requireAuth, type AuthedRequest } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  createGoalSchema,
  updateGoalSchema,
  listGoalsQuerySchema,
  addRecordSchema,
  updateRecordSchema,
} from '../schemas/goals.schema.js'
import {
  listGoals, getGoal, createGoal, updateGoal, deleteGoal,
  addGoalRecord, updateGoalRecord, deleteGoalRecord,
} from '../services/goals.service.js'
import { ok } from '../types/api.types.js'

export const goalsRouter = Router()
goalsRouter.use(requireAuth)

/** GET /api/goals — 列表（status/type 筛选） */
goalsRouter.get(
  '/',
  validate({ schema: listGoalsQuerySchema, target: 'query' }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await listGoals(req.userId!, req.query as any)
      res.json(ok(r))
    } catch (err) { next(err) }
  },
)

/** GET /api/goals/:id — 单条 */
goalsRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const r = await getGoal(req.userId!, req.params.id)
    res.json(ok(r))
  } catch (err) { next(err) }
})

/** POST /api/goals — 新增目标 */
goalsRouter.post(
  '/',
  validate({ schema: createGoalSchema }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await createGoal(req.userId!, req.body)
      res.status(201).json(ok(r))
    } catch (err) { next(err) }
  },
)

/** PATCH /api/goals/:id — 更新顶层字段 */
goalsRouter.patch(
  '/:id',
  validate({ schema: updateGoalSchema }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await updateGoal(req.userId!, req.params.id, req.body)
      res.json(ok(r))
    } catch (err) { next(err) }
  },
)

/** DELETE /api/goals/:id — 删除目标 */
goalsRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const r = await deleteGoal(req.userId!, req.params.id)
    res.json(ok(r))
  } catch (err) { next(err) }
})

// ===== 内嵌 record =====

/** POST /api/goals/:id/records — 追加一条 record */
goalsRouter.post(
  '/:id/records',
  validate({ schema: addRecordSchema }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await addGoalRecord(req.userId!, req.params.id, req.body)
      res.status(201).json(ok(r))
    } catch (err) { next(err) }
  },
)

/** PATCH /api/goals/:id/records/:index — 按索引更新 record */
goalsRouter.patch(
  '/:id/records/:index',
  validate({ schema: updateRecordSchema }),
  async (req: AuthedRequest, res, next) => {
    try {
      const idx = Number(req.params.index)
      const r = await updateGoalRecord(req.userId!, req.params.id, idx, req.body)
      res.json(ok(r))
    } catch (err) { next(err) }
  },
)

/** DELETE /api/goals/:id/records/:index — 按索引删除 record */
goalsRouter.delete('/:id/records/:index', async (req: AuthedRequest, res, next) => {
  try {
    const idx = Number(req.params.index)
    const r = await deleteGoalRecord(req.userId!, req.params.id, idx)
    res.json(ok(r))
  } catch (err) { next(err) }
})
