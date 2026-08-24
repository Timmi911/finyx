#!/usr/bin/env node
/**
 * 安装 git 钩子到本地仓库 .git/hooks/ 目录
 *
 * 把 scripts/hooks/ 下的钩子源文件复制到 .git/hooks/，并设置可执行权限。
 * 用于新克隆环境初始化，或钩子源文件更新后重新部署。
 *
 * 运行：npm run install:hooks
 */
import { copyFileSync, chmodSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const SRC_DIR = resolve(ROOT, 'scripts/hooks')
const GIT_DIR = resolve(ROOT, '.git')
const DST_DIR = resolve(GIT_DIR, 'hooks')

function log(msg) { console.log(`[hooks] ${msg}`) }
function fail(msg) { throw new Error(`[hooks FAIL] ${msg}`) }

/**
 * 定位指定 cwd 对应的 git hooks 目录（支持 worktree / submodule）
 *
 * 使用 `git rev-parse --git-path hooks` 让 git 自行解析真实路径，
 * 避免硬编码 `.git/hooks` 在 worktree / submodule 等非标准布局下失效。
 *
 * @param {string} [cwd=ROOT] - 仓库内任意目录
 * @returns {string|null} hooks 目录绝对路径，非 git 仓库返回 null
 */
export function findHooksDir(cwd = ROOT) {
  try {
    const out = execSync('git rev-parse --git-path hooks', {
      cwd,
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString().trim()
    return resolve(cwd, out)
  } catch {
    return null
  }
}

/**
 * 把 SRC_DIR 下的钩子安装到指定目标目录
 * @param {string} targetDir - .git/hooks 绝对路径
 * @returns {string[]} 已安装的钩子文件名列表
 */
export function installTo(targetDir) {
  if (!existsSync(targetDir)) {
    try { mkdirSync(targetDir, { recursive: true }) } catch { /* ignore */ }
  }
  if (!existsSync(targetDir)) {
    fail(`未找到 git hooks 目录: ${targetDir}（请在 git 仓库内运行）`)
  }
  if (!existsSync(SRC_DIR)) {
    fail(`钩子源目录不存在: ${SRC_DIR}`)
  }

  const hooks = readdirSync(SRC_DIR).filter(f => !f.endsWith('.md') && !f.startsWith('.'))
  if (hooks.length === 0) fail('未找到钩子源文件')

  const installed = []
  for (const hook of hooks) {
    const src = join(SRC_DIR, hook)
    const dst = join(targetDir, hook)
    copyFileSync(src, dst)
    // Windows 下 chmod 无效，但 git 会通过 .gitattributes 或直接执行 .sh
    try { chmodSync(dst, 0o755) } catch { /* Windows: 忽略 */ }
    installed.push(hook)
  }
  return installed
}

/**
 * 主流程：解析路径 + 安装 + 打印日志
 */
function main() {
  const targetDir = findHooksDir() || DST_DIR

  log(`源目录:   ${SRC_DIR}`)
  log(`目标目录: ${targetDir}`)

  const installed = installTo(targetDir)
  for (const hook of installed) log(`  ✓ 已安装 ${hook}`)
  log(`完成：共安装 ${installed.length} 个钩子`)
  log('提示：提交时将自动触发；跳过请用 git commit --no-verify')
}

// 仅在直接执行时运行 main（被 import 时不执行）
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) main()

