import { mkdirSync } from "node:fs";

import type { Browser, Page, TestInfo } from "@playwright/test";

import { type Role, SCREENS_DIRECTORY, STORAGE_DIRECTORY } from "./environment";

/** Opens a page already signed in as the user type (the Session cookie saved by sign-in.setup.ts). */
export async function openAs(browser: Browser, role: Role, viewport = { width: 1440, height: 900 }, locale = "en-GB"): Promise<Page> {
	const context = await browser.newContext({ storageState: `${STORAGE_DIRECTORY}/${role}.json`, viewport, locale });
	return context.newPage();
}

/** Saves a full-page screenshot as `<caseId>-<step>.png` next to the report and lists it on the test. */
export async function screen(page: Page, testInfo: TestInfo, caseId: string, step: string): Promise<string> {
	mkdirSync(SCREENS_DIRECTORY, { recursive: true });
	const path = `${SCREENS_DIRECTORY}/${caseId}-${step}.png`;
	await page.screenshot({ path, fullPage: true });
	testInfo.annotations.push({ type: "screen", description: path });
	return path;
}

/** Records what was actually observed, for the report's Actual column. */
export function actual(testInfo: TestInfo, text: string): void {
	testInfo.annotations.push({ type: "actual", description: text });
}

/** Waits for the page's network to settle (TanStack queries finish) before reading or capturing it. */
export async function settle(page: Page): Promise<void> {
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(500);
}
