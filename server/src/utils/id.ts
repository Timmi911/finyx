/** 与前端 finyx uid() 一致的 base36 字符串 ID 生成 */
export function generateId(prefix?: string): string {
  const body = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  return prefix ? `${prefix}_${body}` : body
}
