import { test, expect, type Page } from "@playwright/test";
import {
	E2E_ACCESS_PASS,
	E2E_EMAIL,
	E2E_PASSWORD,
	mockSessionRoutes,
	webStorage,
} from "./session";

// The API's Session routes are mocked at the network layer (see ./session);
// sign-up and email confirmation are covered in ./sign-up.spec.ts. Against a
// live API and a Cognito pool that emails codes, they are verified by hand.

test.beforeEach(async ({ context }) => {
	await mockSessionRoutes(context);
});

const signIn = async (page: Page, password = E2E_PASSWORD): Promise<void> => {
	await page.getByLabel("Email", { exact: true }).fill(E2E_EMAIL);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in" }).click();
};

test("signed-out visitors are sent to sign in and brought back", async ({
	page,
}) => {
	await page.goto("/");

	await expect(page).toHaveURL(/\/sign-in\?redirect=%2F$/);
	await signIn(page);

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText("Hello, world!")).toBeVisible();
});

test("a signed-in person reaches the home page", async ({ context, page }) => {
	// Registered last, so it answers before the signed-out mock.
	await mockSessionRoutes(context, { signedIn: true });

	await page.goto("/");

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText("Hello, world!")).toBeVisible();
});

test("a nested route loaded directly shows translated text", async ({
	context,
	page,
}) => {
	await mockSessionRoutes(context, { signedIn: true });
	await context.route("**/api/v1/me/mfa", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			// eslint-disable-next-line camelcase -- the API's JSON is snake_case
			body: JSON.stringify({ success: true, data: { totp_enabled: false } }),
		})
	);

	await page.goto("/settings/security");

	await expect(
		page.getByRole("heading", { name: "Security", exact: true })
	).toBeVisible();
	await expect(page.getByText("auth.security.title")).toHaveCount(0);
});

test("signing in keeps no credential in web storage and survives a reload", async ({
	page,
}) => {
	await page.goto("/sign-in");
	await signIn(page);
	await expect(page.getByText("Hello, world!")).toBeVisible();

	expect(await webStorage(page)).not.toContain(E2E_ACCESS_PASS);

	await page.reload();

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText("Hello, world!")).toBeVisible();
	expect(await webStorage(page)).not.toContain(E2E_ACCESS_PASS);
});

test("a wrong password gets one message for either mistake", async ({
	page,
}) => {
	await page.goto("/sign-in");
	await signIn(page, "Wr0ng!pass");

	await expect(
		page.getByText("Your email or password is incorrect.")
	).toBeVisible();
	await expect(page).toHaveURL(/\/sign-in/);
});

test("signing out in one tab signs out the others", async ({
	context,
	page,
}) => {
	await page.goto("/sign-in");
	await signIn(page);
	await expect(page.getByText("Hello, world!")).toBeVisible();
	const otherTab = await context.newPage();
	await otherTab.goto("/");
	await expect(otherTab.getByText("Hello, world!")).toBeVisible();

	await page.getByRole("button", { name: "Log out" }).click();

	await expect(page).toHaveURL(/\/sign-in$/);
	await expect(otherTab).toHaveURL(/\/sign-in/);
	// Wait for the sign-in page itself, not just its URL: the router is still
	// settling right after the URL changes, and Firefox aborts a reload that
	// overlaps that history update.
	await expect(otherTab.getByRole("button", { name: "Log in" })).toBeVisible();
	await otherTab.reload();
	await expect(otherTab).toHaveURL(/\/sign-in/);
	await expect(otherTab.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("the sign-in page shows the brand panel", async ({ page }) => {
	await page.goto("/sign-in");

	await expect(page.getByText(/smarter scheduling/i)).toBeVisible();
	await expect(page.getByText(/plan shifts, assign teams/i)).toBeVisible();
	await expect(page.getByRole("button", { name: /go to slide/i })).toHaveCount(
		3
	);
});

test("there is no remember me option", async ({ page }) => {
	await page.goto("/sign-in");
	await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

	await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("the company sign-up form asks for everything onboarding needs", async ({
	page,
}) => {
	await page.goto("/sign-in");
	await page.getByRole("link", { name: "Sign up" }).click();

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
	await page.getByRole("link", { name: /having trouble logging in/i }).click();

	await expect(page).toHaveURL(/\/forgot-password/);
	await expect(
		page.getByRole("button", { name: "Send reset code" })
	).toBeVisible();
});
