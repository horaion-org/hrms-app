import { createRouter } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { configureApiClient } from "@/common/api-client";
import { accessToken } from "@/features/auth/cognito";
import { routeTree } from "@/routeTree.gen";
import "@/styles/tailwind.css";
import "@/common/i18n";

// The client asks the auth layer for a token rather than importing it, which
// keeps the dependency acyclic. See src/common/api-client.ts.
configureApiClient(accessToken);

const router = createRouter({ routeTree });

export type TanstackRouter = typeof router;

declare module "@tanstack/react-router" {
	interface Register {
		// This infers the type of our router and registers it across your entire project
		router: TanstackRouter;
	}
}

const rootElement = document.querySelector("#root") as Element;
if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<React.Suspense fallback="loading">
				<App router={router} />
			</React.Suspense>
		</React.StrictMode>
	);
}
