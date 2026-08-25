import { config } from './config.js'
import { createApp, ensureDb } from './app.js'

async function main() {
  await ensureDb()
  const app = createApp()
  app.listen(config.port, () => {
    console.log(`[moneymap-server] listening on http://localhost:${config.port}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
