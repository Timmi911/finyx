# server/Dockerfile — 后端生产镜像
#
# 编译 TypeScript → 运行 node dist/index.js
# 用法：docker build -t finyx-api server/
#       docker run -p 3000:3000 finyx-api

FROM node:20-slim
WORKDIR /app

# 安装依赖（利用层缓存）
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# 复制源码并编译
COPY . .
RUN npm run build

# 运行时数据目录（JSON 数据库持久化）
RUN mkdir -p /app/data
VOLUME /app/data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
