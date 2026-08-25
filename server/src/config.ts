import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'moneymap-dev-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES || '15m',
  refreshExpires: process.env.REFRESH_EXPIRES || '7d',
  dataFile: path.resolve(__dirname, '../data/database.json'),
} as const
