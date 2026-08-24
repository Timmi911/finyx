/**
 * install-hooks.mjs 路径解析逻辑单元测试
 *
 * 覆盖场景：
 *   1. 标准仓库布局（.git/hooks 在仓库根下）
 *   2. 子目录作为 cwd（git 仍能解析到根的 .git/hooks）
 *   3. 非 git 目录（返回 null）
 *   4. git worktree（hooks 在主仓库 .git/hooks，worktree 的 git-dir 指向主仓库）
 *   5. git submodule（git-dir 在 .git/modules/<name>）
 *
 * 运行：node --experimental-strip-types --test src/__tests__/install-hooks.test.ts
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { findHooksDir, installTo } from '../../scripts/install-hooks.mjs'

const SANDBOX = mkdtempSync(join(tmpdir(), 'hooks-test-'))
const TMP = join(SANDBOX, 'repos')

function sh(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
}

function gitInit(cwd: string, opts: { bare?: boolean } = {}): void {
  sh(`git init${opts.bare ? ' --bare' : ''}`, cwd)
  // 设置最小化 git config，避免 commit 报错
  sh('git config user.email test@test.local', cwd)
  sh('git config user.name "Test"', cwd)
}

function makeCommit(cwd: string, msg = 'init'): void {
  writeFileSync(join(cwd, 'README.md'), '# test\n')
  sh('git add README.md', cwd)
  sh(`git commit -m "${msg}"`, cwd)
}

before(() => {
  mkdirSync(TMP, { recursive: true })
})

after(() => {
  rmSync(SANDBOX, { recursive: true, force: true })
})

describe('findHooksDir', () => {
  it('场景1: 标准仓库布局 → 解析到 .git/hooks', () => {
    const repo = join(TMP, 'standard')
    mkdirSync(repo, { recursive: true })
    gitInit(repo)
    makeCommit(repo)

    const hooksDir = findHooksDir(repo)

    assert.notEqual(hooksDir, null)
    assert.ok(hooksDir!.endsWith(join('.git', 'hooks')), `期望以 .git\\hooks 结尾，实际: ${hooksDir}`)
    assert.ok(existsSync(hooksDir), `hooks 目录应存在: ${hooksDir}`)
  })

  it('场景2: 子目录作为 cwd → 仍解析到仓库根的 .git/hooks', () => {
    const repo = join(TMP, 'subdir')
    mkdirSync(repo, { recursive: true })
    gitInit(repo)
    makeCommit(repo)

    // 创建嵌套子目录
    const deep = join(repo, 'packages', 'server', 'src')
    mkdirSync(deep, { recursive: true })

    const hooksDir = findHooksDir(deep)

    assert.notEqual(hooksDir, null)
    const expected = resolve(repo, '.git', 'hooks')
    assert.equal(hooksDir, expected, `子目录应解析到仓库根 .git/hooks`)
  })

  it('场景3: 非 git 目录 → 返回 null', () => {
    const nonGit = join(TMP, 'not-a-repo')
    mkdirSync(nonGit, { recursive: true })

    const hooksDir = findHooksDir(nonGit)

    assert.equal(hooksDir, null, '非 git 目录应返回 null')
  })

  it('场景4: git worktree → 解析到主仓库的 .git/hooks', () => {
    const mainRepo = join(TMP, 'worktree-main')
    mkdirSync(mainRepo, { recursive: true })
    gitInit(mainRepo)
    makeCommit(mainRepo)

    // 创建 worktree
    const wtPath = join(TMP, 'worktree-linked')
    sh(`git worktree add "${wtPath}"`, mainRepo)

    const hooksDir = findHooksDir(wtPath)

    assert.notEqual(hooksDir, null)
    // worktree 的 hooks 目录应指向主仓库的 .git/hooks
    const expected = resolve(mainRepo, '.git', 'hooks')
    assert.equal(hooksDir, expected, 'worktree 应解析到主仓库 .git/hooks')
  })

  it('场景5: git submodule → 解析到 .git/modules/<name>/hooks', () => {
    const mainRepo = join(TMP, 'submodule-main')
    mkdirSync(mainRepo, { recursive: true })
    gitInit(mainRepo)
    makeCommit(mainRepo)

    // 创建将被作为 submodule 的仓库
    const subRepo = join(TMP, 'submodule-child')
    mkdirSync(subRepo, { recursive: true })
    gitInit(subRepo)
    makeCommit(subRepo)

    // 在主仓库中添加 submodule
    // file transport 默认被禁（安全策略），需用 -c 传给 clone 子进程
    sh(`git -c protocol.file.allow=always submodule add "${subRepo}" child`, mainRepo)
    sh('git commit -m "add submodule"', mainRepo)

    // submodule 的工作目录
    const subWorktree = join(mainRepo, 'child')
    const hooksDir = findHooksDir(subWorktree)

    assert.notEqual(hooksDir, null)
    // submodule 的 hooks 应在 .git/modules/child/hooks
    assert.ok(
      hooksDir!.includes(join('.git', 'modules', 'child', 'hooks')),
      `期望包含 .git/modules/child/hooks，实际: ${hooksDir}`
    )
  })
})

describe('installTo', () => {
  it('安装到不存在的目标目录 → 自动创建并安装钩子', () => {
    const repo = join(TMP, 'install-create')
    mkdirSync(repo, { recursive: true })
    gitInit(repo)
    makeCommit(repo)

    const targetDir = join(repo, '.git', 'hooks')
    // 先删除以验证自动创建
    rmSync(targetDir, { recursive: true, force: true })
    assert.ok(!existsSync(targetDir), '前置：hooks 目录已删除')

    const installed = installTo(targetDir)

    assert.ok(installed.length >= 2, `应至少安装 2 个钩子，实际: ${installed.length}`)
    assert.ok(installed.includes('pre-commit'), '应包含 pre-commit')
    assert.ok(installed.includes('post-commit'), '应包含 post-commit')
    for (const hook of installed) {
      assert.ok(existsSync(join(targetDir, hook)), `${hook} 应已写入目标目录`)
    }
  })

  it('目标目录已存在 → 直接安装不报错', () => {
    const repo = join(TMP, 'install-existing')
    mkdirSync(repo, { recursive: true })
    gitInit(repo)
    makeCommit(repo)

    const targetDir = join(repo, '.git', 'hooks')
    assert.ok(existsSync(targetDir), '前置：hooks 目录存在')

    const installed = installTo(targetDir)

    assert.ok(installed.length >= 2)
  })
})
