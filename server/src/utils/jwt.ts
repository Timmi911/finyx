import jwt, { type JwtPayload } from 'jsonwebtoken'
import { config } from '../config.js'

export interface TokenPayload {
  sub: string // user id
  type: 'access' | 'refresh'
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access' } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: config.jwtExpires,
  })
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: config.refreshExpires,
  })
}

export function issueTokens(userId: string): { accessToken: string; refreshToken: string } {
  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
  }
}

export type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'token_expired' | 'token_invalid' }

export function verifyToken(token: string, expectedType: 'access' | 'refresh'): VerifyResult {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload & TokenPayload
    if (payload.type !== expectedType) {
      return { ok: false, reason: 'token_invalid' }
    }
    if (!payload.sub) {
      return { ok: false, reason: 'token_invalid' }
    }
    return { ok: true, userId: payload.sub }
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      return { ok: false, reason: 'token_expired' }
    }
    return { ok: false, reason: 'token_invalid' }
  }
}
