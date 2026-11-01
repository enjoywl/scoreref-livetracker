import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	// 本机其他服务(IPv4 127.0.0.1)也常用 5173,而 Vite 默认绑 IPv6 ::1,
	// 两者不冲突导致 Vite 不会自动换端口,浏览器访问 localhost 时随机命中。
	// 固定到 5200 避免歧义。
	server: { port: 5200 },
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		reactRouter(),
		tsconfigPaths(),
	],
});
