import bcrypt from 'bcryptjs'
import { loadDb, saveDb } from '../db.js'
import { generateId } from '../utils/id.js'
import { issueTokens, verifyToken } from '../utils/jwt.js'
import { ApiError } from '../types/api.types.js'
import type { PublicUser, User } from '../types/domain.types.js'
import type { RegisterInput, LoginInput, RefreshInput } from '../schemas/auth.schema.js'

function toPublicUser(u: User): PublicUser {
  // 显式构造，绝不携带 passwordHash
  return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt }
}

export interface AuthResult {
  user: PublicUser
  accessToken: string
  refreshToken: string
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const db = await loadDb()
  const email = input.email.toLowerCase()
  if (db.users.some(u => u.email.toLowerCase() === email)) {
    throw new ApiError('email_taken', '该邮箱已被注册', 409)
  }
  const passwordHash = await bcrypt.hash(input.password, 10)
  const user: User = {
    id: generateId('u'),
    name: input.name.trim(),
    email,
    passwordHash,
    createdAt: Date.now(),
  }
  db.users.push(user)
  await saveDb()
  const tokens = issueTokens(user.id)
  return { user: toPublicUser(user), ...tokens }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const db = await loadDb()
  const email = input.email.toLowerCase()
  const user = db.users.find(u => u.email.toLowerCase() === email)
  if (!user) {
    throw new ApiError('invalid_credentials', '邮箱或密码错误', 401)
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash)
  if (!ok) {
    throw new ApiError('invalid_credentials', '邮箱或密码错误', 401)
  }
  const tokens = issueTokens(user.id)
  return { user: toPublicUser(user), ...tokens }
}

export async function getMe(userId: string): Promise<PublicUser> {
  const db = await loadDb()
  const user = db.users.find(u => u.id === userId)
  if (!user) {
    throw new ApiError('user_not_found', '用户不存在', 404)
  }
  return toPublicUser(user)
}

export async function refresh(input: RefreshInput): Promise<{ accessToken: string; refreshToken: string }> {
  const result = verifyToken(input.refreshToken, 'refresh')
  if (!result.ok) {
    throw new ApiError(result.reason, result.reason === 'token_expired' ? '刷新令牌已过期，请重新登录' : '刷新令牌无效', 401)
  }
  const db = await loadDb()
  const user = db.users.find(u => u.id === result.userId)
  if (!user) {
    throw new ApiError('token_invalid', '用户不存在', 401)
  }
  // rotate：每次刷新签发新对
  return issueTokens(user.id)
}
