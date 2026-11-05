import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import SiteFooter from "./components/SiteFooter";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
	// Embedded mode: the match detail page frames this app, and its own footer
	// links (home / event demo / kit preview) do not belong inside the pitch
	// card. The parent adds `?embed=1`; everything else keeps the site chrome.
	const location = useLocation();
	const isEmbedded = new URLSearchParams(location.search).get("embed") === "1";

	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				{/* 子路径下显式指向 favicon，避免浏览器向根请求落到主站 */}
				<link rel="icon" href={`${import.meta.env.BASE_URL}favicon.ico`} />
				<Meta />
				<Links />
			</head>
			<body>
				<div className="site-main">{children}</div>
				{!isEmbedded && <SiteFooter />}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="error-boundary">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
