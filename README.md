# Finyx

个人财务管理应用 — 支持账单管理、收入规划、目标追踪、家庭共享和趣味化功能。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + TailwindCSS |
| 后端 | Express + TypeScript + JSON 文件数据库 |
| 移动端 | Capacitor (Android / iOS) |
| 测试 | Playwright (E2E) + node:test (单元) |
| CI/CD | GitHub Actions + Git Hooks |

## 快速开始

### 环境要求

- Node.js >= 22（单元测试使用 `--experimental-strip-types` 直接运行 .ts 文件）
- npm
- Git

### 本地开发

```bash
# 1. 克隆仓库
git clone git@github.com:Timmi911/finyx.git
cd finyx

# 2. 安装前端依赖
npm install --legacy-peer-deps

# 3. 安装后端依赖
cd server && npm install --legacy-peer-deps && cd ..

# 4. 安装 Git 钩子（pre-commit + post-commit）
npm run install:hooks

# 5. 启动开发服务器（需要两个终端）
npm run dev          # 前端 http://localhost:5174
cd server && npm run dev  # 后端 http://localhost:3000
```

> `--legacy-peer-deps` 用于绕过 `@capacitor/ios@8` 与 `@capacitor/core@6` 的 peer dependency 冲突。

## 测试

### 三套测试

| 命令 | 说明 | 耗时 |
|---|---|---|
| `npm test` | 单元测试（install-hooks 路径解析，5 种 git 布局） | ~1s |
| `npm run e2e:auth` | E2E 认证流程（注册/登录/刷新/登出/重登 5 步） | ~60s |
| `npm run verify:build-failure` | 构建失败日志验证（注入错误，验证日志记录） | ~2s |

### 一键运行全部测试

```bash
npm run test:docker  # 在 Docker 容器内隔离运行三套测试
```

### Docker 隔离测试

```bash
# 单独运行
docker compose run --rm unit      # 单元测试
docker compose run --rm e2e       # E2E（用 Chromium）
docker compose run --rm verify    # 构建失败验证

# 全部
docker compose run --rm all
```

## Git 钩子

| 钩子 | 触发时机 | 执行内容 |
|---|---|---|
| `pre-commit` | `git commit` 前 | E2E 认证流程（快速反馈，失败则阻止提交） |
| `post-commit` | `git commit` 后 | Vite 构建 + E2E 测试（不阻止提交，写日志） |

跳过钩子：`git commit --no-verify`

### 日志位置

```
e2e/logs/
  post-commit-build.log   # 构建输出（含 status、duration）
  post-commit-test.log    # E2E 输出（含 status、duration）
```

## CI/CD

GitHub Actions（`.github/workflows/ci.yml`）在 push/PR 到 master 时自动运行：

1. **Unit Tests** — 单元测试
2. **E2E Auth Flow** — E2E 认证流程（Playwright Chromium）
3. **Production Build** — Vite 生产构建

三个 job 并行运行，失败时上传截图和构建产物供调试。

## 生产部署

### Docker Compose 一键部署

```bash
# 构建并启动
docker compose -f docker-compose.prod.yml up -d --build

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 停止
docker compose -f docker-compose.prod.yml down
```

| 服务 | 地址 | 说明 |
|---|---|---|
| frontend | http://localhost:8080 | Nginx 静态托管 + API 代理 |
| backend | http://localhost:3000 | Express API |

### 环境变量

在 `docker-compose.prod.yml` 同目录创建 `.env`：

```
JWT_SECRET=your-strong-random-secret
```

## 项目结构

```
finyx/
├── src/                    # 前端源码
│   ├── components/         #   组件（AppShell, charts, dialogs）
│   ├── views/              #   页面（Dashboard, Bills, Accounts, ...）
│   ├── router/             #   路由
│   ├── stores/             #   Pinia store
│   ├── services/           #   API 调用
│   ├── utils/              #   工具（api, format, ocr, ...）
│   └── types/              #   TypeScript 类型
├── server/                 # 后端源码
│   ├── src/
│   │   ├── routes/         #   API 路由
│   │   ├── services/       #   业务逻辑
│   │   ├── schemas/        #   Zod 验证
│   │   ├── middleware/     #   中间件（auth, error, validate）
│   │   └── utils/          #   工具（id, jwt）
│   └── data/               #   JSON 数据库（.gitignore 排除）
├── e2e/                    # E2E 测试
│   ├── auth-flow.mjs       #   认证流程测试
│   └── verify-build-failure.mjs  # 构建失败验证
├── scripts/                # 工具脚本
│   ├── hooks/              #   Git 钩子源文件
│   └── install-hooks.mjs  #   钩子安装脚本
├── .github/workflows/      # GitHub Actions
├── Dockerfile              # 测试运行环境
├── Dockerfile.prod         # 生产前端镜像（Nginx）
├── server/Dockerfile       # 生产后端镜像（Node）
├── docker-compose.yml      # 测试编排
└── docker-compose.prod.yml # 生产部署编排
```

## 功能模块

- **仪表盘** — 财务概览、趋势图表
- **账单管理** — 账单录入、状态追踪
- **账户管理** — 多账户管理
- **收入规划** — 收入计划与追踪
- **目标管理** — 储蓄目标设定与进度
- **报销管理** — 报销流程追踪
- **家庭共享** — 多成员家庭管理
- **趣味中心** — 游戏化财务管理（成就、金钱树、PK 挑战等）
- **票据识别** — OCR 自动识别账单信息

## License

Private
