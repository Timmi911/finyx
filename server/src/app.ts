import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.routes.js'
import { billsRouter } from './routes/bills.routes.js'
import { reimbursementsRouter } from './routes/reimbursements.routes.js'
import { accountsRouter } from './routes/accounts.routes.js'
import { familyRouter } from './routes/family.routes.js'
import { incomesRouter } from './routes/incomes.routes.js'
import { goalsRouter } from './routes/goals.routes.js'
import { errorHandler, notFound } from './middleware/error.middleware.js'
import { loadDb } from './db.js'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  // 健康检查
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  // 业务路由
  app.use('/api/auth', authRouter)
  app.use('/api/bills', billsRouter)
  app.use('/api/reimbursements', reimbursementsRouter)
  app.use('/api/accounts', accountsRouter)
  app.use('/api/family', familyRouter)
  app.use('/api/incomes', incomesRouter)
  app.use('/api/goals', goalsRouter)

  app.use(notFound)
  app.use(errorHandler)
  return app
}

/** 首次启动时确保 db 文件存在 */
export async function ensureDb() {
  await loadDb()
}
