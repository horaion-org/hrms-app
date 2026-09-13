import { devtools } from "@tanstack/devtools-vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { loadEnv, normalizePath, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
import { contentSecurityPolicy } from "./src/common/content-security-policy";

/**
 * Headers every response carries, in development from the dev server and in
 * production from vercel.json. Kept identical so a violation shows up on a
 * developer's machine first. See docs/adr/0007-content-security-policy.md.
 */
const securityHeaders = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy":
		"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
	"Cross-Origin-Opener-Policy": "same-origin",
};

/**
 * Production cannot vary a header per environment from vercel.json, so the
 * policy that names the API and Cognito origins is baked into the page as a
 * meta tag at build time, from the same VITE_* values the bundle uses.
 */
function contentSecurityPolicyMeta(policy: string): Plugin {
	return {
		name: "horaion:content-security-policy-meta",
		apply: "build",
		transformIndexHtml: () => [
			{
				tag: "meta",
				attrs: { "http-equiv": "Content-Security-Policy", content: policy },
				injectTo: "head-prepend",
			},
		],
	};
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
	const environment = loadEnv(mode, process.cwd(), "VITE_");
	const origins = {
		apiOrigin: environment["VITE_API_BASE_URL"] ?? "http://localhost:8000",
		cognitoRegion: environment["VITE_COGNITO_REGION"] ?? "ap-southeast-1",
	};
	// One nonce per dev server start; the browser only compares it with the
	// tags Vite stamps, so it needs no rotation per request.
	const nonce = randomBytes(16).toString("base64");

	return {
		define: {
			global: "globalThis",
		},
		optimizeDeps: {
			esbuildOptions: {
				define: {
					global: "globalThis",
				},
			},
		},
		// Only the dev server injects tags that need the nonce; a built page
		// carries none, so the production HTML stays free of a fixed nonce.
		html: command === "serve" ? { cspNonce: nonce } : {},
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
			contentSecurityPolicyMeta(contentSecurityPolicy(origins)),
		],
		resolve: {
			alias: {
				"@": normalizePath(path.resolve("./src")),
			},
		},
		server: {
			host: true,
			strictPort: true,
			headers: {
				...securityHeaders,
				"Content-Security-Policy": contentSecurityPolicy({
					...origins,
					nonce,
				}),
			},
		},
		test: {
			environment: "jsdom",
			setupFiles: ["./vitest.setup.ts"],
			css: true,
		},
	};
});
