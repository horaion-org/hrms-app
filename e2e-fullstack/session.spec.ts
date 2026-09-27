import { test, expect } from "@playwright/test";
import {
	accessTokenIn,
	apiResponse,
	CURRENT_COMPANY_KEY,
	emailedConfirmationCode,
	expectNoCredentialInWebStorage,
	newFounder,
	SESSION_COOKIE,
	SESSION_PATH,
	webStorage,
} from "./stack";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const CLOCK_TOLERANCE_SECONDS = 5 * 60;

type MeBody = {
	data: {
		email: string;
		memberships: Array<{
			/* eslint-disable camelcase -- the API's JSON is snake_case */
			company_id: string;
			company_name: string;
			/* eslint-enable camelcase */
		}>;
	};
};

test("a founder signs up, confirms their email, signs in, stays signed in across a reload and signs out", async ({
	context,
	page,
	request,
}) => {
	const founder = newFounder();

	// Sign-up: Onboarding creates the Company and the unconfirmed identity.
	await page.goto("/sign-up");
	await page.getByLabel("Company name").fill(founder.companyName);
	await page.getByLabel("Workspace address").fill(founder.subdomain);
	await page.getByLabel("Your name").fill(founder.displayName);
	await page.getByLabel("Email address").fill(founder.email);
	await page.getByLabel("Password", { exact: true }).fill(founder.password);
	await page.getByRole("button", { name: "Create company" }).click();

	// Email confirmation with the code the fake identity store "emailed".
	await expect(page).toHaveURL(/\/confirm-email\?email=/);
	await expect(
		page.getByText(`We emailed a confirmation code to ${founder.email}.`)
	).toBeVisible();
	const code = await emailedConfirmationCode(request, founder.email);
	await page.getByLabel("Confirmation code").fill(code);
	await page.getByRole("button", { name: "Confirm" }).click();

	// Sign-in, with the email carried over from confirmation.
	await expect(page).toHaveURL(/\/sign-in\?email=/);
	await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
		founder.email
	);
	await page.getByLabel("Password", { exact: true }).fill(founder.password);
	const signIn = apiResponse(page, "POST", SESSION_PATH);
	const currentUser = apiResponse(page, "GET", "/api/v1/me");
	await page.getByRole("button", { name: "Log in" }).click();

	expect((await signIn).status()).toBe(200);
	const firstAccessPass = await accessTokenIn(await signIn);
	const me = (await (await currentUser).json()) as MeBody;
	expect(me.data.email).toBe(founder.email);
	expect(me.data.memberships).toHaveLength(1);
	const company = me.data.memberships[0]!;
	expect(company.company_name).toBe(founder.companyName);

	// Home, in the founder's only Company, which becomes the Current Company.
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText("Hello, world!")).toBeVisible();
	expect((await webStorage(page)).local[CURRENT_COMPANY_KEY]).toBe(
		company.company_id
	);

	// The Session cookie, as the browser stored it.
	const cookies = await context.cookies();
	const session = cookies.find((cookie) => cookie.name === SESSION_COOKIE);
	expect(session, "the Session cookie").toBeDefined();
	expect(session).toMatchObject({
		domain: "localhost",
		path: SESSION_PATH,
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
	});
	const now = Date.now() / 1000;
	expect(session!.expires).toBeGreaterThan(
		now + SEVEN_DAYS_SECONDS - CLOCK_TOLERANCE_SECONDS
	);
	expect(session!.expires).toBeLessThan(
		now + SEVEN_DAYS_SECONDS + CLOCK_TOLERANCE_SECONDS
	);
	await expectNoCredentialInWebStorage(page, [firstAccessPass, session!.value]);

	// A reload drops the in-memory access pass; the cookie renews it.
	const renewal = apiResponse(page, "POST", `${SESSION_PATH}/refreshes`);
	await page.reload();

	expect((await renewal).status()).toBe(200);
	const renewedAccessPass = await accessTokenIn(await renewal);
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText("Hello, world!")).toBeVisible();
	await expectNoCredentialInWebStorage(page, [
		firstAccessPass,
		renewedAccessPass,
		session!.value,
	]);

	// Sign-out ends the Session: the cookie is gone and guarded pages refuse.
	const signOut = apiResponse(page, "DELETE", SESSION_PATH);
	await page.getByRole("button", { name: "Log out" }).click();

	expect((await signOut).status()).toBe(204);
	await expect(page).toHaveURL(/\/sign-in$/);
	expect(
		(await context.cookies()).filter((cookie) => cookie.name === SESSION_COOKIE)
	).toEqual([]);

	const refusedRenewal = apiResponse(page, "POST", `${SESSION_PATH}/refreshes`);
	await page.goto("/");

	expect((await refusedRenewal).status()).toBe(401);
	await expect(page).toHaveURL(/\/sign-in\?redirect=%2F$/);
	await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
	await expectNoCredentialInWebStorage(page, [
		firstAccessPass,
		renewedAccessPass,
		session!.value,
	]);
});
