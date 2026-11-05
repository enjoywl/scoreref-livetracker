import type { Config } from "@react-router/dev/config";

// 默认仍是 Cloudflare SSR 部署；BUILD_TARGET=static 时输出纯静态 SPA（build/client），
// 供 Docker/nginx 托管，见 `npm run build:static`。
const staticBuild = process.env.BUILD_TARGET === "static";

export default {
	// 挂在 www.scoreref.com 的 /livetracker/ 子路径（与 vite base 一致）。
	// 末尾斜杠必须保留：React Router 7.9 的 dev server 要求 basename 以
	// vite base("/livetracker/") 为前缀，否则 npm run dev 直接退出。
	basename: "/livetracker/",
	ssr: !staticBuild,
	future: {
		unstable_viteEnvironmentApi: true,
	},
} satisfies Config;
