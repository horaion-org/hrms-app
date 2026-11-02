import { devtools } from "@tanstack/devtools-vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { loadEnv, normalizePath } from "vite";
import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [
		// Must be the first plugin so it can inject `data-tsd-source`
		// attributes for the devtools Source Inspector ("open in editor").
		// Production exclusion is handled by our `isProduction` + lazy-load
		// wrapper, so the plugin's own build-time removal is disabled.
		devtools({ removeDevtoolsOnBuild: false }),
		// Splits each route into its own chunk; must run before the JSX
		// transform in `react()`.
		TanStackRouterVite({ autoCodeSplitting: true }),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": normalizePath(path.resolve("./src")),
		},
	},
	server: {
		host: true,
		strictPort: true,
		proxy: {
			"/api": {
				target:
					loadEnv(mode, process.cwd(), "API_").API_PROXY_TARGET ??
					"http://localhost:8080",
				changeOrigin: true,
			},
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		css: true,
	},
}));
