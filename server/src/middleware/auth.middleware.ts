import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'
import { loadDb } from '../db.js'
import { ApiError } from '../types/api.types.js'

export interface AuthedRequest extends Request {
  userId?: string
}

/** requireAuth：从 Authorization: Bearer <token> 解析并校验 access token */
export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError('token_invalid', '未携带访问令牌', 401)
    }
    const token = header.slice('Bearer '.length).trim()
    const result = verifyToken(token, 'access')
    if (!result.ok) {
      // 区分过期与无效，前端据此决定是否尝试 refresh
      throw new ApiError(result.reason, result.reason === 'token_expired' ? '访问令牌已过期' : '访问令牌无效', 401)
    }
    // 确认用户仍存在
    const db = await loadDb()
    const user = db.users.find(u => u.id === result.userId)
    if (!user) {
      throw new ApiError('token_invalid', '用户不存在', 401)
    }
    req.userId = user.id
    next()
  } catch (err) {
    next(err)
  }
}
