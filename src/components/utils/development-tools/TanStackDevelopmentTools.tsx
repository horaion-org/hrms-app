import React from "react";
import type { TanstackRouter } from "@/main";
import { isProduction } from "@/common/utils";

type TanStackDevelopmentToolsProps = { router: TanstackRouter };

// Unified TanStack Devtools shell (Router + Query panels) with the Vite
// Source Inspector enabled via `@tanstack/devtools-vite` in vite.config.ts.
// Lazily loaded so it is excluded from production bundles.
export const TanStackDevelopmentTools = isProduction
	? (_props: TanStackDevelopmentToolsProps): null => null
	: React.lazy(() =>
			import("./TanStackDevelopmentToolsPanel").then((result) => ({
				default: result.TanStackDevelopmentToolsPanel,
			}))
		);
