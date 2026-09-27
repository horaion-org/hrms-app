import { test, expect } from "@playwright/test";
import { seedSignedInSession } from "./session";

// Onboarding, confirmation and a real sign-in need a live API and a Cognito
// pool that emails codes, so they are verified by hand. These cover the
// boundary a signed-out visitor meets and the forms they fill in.

test("signed-out visitors are sent to sign in", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveURL(/\/sign-in/);
	await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("a signed-in person reaches the home page", async ({ page }) => {
	await seedSignedInSession(page);
	await page.goto("/");

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText("Hello, world!")).toBeVisible();
});

test("the sign-in page shows the brand panel", async ({ page }) => {
	await page.goto("/sign-in");

	await expect(page.getByText(/smarter scheduling/i)).toBeVisible();
	await expect(page.getByText(/plan shifts, assign teams/i)).toBeVisible();
	await expect(page.getByRole("button", { name: /go to slide/i })).toHaveCount(
		3
	);
});

test("remember me is present and checked by default", async ({ page }) => {
	await page.goto("/sign-in");

	await expect(
		page.getByRole("checkbox", { name: "Remember me" })
	).toBeChecked();
});

test("the company sign-up form asks for everything onboarding needs", async ({
	page,
}) => {
	await page.goto("/sign-in");
	await page.getByRole("link", { name: "Signup" }).click();

	await expect(page).toHaveURL(/\/sign-up/);
	for (const label of [
		"Company name",
		"Workspace address",
		"Your name",
		"Email address",
		"Password",
	]) {
		await expect(page.getByLabel(label, { exact: true })).toBeVisible();
	}
});

test("the sign-up form explains what it refuses before sending", async ({
	page,
}) => {
	await page.goto("/sign-up");
	await page.getByLabel("Workspace address").fill("admin");
	await page.getByLabel("Password", { exact: true }).fill("weakpassword");
	await page.getByRole("button", { name: "Create company" }).click();

	await expect(
		page.getByText("This address is reserved. Choose another")
	).toBeVisible();
	await expect(
		page.getByText(
			"Include an uppercase letter, a lowercase letter, a number and a symbol"
		)
	).toBeVisible();
	await expect(page).toHaveURL(/\/sign-up/);
});

test("password reset is reachable from sign in", async ({ page }) => {
	await page.goto("/sign-in");
	await page.getByRole("link", { name: /having trouble signing in/i }).click();

	await expect(page).toHaveURL(/\/forgot-password/);
	await expect(
		page.getByRole("button", { name: "Send reset code" })
	).toBeVisible();
});
