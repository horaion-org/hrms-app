import { test, expect } from "@playwright/test";

test("home page renders the greeting", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveTitle("Vite React Boilerplate");
	await expect(page.getByText("Hello, world!")).toBeVisible();
});

test("can navigate to the example page", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("link", { name: /example/i }).click();
	await expect(page).toHaveURL(/\/example/);
	await expect(
		page.getByRole("heading", { level: 1, name: /matches/i })
	).toBeVisible();
});
