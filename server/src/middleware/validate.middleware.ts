import type { Request, Response, NextFunction } from 'express'
import type { ZodTypeAny, z } from 'zod'

type Target = 'body' | 'query' | 'params'

interface ValidateOptions<T extends ZodTypeAny> {
  schema: T
  target?: Target
}

/** 校验工厂：默认校验 body，成功后用解析结果覆盖 req.body */
export function validate<T extends ZodTypeAny>(opts: ValidateOptions<T>) {
  const target: Target = opts.target ?? 'body'
  return (req: Request, _res: Response, next: NextFunction) => {
    const source = target === 'body' ? req.body : target === 'query' ? req.query : req.params
    const parsed = opts.schema.parse(source) as z.infer<T>
    if (target === 'body') req.body = parsed
    else if (target === 'query') (req as Request & { query: typeof parsed }).query = parsed
    else (req as Request & { params: typeof parsed }).params = parsed
    next()
  }
}
