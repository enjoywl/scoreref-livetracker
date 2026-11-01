# 纯静态 SPA 镜像：node 构建 -> nginx 托管。
# Cloudflare Workers 的 SSR 部署不走这个 Dockerfile（用 `npm run deploy`）。
ARG NODE_IMAGE=tkzbfnwfvyltkd.xuanyuan.run/library/node:20-alpine
ARG NGINX_IMAGE=tkzbfnwfvyltkd.xuanyuan.run/library/nginx:1.27-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app

# Vite 在构建时把 VITE_* 内联进前端 bundle，所以这些值必须是 build-arg，
# 不能指望容器启动时的环境变量。.dockerignore 排除了 .env*，构建过程不会
# 读到本机 .env.local 里的凭据。
ARG VITE_WASABI_ACCESS_KEY=""
ARG VITE_WASABI_SECRET_KEY=""
ARG VITE_WASABI_ENDPOINT=""
ARG VITE_WASABI_BUCKET=""
ARG VITE_WASABI_REGION=""
ARG VITE_API_BASE_URL=""
ENV VITE_WASABI_ACCESS_KEY=${VITE_WASABI_ACCESS_KEY} \
    VITE_WASABI_SECRET_KEY=${VITE_WASABI_SECRET_KEY} \
    VITE_WASABI_ENDPOINT=${VITE_WASABI_ENDPOINT} \
    VITE_WASABI_BUCKET=${VITE_WASABI_BUCKET} \
    VITE_WASABI_REGION=${VITE_WASABI_REGION} \
    VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    BUILD_TARGET=static

COPY package.json package-lock.json ./
# 只用 sharp 自带的预编译二进制；万一构建环境里恰好有 global libvips，
# 也不要让它改走源码编译（devDependency 里 wrangler 会带 sharp）。
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
RUN npm ci --no-audit --no-fund

COPY . .

# typecheck 顺带把 CI 的类型检查放进镜像构建，失败即不出镜像。
# ssr:false 的 SPA 构建，产物在 /app/build/client。
RUN npm run typecheck && npm run build:static

FROM ${NGINX_IMAGE}

# 反向代理目标（生产 ws-service），容器启动时由官方 entrypoint 用 envsubst
# 渲染到 /etc/nginx/conf.d/default.conf。末尾不要带斜杠。
# 本机调试可用 -e WS_UPSTREAM=http://host.docker.internal:7070 覆盖。
ENV WS_UPSTREAM=http://103.171.35.90:7070

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build/client /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
