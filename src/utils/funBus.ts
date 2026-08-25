import type { FunFeatureKey } from '../types'
import { store } from '../store'

type Handler = (key: FunFeatureKey) => Promise<boolean>
let busHandler: Handler | null = null

export function setUnlockHandler(h: Handler | null) {
  busHandler = h
}

export function requestUnlock(key: FunFeatureKey): Promise<boolean> {
  // 已解锁直接放行
  if (store.isFunUnlocked(key)) return Promise.resolve(true)
  if (busHandler) return busHandler(key)
  return Promise.resolve(false)
}
