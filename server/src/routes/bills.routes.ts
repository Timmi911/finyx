import { Router } from 'express'
import { requireAuth, type AuthedRequest } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  batchImportSchema,
  createBillSchema,
  listBillsQuerySchema,
  updateBillSchema,
} from '../schemas/bills.schema.js'
import {
  batchImportBills,
  createBill,
  deleteBill,
  getBill,
  listBills,
  updateBill,
} from '../services/bills.service.js'
import { ok } from '../types/api.types.js'
import type { Bill } from '../types/domain.types.js'

export const billsRouter = Router()

billsRouter.use(requireAuth)

/** GET /api/bills — 列表 + 筛选 + 游标分页 */
billsRouter.get('/', validate({ schema: listBillsQuerySchema, target: 'query' }), async (req: AuthedRequest, res, next) => {
  try {
    const result = await listBills(req.userId!, req.query as any)
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
})

/** POST /api/bills/batch — 批量导入（必须在 :id 路由之前注册） */
billsRouter.post('/batch', validate({ schema: batchImportSchema }), async (req: AuthedRequest, res, next) => {
  try {
    const result = await batchImportBills(req.userId!, req.body)
    res.status(201).json(ok(result))
  } catch (err) {
    next(err)
  }
})

/** GET /api/bills/:id — 单条 */
billsRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const bill: Bill = await getBill(req.userId!, req.params.id)
    res.json(ok(bill))
  } catch (err) {
    next(err)
  }
})

/** POST /api/bills — 新增 */
billsRouter.post('/', validate({ schema: createBillSchema }), async (req: AuthedRequest, res, next) => {
  try {
    const bill: Bill = await createBill(req.userId!, req.body)
    res.status(201).json(ok(bill))
  } catch (err) {
    next(err)
  }
})

/** PATCH /api/bills/:id — 更新 */
billsRouter.patch('/:id', validate({ schema: updateBillSchema }), async (req: AuthedRequest, res, next) => {
  try {
    const bill: Bill = await updateBill(req.userId!, req.params.id, req.body)
    res.json(ok(bill))
  } catch (err) {
    next(err)
  }
})

/** DELETE /api/bills/:id — 删除 + 同步清理 reimbursements */
billsRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const result = await deleteBill(req.userId!, req.params.id)
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
})
