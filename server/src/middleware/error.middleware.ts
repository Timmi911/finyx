import type { Request, Response, NextFunction } from 'express'
import { ApiError, type ApiErrorBody } from '../types/api.types.js'
import { ZodError } from 'zod'

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: '资源不存在' } } satisfies ApiErrorBody)
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    const body: ApiErrorBody = { error: { code: err.code, message: err.message } }
    if (err.details !== undefined) body.error.details = err.details
    res.status(err.status).json(body)
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'validation_error', message: '请求参数校验失败', details: err.issues },
    } satisfies ApiErrorBody)
    return
  }
  console.error('[unhandled error]', err)
  res.status(500).json({ error: { code: 'internal_error', message: '服务器内部错误' } } satisfies ApiErrorBody)
}
