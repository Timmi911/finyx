/**
 * 认证流程端到端自动化测试
 *
 * 覆盖场景：
 *   1. 未登录访问首页 → 守卫重定向到 /login
 *   2. 注册新用户 → 自动跳转到首页 /（Dashboard）
 *   3. 刷新页面 → 保持登录态，仍在 /
 *   4. 登出（清 finyx-auth）→ 回到 /login
 *   5. 重新登录 → 跳转到首页 /
 *
 * 运行：npm run e2e:auth
 *
 * 服务器生命周期：脚本自动检测 :3000/:5174 是否已启动；
 *   未启动则自动拉起 dev 服务器并在结束时关闭；已启动则复用，不干预。
 * 浏览器：调用系统已装的 Chrome（channel: 'chrome'），无需下载 Chromium。
 */
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const FINYX_ROOT = resolve(import.meta.dirname, '..')
const SERVER_DIR = resolve(FINYX_ROOT, 'server')
const SCREENSHOT_DIR = resolve(import.meta.dirname, 'screenshots')

const BACKEND_URL = 'http://localhost:3000'
const FRONTEND_URL = 'http://localhost:5174'
const SERVER_READY_TIMEOUT = 90_000   // Vite 冷启动可能要 ~50s
const NAV_TIMEOUT = 20_000

let spawned = []
let browser

function log(msg) { console.log(`[e2e] ${msg}`) }
function fail(msg) { throw new Error(`[e2e FAIL] ${msg}`) }

async function isUp(url) {
  try { await fetch(url, { method: 'GET' }); return true } catch { return false }
}

/** 拉起一个 dev 服务器，轮询直到其 HTTP 端口就绪 */
function startServer(label, cwd, readyUrl) {
  return new Promise((resolveP, rejectP) => {
    // Windows 上 npm 实为 npm.cmd，需经 cmd.exe /c 启动；直接 spawn .cmd 会 EINVAL
    const isWin = process.platform === 'win32'
    const cmd = isWin ? 'cmd.exe' : 'npm'
    const args = isWin ? ['/c', 'npm', 'run', 'dev'] : ['run', 'dev']
    const proc = spawn(cmd, args, { cwd, windowsHide: true })
    const logs = []
    const onOut = d => { const s = String(d).trim(); if (s) { logs.push(s); if (process.env.E2E_VERBOSE) console.log(`[${label}] ${s}`) } }
    proc.stdout.on('data', onOut); proc.stderr.on('data', onOut)
    proc.on('error', err => rejectP(new Error(`${label} 启动失败: ${err.message}`)))

    const start = Date.now()
    const poll = async () => {
      if (await isUp(readyUrl)) return resolveP(proc)
      if (Date.now() - start > SERVER_READY_TIMEOUT) {
        return rejectP(new Error(`${label} ${SERVER_READY_TIMEOUT}ms 内未就绪。日志:\n${logs.slice(-20).join('\n')}`))
      }
      setTimeout(poll, 1000)
    }
    poll()
  })
}

async function ensureServers() {
  const beUp = await isUp(BACKEND_URL)
  const feUp = await isUp(FRONTEND_URL)
  if (beUp && feUp) { log('检测到 dev 服务器已在运行，复用'); return }
  if (!beUp) { log('启动后端 dev 服务器...'); spawned.push(await startServer('backend', SERVER_DIR, BACKEND_URL)) }
  if (!feUp) { log('启动前端 Vite dev 服务器...'); spawned.push(await startServer('frontend', FINYX_ROOT, FRONTEND_URL)) }
  log('dev 服务器就绪')
}

function cleanup() {
  for (const p of spawned) {
    try {
      // Windows: 杀进程树
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(p.pid), '/f', '/t'], { windowsHide: true })
      } else {
        p.kill('SIGTERM')
      }
    } catch { /* ignore */ }
  }
  spawned = []
  if (browser) { try { browser.close() } catch { /* ignore */ } }
}

async function screenshot(page, name) {
  try {
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, `${name}.png`), fullPage: true })
    log(`截图已保存: e2e/screenshots/${name}.png`)
  } catch { /* ignore */ }
}

/** 断言当前 URL 满足条件，否则截图并抛错 */
async function assertUrl(page, regex, stepName) {
  const url = page.url()
  if (!regex.test(url)) {
    await screenshot(page, stepName)
    fail(`${stepName}: 期望 URL 匹配 ${regex}, 实际 ${url}`)
  }
  log(`${stepName} ✓ URL=${url}`)
}

async function fillRegister(page, name, email, password) {
  await page.getByPlaceholder('你想怎么被称呼？').fill(name)
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('至少 6 位').first().fill(password)
  await page.getByPlaceholder('再次输入密码').fill(password)
}

async function fillLogin(page, email, password) {
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('至少 6 位').fill(password)
}

async function run() {
  await ensureServers()
  // Docker 环境：用 Playwright 内置 Chromium；本地：用系统 Chrome
  const channel = process.env.E2E_BROWSER_CHANNEL || 'chrome'
  browser = await chromium.launch({ channel: channel === 'chromium' ? undefined : channel, headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(NAV_TIMEOUT)

  const email = `e2e_${Date.now()}@test.com`
  const password = 'test123456'
  log(`测试账号: ${email}`)

  // 步骤 1：未登录访问首页 → 应被守卫重定向到 /login
  await page.goto(`${FRONTEND_URL}/#/`)
  await page.waitForURL(/\/#\/login/, { timeout: NAV_TIMEOUT })
  await assertUrl(page, /\/#\/login/, 'step1-unauthed-redirect')

  // 步骤 2：注册新用户 → 应跳转到首页 /
  await page.goto(`${FRONTEND_URL}/#/register`)
  await page.waitForLoadState('domcontentloaded')
  await fillRegister(page, 'E2E测试员', email, password)
  await page.getByRole('button', { name: '创建账号' }).click()
  await page.waitForURL(/\/#\/$/, { timeout: NAV_TIMEOUT })
  await assertUrl(page, /\/#\/$/, 'step2-register-redirect')

  // 步骤 3：刷新页面 → 应保持登录态仍在 /
  await page.reload()
  await page.waitForURL(/\/#\/$/, { timeout: NAV_TIMEOUT })
  await assertUrl(page, /\/#\/$/, 'step3-refresh-persisted')

  // 步骤 4：登出（清 localStorage.finyx-auth）→ 应回到 /login
  //   注意：必须 reload 整页，否则应用内存态仍保留 token，守卫不会重判
  await page.evaluate(() => localStorage.removeItem('finyx-auth'))
  await page.reload()
  await page.waitForURL(/\/#\/login/, { timeout: NAV_TIMEOUT })
  await assertUrl(page, /\/#\/login/, 'step4-logout-redirect')

  // 步骤 5：重新登录 → 应跳转到首页 /
  await fillLogin(page, email, password)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL(/\/#\/$/, { timeout: NAV_TIMEOUT })
  await assertUrl(page, /\/#\/$/, 'step5-login-redirect')

  await context.close()
  log('全部 5 步通过 ✅')
}

process.on('SIGINT', () => { cleanup(); process.exit(130) })

run().catch(err => {
  console.error(err.message)
  cleanup()
  process.exit(1)
}).then(() => {
  cleanup()
  process.exit(0)
})
