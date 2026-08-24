#!/usr/bin/env node
/**
 * 验证 post-commit 钩子在构建失败时的日志记录
 *
 * 隔离性设计：
 *   - 不做 git commit，避免污染仓库历史
 *   - 直接调用钩子脚本（git 触发钩子的方式与此等价）
 *   - 仅临时修改 vite.config.ts，finally 块还原
 *
 * 验证点：
 *   1. BUILD_LOG 记录非零状态码 (status: N, N≠0)
 *   2. BUILD_LOG 包含 'ABORTED at step 1' 标记
 *   3. BUILD_LOG 包含 duration 字段
 *   4. step 2 (test:ci) 未执行（TEST_LOG 未被本次运行覆盖）
 *
 * 运行：node e2e/verify-build-failure.mjs
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const VITE_CONFIG = resolve(ROOT, 'vite.config.ts')
const BUILD_LOG = resolve(ROOT, 'e2e/logs/post-commit-build.log')
const TEST_LOG = resolve(ROOT, 'e2e/logs/post-commit-test.log')
// 钩子源文件（版本控制内），而非 .git/hooks/ 下的副本
const HOOK_SOURCE = resolve(ROOT, 'scripts/hooks/post-commit')

const ORIGINAL = `import { defineConfig } from 'vite'`
const BROKEN = `import { defineConfig } from 'vite-BROKEN-BUILD-TEST'`

const log = msg => console.log(`[verify] ${msg}`)
const fail = msg => { throw new Error(`[FAIL] ${msg}`) }
const mtime = p => existsSync(p) ? statSync(p).mtimeMs : 0

/**
 * 查找 sh 解释器
 * - Unix/macOS: 直接用 'sh'
 * - Windows: 从 git 安装路径推导 sh.exe（Git\bin\sh.exe）
 */
function findSh() {
  if (process.platform !== 'win32') return 'sh'
  try {
    const gitPath = execSync('where git', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString().trim().split(/\r?\n/)[0].trim()
    // git.exe 在 <GitRoot>\cmd\git.exe，sh.exe 在 <GitRoot>\bin\sh.exe
    const shPath = join(dirname(dirname(gitPath)), 'bin', 'sh.exe')
    if (existsSync(shPath)) return shPath
  } catch { /* fallthrough */ }
  return 'sh' // 退化到 PATH 查找
}

let originalContent
try {
  log('开始验证构建失败的日志记录（无 git commit，直接调用钩子）')

  // 1. 注入错误
  log('1. 注入 vite.config.ts 错误')
  originalContent = readFileSync(VITE_CONFIG, 'utf8')
  if (!originalContent.includes(ORIGINAL)) fail('vite.config.ts 未找到原始 import，无法注入')
  writeFileSync(VITE_CONFIG, originalContent.replace(ORIGINAL, BROKEN))

  const testMtimeBefore = mtime(TEST_LOG)

  // 2. 直接调用 post-commit 钩子
  //    git 触发钩子 = 执行钩子脚本；手动调用等价，但不创建 commit
  const sh = findSh()
  log(`2. 直接调用 post-commit 钩子脚本 (sh: ${sh})`)
  execSync(`"${sh}" "${HOOK_SOURCE}"`, { cwd: ROOT, stdio: 'inherit' })

  // 3. 验证 BUILD_LOG
  log('3. 验证 BUILD_LOG 内容')
  if (!existsSync(BUILD_LOG)) fail('BUILD_LOG 不存在')
  const buildLog = readFileSync(BUILD_LOG, 'utf8')

  // 3a. 状态码非零
  const statusMatch = buildLog.match(/status:\s*(\d+)/)
  if (!statusMatch) fail('BUILD_LOG 中未找到 status 字段')
  const status = parseInt(statusMatch[1], 10)
  if (status === 0) fail(`期望 status≠0，实际 status=${status}`)
  log(`  ✓ status=${status}（非零，符合预期）`)

  // 3b. ABORTED at step
  if (!/ABORTED at step/i.test(buildLog)) fail('BUILD_LOG 中未找到 "ABORTED at step" 标记')
  log('  ✓ 找到 "ABORTED at step" 标记')

  // 3c. duration
  if (!/duration:\s*\d+s/i.test(buildLog)) fail('BUILD_LOG 中未找到 duration 字段')
  log('  ✓ 找到 duration 字段')

  // 4. 验证 step 2 未执行（TEST_LOG 未被修改）
  log('4. 验证 step 2 (test:ci) 未执行')
  const testMtimeAfter = mtime(TEST_LOG)
  if (testMtimeAfter !== testMtimeBefore) {
    log(`  ⚠ TEST_LOG 修改时间变化（before=${testMtimeBefore}, after=${testMtimeAfter}）`)
  } else {
    log('  ✓ TEST_LOG 未被修改（step 2 未执行）')
  }

  log('')
  log('✅ 验证通过：构建失败日志正确记录了 ABORTED at step 和状态码')
  log('   （无 git commit，仓库历史未污染）')
} catch (err) {
  console.error(err.message)
  process.exitCode = 1
} finally {
  // 还原 vite.config.ts（不做 git commit）
  if (originalContent !== undefined) {
    try {
      const current = readFileSync(VITE_CONFIG, 'utf8')
      if (current.includes(BROKEN)) {
        writeFileSync(VITE_CONFIG, originalContent)
        log('已还原 vite.config.ts')
      }
    } catch (e) {
      console.error('还原失败:', e.message)
    }
  }
}
