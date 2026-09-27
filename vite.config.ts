import { devtools } from "@tanstack/devtools-vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
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
		// Copies src/assets/locales to dist/locales, where the production
		// i18next backend fetches them. Stripping `src/assets` also keeps the
		// dev server from shadowing the translation files that are imported
		// as modules.
		viteStaticCopy({
			targets: [
				{
					src: "src/assets/locales",
					dest: ".",
					rename: { stripBase: 2 },
				},
			],
		}),
	],
	resolve: {
		alias: {
			"@": normalizePath(path.resolve("./src")),
		},
	},
	server: {
		host: true,
		strictPort: true,
	},
	test: {
		environment: "jsdom",
		// Node's experimental Web Storage shadows jsdom's localStorage and
		// sessionStorage, which tests use to assert no credential is stored.
		execArgv: process.allowedNodeEnvironmentFlags.has(
			"--no-experimental-webstorage"
		)
			? ["--no-experimental-webstorage"]
			: [],
		// Tests stub `fetch`; a fixed base URL keeps them independent of .env.local.
		env: { VITE_API_BASE_URL: "http://api.test" },
		setupFiles: ["./vitest.setup.ts"],
		css: true,
	},
});
