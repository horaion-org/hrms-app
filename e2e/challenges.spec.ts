import { expect, test } from "@playwright/test";
import { z } from "zod";
import {
	E2E_ACCESS_PASS,
	E2E_EMAIL,
	logIn,
	mockSessionRoutes,
	webStorage,
} from "./session";

const SESSIONS = "/api/v1/public/sessions";
const envelope = (data: unknown): unknown => ({
	success: true,
	message: "OK",
	data,
	path: SESSIONS,
	timestamp: "2026-09-29T00:00:00Z",
});

test("Log in → authenticator code → home preserves the return path", async ({
	page,
	context,
}) => {
	const api = await mockSessionRoutes(context);
	await context.route(`**${SESSIONS}`, async (route) => {
		expect(route.request().method()).toBe("POST");
		await route.fulfill({
			json: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }),
		});
	});
	await context.route(`**${SESSIONS}/challenge`, async (route) => {
		expect(route.request().method()).toBe("POST");
		expect(route.request().headers()["content-type"]).toContain(
			"application/json"
		);
		const body: unknown = route.request().postDataJSON();
		expect(
			z.strictObject({ code: z.string().regex(/^\d{6}$/) }).parse(body)
		).toEqual({ code: "012345" });
		api.session = "active";
		await route.fulfill({
			json: envelope({ accessToken: E2E_ACCESS_PASS, expiresIn: 900 }),
		});
	});
	await page.goto(`/login?redirect=${encodeURIComponent("/?tab=2")}`);
	await logIn(page);
	await expect(
		page.getByRole("heading", { name: "Enter your authenticator code" })
	).toBeVisible();
	expect(new URL(page.url()).pathname).toBe("/mfa");
	expect(new URL(page.url()).searchParams.get("redirect")).toBe("/?tab=2");
	await page.getByLabel("Authenticator code", { exact: true }).fill("012345");
	await page.getByRole("button", { name: "Continue" }).click();
	await expect(
		page.getByRole("banner").getByText("Welcome, Owner.")
	).toBeVisible();
	await expect(page).toHaveURL(/\/\?tab=2$/);
	expect(page.url()).not.toContain(E2E_EMAIL);
	expect(await webStorage(page)).not.toContain(E2E_ACCESS_PASS);
	expect(await webStorage(page)).not.toContain(E2E_EMAIL);
});

test("reloading a pending Challenge returns to Log in with the return path", async ({
	page,
	context,
}) => {
	await mockSessionRoutes(context);
	await context.route(`**${SESSIONS}`, (route) =>
		route.fulfill({ json: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }) })
	);
	await page.goto(`/login?redirect=${encodeURIComponent("/?tab=2")}`);
	await logIn(page);
	await expect(
		page.getByRole("heading", { name: "Enter your authenticator code" })
	).toBeVisible();
	await page.reload();
	await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
	expect(new URL(page.url()).pathname).toBe("/login");
	expect(new URL(page.url()).searchParams.get("redirect")).toBe("/?tab=2");
});
