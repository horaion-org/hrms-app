import { defineConfig, devices } from "@playwright/test";
import { APP_ORIGIN } from "./e2e-fullstack/stack";

/*
 * The full-stack suite: the real app against the real API and a real
 * Postgres, with only Cognito replaced (see e2e-fullstack/README.md). Run it
 * with `pnpm test:e2e:fullstack`, which starts and stops the stack; this
 * config only drives the browsers, so it starts no web server of its own.
 */
export default defineConfig({
	testDir: "./e2e-fullstack",
	// Under test-results/, which the Vite dev server does not watch: artifacts
	// written anywhere else would make it reload the pages under test.
	outputDir: "./test-results/fullstack",
	/* Every test signs up its own founder, so tests are independent. */
	fullyParallel: true,
	forbidOnly: !!process.env["CI"],
	retries: 0,
	reporter: [
		["list"],
		["html", { outputFolder: "playwright-report/fullstack", open: "never" }],
	],
	timeout: 60 * 1000,
	use: {
		baseURL: APP_ORIGIN,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],
});
