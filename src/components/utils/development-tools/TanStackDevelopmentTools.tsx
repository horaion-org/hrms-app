import React from "react";
import { isProduction } from "@/common/utils";

// Unified TanStack Devtools shell (Router + Query panels) with the Vite
// Source Inspector enabled via `@tanstack/devtools-vite` in vite.config.ts.
// Lazily loaded so it is excluded from production bundles.
export const TanStackDevelopmentTools = isProduction
	? (): null => null
	: React.lazy(() =>
			import("./TanStackDevelopmentToolsPanel").then((result) => ({
				default: result.TanStackDevelopmentToolsPanel,
			}))
		);
