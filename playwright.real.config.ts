import { defineConfig, devices } from "@playwright/test";

/**
 * The real end-to-end suite: a live backend, OPA, engine and Cognito, no mocks. It expects an isolated stack
 * already running (see e2e/real/README.md) and never starts or reuses a dev server, so it cannot test the wrong
 * checkout. Specs run in order on one worker, because each flow builds on the state the seed and earlier flows
 * left behind.
 */
const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5190";

export default defineConfig({
	testDir: "./e2e/real",
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 180_000,
	expect: { timeout: 15_000 },
	reporter: [["list"], ["json", { outputFile: process.env.E2E_RESULTS_FILE ?? "test-results/real-results.json" }]],
	use: {
		baseURL: APP_URL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		viewport: { width: 1440, height: 900 },
	},
	projects: [
		{ name: "seed", testMatch: /seed\.setup\.ts/ },
		{ name: "sign-in", testMatch: /sign-in\.setup\.ts/, dependencies: ["seed"] },
		{
			name: "flows",
			testMatch: /\d\d-.*\.spec\.ts/,
			dependencies: ["sign-in"],
			use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
		},
	],
});
