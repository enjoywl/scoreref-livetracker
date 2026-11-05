import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// BUILD_TARGET=static 是给 Docker/nginx 用的纯静态 SPA 构建：不需要 Workers
// 运行时，Cloudflare 插件反而会让 SPA 预渲染阶段去 import worker 入口而报错。
const staticBuild = process.env.BUILD_TARGET === "static";

export default defineConfig({
	// 挂在 www.scoreref.com 的 /livetracker/ 子路径，避免与主站 /assets/ 冲突
	base: "/livetracker/",
	// 本机其他服务(IPv4 127.0.0.1)也常用 5173,而 Vite 默认绑 IPv6 ::1,
	// 两者不冲突导致 Vite 不会自动换端口,浏览器访问 localhost 时随机命中。
	// 固定到 5200 避免歧义。
	server: { port: 5200 },
	plugins: [
		...(staticBuild ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
		reactRouter(),
		tsconfigPaths(),
	],
});
