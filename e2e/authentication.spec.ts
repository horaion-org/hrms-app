import { test, expect } from "@playwright/test";

// The full critical path (onboard, confirm, sign in, invite, create role,
// grant) needs a Cognito user that is already confirmed, because confirmation
// arrives by email. Until the stack seeds one, these cover the boundary a
// signed-out visitor actually meets.

test("signed-out visitors are sent to sign in", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveURL(/\/sign-in/);
	await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("the company sign-up form is reachable and asks for what onboarding needs", async ({
	page,
}) => {
	await page.goto("/sign-in");
	await page.getByRole("link", { name: /create a company/i }).click();

	await expect(page).toHaveURL(/\/sign-up/);
	await expect(page.getByLabel("Company name")).toBeVisible();
	await expect(page.getByLabel("Workspace address")).toBeVisible();
	await expect(page.getByLabel("Email address")).toBeVisible();
	await expect(page.getByLabel("Password")).toBeVisible();
});

test("password reset is reachable from sign in", async ({ page }) => {
	await page.goto("/sign-in");
	await page.getByRole("link", { name: /forgot your password/i }).click();

	await expect(page).toHaveURL(/\/forgot-password/);
});
