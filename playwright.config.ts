import { defineConfig, devices } from "@playwright/test";
import { E2E_COGNITO_CLIENT_ID, E2E_COGNITO_USER_POOL_ID } from "./e2e/session";

/*
 * The e2e server has its own port and a fake Cognito pool, so it never reuses
 * a dev server pointed at the real pool and tests can seed a session.
 */
const E2E_PORT = 5174;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: "./e2e",
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: "html",
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: `http://localhost:${E2E_PORT}`,

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",
	},

	/* Configure projects for major browsers */
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

		/* Test against mobile viewports. */
		// {
		//   name: 'Mobile Chrome',
		//   use: { ...devices['Pixel 5'] },
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: { ...devices['iPhone 12'] },
		// },

		/* Test against branded browsers. */
		// {
		//   name: 'Microsoft Edge',
		//   use: { ...devices['Desktop Edge'], channel: 'msedge' },
		// },
		// {
		//   name: 'Google Chrome',
		//   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
		// },
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		// Start Vite directly, not through `pnpm dev`: pnpm runs scripts in
		// their own process group, so stopping it would orphan Vite on the
		// port, and the next run would reuse that dying server.
		command: `node node_modules/vite/bin/vite.js --port ${E2E_PORT} --strictPort`,
		url: `http://localhost:${E2E_PORT}`,
		env: {
			VITE_API_BASE_URL: "http://localhost:8080",
			VITE_COGNITO_REGION: "ap-southeast-1",
			VITE_COGNITO_USER_POOL_ID: E2E_COGNITO_USER_POOL_ID,
			VITE_COGNITO_CLIENT_ID: E2E_COGNITO_CLIENT_ID,
		},
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
});
