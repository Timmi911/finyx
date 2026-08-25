import { Router } from 'express'
import { requireAuth, type AuthedRequest } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  createIncomeRecordSchema,
  updateIncomeRecordSchema,
  listIncomeRecordsQuerySchema,
  createCustomSourceSchema,
  updateCustomSourceSchema,
  upsertSourceOverrideSchema,
  deleteSourceOverrideQuerySchema,
} from '../schemas/incomes.schema.js'
import {
  listIncomeRecords, getIncomeRecord, createIncomeRecord,
  updateIncomeRecord, deleteIncomeRecord,
  listCustomSources, createCustomSource, updateCustomSource, deleteCustomSource,
  listSourceOverrides, upsertSourceOverride, resetSourceOverride,
} from '../services/incomes.service.js'
import { ok } from '../types/api.types.js'

export const incomesRouter = Router()
incomesRouter.use(requireAuth)

// ==================== Income Records ====================

/** GET /api/incomes/records — 列表（筛选 month/source） */
incomesRouter.get(
  '/records',
  validate({ schema: listIncomeRecordsQuerySchema, target: 'query' }),
  async (req: AuthedRequest, res, next) => {
    try {
      const result = await listIncomeRecords(req.userId!, req.query as any)
      res.json(ok(result))
    } catch (err) { next(err) }
  },
)

/** GET /api/incomes/records/:id — 单条 */
incomesRouter.get('/records/:id', async (req: AuthedRequest, res, next) => {
  try {
    const r = await getIncomeRecord(req.userId!, req.params.id)
    res.json(ok(r))
  } catch (err) { next(err) }
})

/** POST /api/incomes/records — 新增 */
incomesRouter.post(
  '/records',
  validate({ schema: createIncomeRecordSchema }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await createIncomeRecord(req.userId!, req.body)
      res.status(201).json(ok(r))
    } catch (err) { next(err) }
  },
)

/** PATCH /api/incomes/records/:id — 更新 */
incomesRouter.patch(
  '/records/:id',
  validate({ schema: updateIncomeRecordSchema }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await updateIncomeRecord(req.userId!, req.params.id, req.body)
      res.json(ok(r))
    } catch (err) { next(err) }
  },
)

/** DELETE /api/incomes/records/:id — 删除 */
incomesRouter.delete('/records/:id', async (req: AuthedRequest, res, next) => {
  try {
    const r = await deleteIncomeRecord(req.userId!, req.params.id)
    res.json(ok(r))
  } catch (err) { next(err) }
})

// ==================== Custom Income Sources ====================

/** GET /api/incomes/sources — 自定义来源列表 */
incomesRouter.get('/sources', async (req: AuthedRequest, res, next) => {
  try {
    const r = await listCustomSources(req.userId!)
    res.json(ok(r))
  } catch (err) { next(err) }
})

/** POST /api/incomes/sources — 新增自定义来源 */
incomesRouter.post(
  '/sources',
  validate({ schema: createCustomSourceSchema }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await createCustomSource(req.userId!, req.body)
      res.status(201).json(ok(r))
    } catch (err) { next(err) }
  },
)

/** PATCH /api/incomes/sources/:id — 更新自定义来源 */
incomesRouter.patch(
  '/sources/:id',
  validate({ schema: updateCustomSourceSchema }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await updateCustomSource(req.userId!, req.params.id, req.body)
      res.json(ok(r))
    } catch (err) { next(err) }
  },
)

/** DELETE /api/incomes/sources/:id — 删除自定义来源（被引用时拒绝） */
incomesRouter.delete('/sources/:id', async (req: AuthedRequest, res, next) => {
  try {
    const r = await deleteCustomSource(req.userId!, req.params.id)
    res.json(ok(r))
  } catch (err) { next(err) }
})

// ==================== Source Overrides（预设来源 label/color 覆盖） ====================

/** GET /api/incomes/overrides — 当前用户所有覆盖项 */
incomesRouter.get('/overrides', async (req: AuthedRequest, res, next) => {
  try {
    const r = await listSourceOverrides(req.userId!)
    res.json(ok(r))
  } catch (err) { next(err) }
})

/** PUT /api/incomes/overrides — upsert 某预设来源的覆盖（body.value 标识目标） */
incomesRouter.put(
  '/overrides',
  validate({ schema: upsertSourceOverrideSchema }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await upsertSourceOverride(req.userId!, req.body)
      res.json(ok(r))
    } catch (err) { next(err) }
  },
)

/** DELETE /api/incomes/overrides?value=xxx — 重置（取消）某预设来源覆盖 */
incomesRouter.delete(
  '/overrides',
  validate({ schema: deleteSourceOverrideQuerySchema, target: 'query' }),
  async (req: AuthedRequest, res, next) => {
    try {
      const r = await resetSourceOverride(req.userId!, (req.query as any).value)
      res.json(ok(r))
    } catch (err) { next(err) }
  },
)
