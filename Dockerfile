# Dockerfile — 测试运行环境
#
# 基于 Playwright 官方镜像（内置 Chromium），追加 git + 项目依赖
# 用法：docker build -t finyx-test .
#       docker run --rm finyx-test
#       docker run --rm finyx-test npm run e2e:auth
#       docker run --rm finyx-test npm run verify:build-failure

FROM mcr.microsoft.com/playwright:v1.62.1-noble

# git（verify:build-failure 和单元测试需要）
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先复制 package 文件，利用 Docker 层缓存
COPY package.json package-lock.json* ./
COPY server/package.json server/package-lock.json* ./server/

# 安装依赖（含 Playwright 浏览器二进制）
# --legacy-peer-deps: 绕过 @capacitor/ios@8 与 @capacitor/core@6 的 peer dep 冲突
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps
# 安装 server 依赖（tsx/esbuild 等需要独立安装，避免二进制版本不匹配）
RUN cd server && (npm ci --legacy-peer-deps || npm install --legacy-peer-deps)

# 复制源码
COPY . .

# 安装 git hooks（用于 post-commit 验证）
RUN npm run install:hooks

# 默认运行全部三套测试
CMD ["sh", "-c", "npm test && npm run e2e:auth && npm run verify:build-failure"]
