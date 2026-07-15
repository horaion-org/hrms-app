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
		react(),
		tailwindcss(),
		TanStackRouterVite(),
		viteStaticCopy({
			targets: [
				{
					src: normalizePath(path.resolve("./src/assets/locales")),
					dest: normalizePath(path.resolve("./dist")),
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
		setupFiles: ["./vitest.setup.ts"],
		css: true,
	},
});
