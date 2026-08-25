import { Router } from 'express'
import { requireAuth, type AuthedRequest } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  createAccountSchema,
  listAccountsQuerySchema,
  updateAccountSchema,
} from '../schemas/accounts.schema.js'
import {
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
  updateAccount,
} from '../services/accounts.service.js'
import { ok } from '../types/api.types.js'
import type { Account } from '../types/domain.types.js'

export const accountsRouter = Router()

accountsRouter.use(requireAuth)

/** GET /api/accounts — 列表 + 筛选（tier/kind） */
accountsRouter.get('/', validate({ schema: listAccountsQuerySchema, target: 'query' }), async (req: AuthedRequest, res, next) => {
  try {
    const result = await listAccounts(req.userId!, req.query as any)
    res.json(ok(result))
  } catch (err) { next(err) }
})

/** GET /api/accounts/:id — 单条 */
accountsRouter.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const acc: Account = await getAccount(req.userId!, req.params.id)
    res.json(ok(acc))
  } catch (err) { next(err) }
})

/** POST /api/accounts — 新增 */
accountsRouter.post('/', validate({ schema: createAccountSchema }), async (req: AuthedRequest, res, next) => {
  try {
    const acc: Account = await createAccount(req.userId!, req.body)
    res.status(201).json(ok(acc))
  } catch (err) { next(err) }
})

/** PATCH /api/accounts/:id — 更新 */
accountsRouter.patch('/:id', validate({ schema: updateAccountSchema }), async (req: AuthedRequest, res, next) => {
  try {
    const acc: Account = await updateAccount(req.userId!, req.params.id, req.body)
    res.json(ok(acc))
  } catch (err) { next(err) }
})

/** DELETE /api/accounts/:id — 删除（级联子账户 + bills.accountId=null） */
accountsRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const result = await deleteAccount(req.userId!, req.params.id)
    res.json(ok(result))
  } catch (err) { next(err) }
})
