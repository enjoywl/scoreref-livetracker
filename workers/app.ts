import { createRequestHandler } from "react-router";

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: Env;
			ctx: ExecutionContext;
		};
	}
}

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// Proxy WebSocket connections
		if (url.pathname === "/v1/soccer/ws" && request.headers.get("Upgrade") === "websocket") {
			if (env.API_BINDING) {
				// Production: proxy via VPC service binding
				return env.API_BINDING.fetch(request);
			}
			// Dev: proxy to local backend
			const target = new URL(request.url);
			target.host = "localhost:3000";
			target.protocol = "http:";
			return fetch(target.toString(), request);
		}

		// 404 for known non-route probes (Chrome DevTools, etc.)
		if (url.pathname.startsWith("/.well-known/")) {
			return new Response(null, { status: 404 });
		}

		return requestHandler(request, {
			cloudflare: { env, ctx },
		});
	},
} satisfies ExportedHandler<Env>;
