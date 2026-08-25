import { Router } from 'express'
import { validate } from '../middleware/validate.middleware.js'
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth.schema.js'
import { getMe, login, refresh, register } from '../services/auth.service.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.middleware.js'
import { ok } from '../types/api.types.js'

export const authRouter = Router()

authRouter.post('/register', validate({ schema: registerSchema }), async (req, res, next) => {
  try {
    const result = await register(req.body)
    res.status(201).json(ok(result))
  } catch (err) {
    next(err)
  }
})

authRouter.post('/login', validate({ schema: loginSchema }), async (req, res, next) => {
  try {
    const result = await login(req.body)
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await getMe(req.userId!)
    res.json(ok(user))
  } catch (err) {
    next(err)
  }
})

authRouter.post('/refresh', validate({ schema: refreshSchema }), async (req, res, next) => {
  try {
    const tokens = await refresh(req.body)
    res.json(ok(tokens))
  } catch (err) {
    next(err)
  }
})
