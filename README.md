# Welcome to React Router + Cloudflare Workers!

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/react-router-starter-template)

![React Router Starter Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/bfdc2f85-e5c9-4c92-128b-3a6711249800/public)

<!-- dash-content-start -->

A modern, production-ready template for building full-stack React applications using [React Router](https://reactrouter.com/) and the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/).

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)
- 🔎 Built-in Observability to monitor your Worker
<!-- dash-content-end -->

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/react-router-starter-template
```

A live public deployment of this template is available at [https://react-router-starter-template.templates.workers.dev](https://react-router-starter-template.templates.workers.dev)

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Typegen

Generate types for your Cloudflare bindings in `wrangler.json`:

```sh
npm run typegen
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

## Deployment

If you don't have a Cloudflare account, [create one here](https://dash.cloudflare.com/sign-up)! Go to your [Workers dashboard](https://dash.cloudflare.com/?to=%2F%3Aaccount%2Fworkers-and-pages) to see your [free custom Cloudflare Workers subdomain](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) on `*.workers.dev`.

Once that's done, you can build your app:

```sh
npm run build
```

And deploy it:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Docker / Gitea CI（静态 SPA 部署）

默认的 `npm run build` + `npm run deploy` 仍然走 Cloudflare Workers（SSR + Worker 里代理
WebSocket）。如果要打 Docker 镜像，则由 nginx 托管纯静态 SPA：

```bash
# 产物在 build/client（ssr:false），不生成 worker
npm run build:static

# 构建镜像（Wasabi 配置在构建期内联进前端 bundle，只能用 build-arg 传入）
docker build \
  --build-arg VITE_WASABI_ACCESS_KEY=... \
  --build-arg VITE_WASABI_SECRET_KEY=... \
  --build-arg VITE_WASABI_ENDPOINT=https://s3.ap-northeast-1.wasabisys.com \
  --build-arg VITE_WASABI_BUCKET=soccer-cn \
  -t 172.25.0.1:8082/hypersports/scoreref-livetracker:local .
```

运行时主要变量：

- `WS_UPSTREAM`：nginx 把同源的 `/v1/soccer/ws` 转发到 `${WS_UPSTREAM}/ws`（与 Worker 版行为一致），默认生产 ws-service `http://103.171.35.90:7070`；
- `WS_ORIGIN`：WS 握手时改写的 `Origin`，默认 `https://www.hypersports.com`（ws-service 生产 `WS_ALLOWED_ORIGINS` 的默认值）。通过 IP:端口访问时浏览器 Origin 不在白名单里，不改写会 403；后端把实际来源加入 `WS_ALLOWED_ORIGINS` 后，可用 `--origin` 或环境变量改成实际来源。

启动后访问 `http://<部署机IP>:8088/`、`/livetracker/<matchId>`；本机调试时把 WS 覆盖成宿主机的 7070：

```bash
# 部署机：拉 CI 推的镜像（compose 里有 build 段，缺镜像时会本地构建，所以先 pull）
docker compose pull
docker compose up -d
# 打开 http://<host>:8088，健康检查在 /healthz

# 本机连接本机后端
WS_UPSTREAM=http://host.docker.internal:7070 docker compose up -d

# 本机从源码构建镜像：把 VITE_* 填进 .env（已被 .gitignore 忽略）
cp .env.example .env
docker compose build
docker compose up -d
```

`.env.local` / `.env` 都不会进入构建上下文（见 `.dockerignore`），镜像里不会带本机的真实凭据。

### 一键部署脚本

`deploy.sh` 封装了 pull / build / up / 健康检查：

```bash
./deploy.sh                    # 拉 latest 并启动（默认连 103.171.35.90:7070）
./deploy.sh --tag v0.1.0       # 指定镜像 tag
./deploy.sh --port 8088        # 指定宿主机端口
./deploy.sh --ws http://host.docker.internal:7070   # 指向本机后端
./deploy.sh build              # 用当前源码构建镜像再启动（VITE_* 从 .env 读）
./deploy.sh logs               # 跟踪日志
./deploy.sh status             # 查看状态
./deploy.sh down               # 停止并删除容器
```

也可以直接用环境变量覆盖：`DOCKER_REGISTRY`、`IMAGE_TAG`、`APP_PORT`、`WS_UPSTREAM`。
启动后会轮询容器内的 `/healthz`，30 秒内不通过则打印日志并以非 0 退出。

### Gitea CI

`.gitea/workflows/ci.yaml` 在 push 分支/tag 时构建并推送
`172.25.0.1:8082/hypersports/scoreref-livetracker`，PR 只构建不推送。
版本号与后端仓库一致：`<package.json version>-<时间戳>-<分支>-<提交>`，tag 构建直接使用
tag 名，main/master/tag 额外更新 `latest`。

Wasabi 配置直接内置在 `app/lib/wasabi-defaults.ts`（小型项目做法，参考 API 的
`application-prod.yml`），**CI 不需要配置任何 secret/variable**。构建后 CI 会检查产物里
是否包含 SigV4 签名代码，缺失则失败。

需要换账号或 bucket 时，可用同名的 `VITE_WASABI_*` 环境变量或 Docker build-arg 覆盖：

| 名称 | 说明 |
| --- | --- |
| `VITE_WASABI_ACCESS_KEY` | Wasabi access key |
| `VITE_WASABI_SECRET_KEY` | Wasabi secret key |
| `VITE_WASABI_ENDPOINT` | 如 `https://s3.ap-northeast-1.wasabisys.com` |
| `VITE_WASABI_BUCKET` | 如 `soccer-jp` |
| `VITE_API_BASE_URL` | 可选，从 API 发现 Wasabi 配置时使用 |

注意：图片 URL 在浏览器端用 SigV4 现签，access/secret key 最终会内联进公开的 JS
bundle，不能当作服务端密钥保密。

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
