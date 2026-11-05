import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route(":matchId", "routes/livetracker.$matchId.tsx"),
  route("kit-preview", "routes/kit-preview.tsx"),
  route("event-demo", "routes/event-demo.tsx"),
] satisfies RouteConfig;
