import type { Config } from "@react-router/dev/config";

// 默认仍是 Cloudflare SSR 部署；BUILD_TARGET=static 时输出纯静态 SPA（build/client），
// 供 Docker/nginx 托管，见 `npm run build:static`。
const staticBuild = process.env.BUILD_TARGET === "static";

export default {
	ssr: !staticBuild,
	future: {
		unstable_viteEnvironmentApi: true,
	},
} satisfies Config;
