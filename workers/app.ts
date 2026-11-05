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
			// Dev: proxy to local hypersports-ws-service (STOMP endpoint)
			const target = new URL(request.url);
			target.host = "localhost:7070";
			target.protocol = "http:";
			target.pathname = "/ws";
			target.search = "";
			try {
				return await fetch(target.toString(), request);
			} catch {
				// Backend down/refused: answer with a plain 502 instead of letting
				// workerd emit a 500 error page. Dev's miniflare crashes the whole
				// Node process on any 500 JSON-parsing its (gzip'd) error body.
				return new Response("WebSocket backend unavailable", { status: 502 });
			}
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
