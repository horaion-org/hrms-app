import { test, expect, type Page } from "@playwright/test";
import {
	apiResponse,
	signUpConfirmedFounder,
	VALID_TOTP_CODE,
	type Founder,
} from "./stack";

const WRONG_CODE = "000000";

const signIn = async (page: Page, founder: Founder): Promise<void> => {
	await page.goto("/sign-in");
	await page.getByLabel("Email", { exact: true }).fill(founder.email);
	await page.getByLabel("Password", { exact: true }).fill(founder.password);
	await page.getByRole("button", { name: "Log in" }).click();
};

test("a founder turns on an authenticator app, then signs in through the MFA Challenge", async ({
	page,
	request,
}) => {
	// A founder who signed up and confirmed their email through the public API.
	const founder = await signUpConfirmedFounder(request);
	await signIn(page, founder);
	await expect(page.getByText("Hello, world!")).toBeVisible();

	// Security settings: MFA starts off.
	await page.getByRole("link", { name: "Security settings" }).click();
	await expect(page).toHaveURL(/\/settings\/security$/);
	await expect(
		page.getByText(
			"Two-step login is off. Anyone with your password can log in."
		)
	).toBeVisible();

	// Enrolment shows the secret as a QR code and as text.
	const enrolment = apiResponse(page, "POST", "/api/v1/me/mfa/totp");
	await page.getByRole("button", { name: "Turn on authenticator app" }).click();
	const { data } = (await (await enrolment).json()) as {
		data: { secret: string };
	};
	await expect(
		page.getByRole("img", {
			name: "QR code to add Horaion to your authenticator app",
		})
	).toHaveAttribute("src", /^data:image\/svg\+xml/);
	await expect(page.getByText(data.secret, { exact: true })).toBeVisible();

	// The first code confirms the authenticator and turns MFA on.
	await page.getByLabel("Code from the app").fill(VALID_TOTP_CODE);
	await page.getByRole("button", { name: "Confirm and turn on" }).click();
	const mfaOn = page.getByText(
		"Two-step login is on. Logging in asks for a code from your authenticator app.",
		{ exact: true }
	);
	await expect(mfaOn).toBeVisible();

	// The API agrees: reloading the settings page itself (which empties the
	// app's cache and renews the Session from the cookie) reads the status
	// afresh, with translations loaded on this nested route too.
	await expect(page).toHaveURL(/\/settings\/security$/);
	const status = apiResponse(page, "GET", "/api/v1/me/mfa");
	await page.reload();
	expect((await status).status()).toBe(200);
	await expect(mfaOn).toBeVisible();

	// Sign out, then sign in again: the password alone is no longer enough.
	await page.getByRole("link", { name: "Back to home" }).click();
	await page.getByRole("button", { name: "Log out" }).click();
	await expect(page).toHaveURL(/\/sign-in$/);
	await signIn(page, founder);

	await expect(page).toHaveURL(/\/mfa/);
	await expect(page.getByText("Enter your code")).toBeVisible();

	await page.getByLabel("Authentication code").fill(WRONG_CODE);
	await page.getByRole("button", { name: "Verify and log in" }).click();
	await expect(
		page.getByText("That code is not right. Check it and try again.")
	).toBeVisible();
	await expect(page).toHaveURL(/\/mfa/);

	await page.getByLabel("Authentication code").fill(VALID_TOTP_CODE);
	await page.getByRole("button", { name: "Verify and log in" }).click();

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText("Hello, world!")).toBeVisible();
});
