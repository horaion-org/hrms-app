import { expect, test } from "@playwright/test";
import { logIn, mockSessionRoutes, webStorage } from "./session";

test("a 429 holds Log in until Retry-After passes", async ({
	page,
	context,
}) => {
	await mockSessionRoutes(context);
	await page.route("**/api/v1/public/sessions", (route) =>
		route.fulfill({
			status: 429,
			contentType: "application/problem+json",
			headers: {
				"Retry-After": "61",
				"Access-Control-Expose-Headers": "Retry-After",
			},
			body: JSON.stringify({ status: 429, errorCode: "RATE_LIMITED" }),
		})
	);
	await page.goto("/login");
	await logIn(page);
	await expect(page.getByRole("alert")).toHaveText(
		"Too many attempts. Try again in about 2 minutes."
	);
	await expect(page.getByRole("alert")).toHaveCount(1);
	await expect(
		page.getByRole("button", { name: "Log in", exact: true })
	).toBeDisabled();
});

test("a failed refresh on reload shows the retry screen and keeps the route", async ({
	page,
	context,
}) => {
	await mockSessionRoutes(context);
	await page.goto("/login");
	await logIn(page);
	await expect(
		page.getByRole("heading", { name: "Welcome, Owner" })
	).toBeVisible();
	const storage = await webStorage(page);
	await page.route("**/api/v1/public/sessions/refreshes", (route) =>
		route.abort("failed")
	);
	await page.reload();
	await expect(
		page.getByRole("heading", { name: "We can't reach Horaion" })
	).toBeVisible();
	await expect(page).toHaveURL(/\/$/);
	expect(await webStorage(page)).toBe(storage);
	await page.unroute("**/api/v1/public/sessions/refreshes");
	await page.getByRole("button", { name: "Try again" }).click();
	await expect(
		page.getByRole("heading", { name: "Welcome, Owner" })
	).toBeVisible();
});
