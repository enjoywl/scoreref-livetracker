import { type RouteConfig, index, route } from "@react-router/dev/routes";

const routes: RouteConfig = [
  route(":matchId", "routes/livetracker.$matchId.tsx"),
];

// 本地调试/预览页（demo 回放首页、事件演示、球衣预览）只在 `npm run dev`
// 下注册；生产构建（Docker 静态 SPA 与 Cloudflare SSR）不会暴露这些页面。
if (import.meta.env.DEV) {
  routes.unshift(
    index("routes/home.tsx"),
    route("kit-preview", "routes/kit-preview.tsx"),
    route("event-demo", "routes/event-demo.tsx"),
  );
}

export default routes;
