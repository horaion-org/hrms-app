import { mkdirSync } from "node:fs";

import { expect, test as setup } from "@playwright/test";

import { readAccounts, ROLES, STORAGE_DIRECTORY } from "./support/environment";

/**
 * Signs each user type in through the real Log in screen once and keeps the browser state (the API's HttpOnly
 * Session cookie), so flows open already signed in: on load the app renews its in-memory access pass from it.
 */
for (const role of ROLES) {
	setup(`sign in as ${role}`, async ({ page }) => {
		const accounts = readAccounts();
		mkdirSync(STORAGE_DIRECTORY, { recursive: true });
		await page.goto("/login");
		await page.getByLabel("Email", { exact: true }).fill(accounts.emails[role]);
		await page.getByLabel("Password", { exact: true }).fill(accounts.password);
		await page.getByRole("button", { name: "Log in" }).click();
		await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
		await page.context().storageState({ path: `${STORAGE_DIRECTORY}/${role}.json` });
	});
}
