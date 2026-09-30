import { expect, test } from "@playwright/test";
import { z } from "zod";
import {
	E2E_EMAIL,
	E2E_PASSWORD,
	mockSessionRoutes,
	webStorage,
} from "./session";

test("Log in → Forgot password → reset → Log in carries email only in history state", async ({
	page,
	context,
}) => {
	await mockSessionRoutes(context);
	const urls: Array<string> = [];
	page.on("request", (request) => {
		urls.push(request.url());
	});
	let requests = 0;
	await page.route("**/api/v1/public/password-resets", async (route) => {
		const body: unknown = route.request().postDataJSON();
		expect(z.object({ email: z.string() }).strict().parse(body)).toEqual({
			email: E2E_EMAIL,
		});
		expect(route.request().method()).toBe("POST");
		requests += 1;
		await route.fulfill({ status: 202 });
	});
	await page.route(
		"**/api/v1/public/password-resets/completions",
		async (route) => {
			const body: unknown = route.request().postDataJSON();
			expect(
				z
					.object({
						email: z.string(),
						code: z.string(),
						newPassword: z.string(),
					})
					.strict()
					.parse(body)
			).toEqual({
				email: E2E_EMAIL,
				code: "123456",
				newPassword: E2E_PASSWORD,
			});
			expect(route.request().method()).toBe("POST");
			await route.fulfill({ status: 204 });
		}
	);
	await page.goto("/login");
	await page.getByLabel("Email", { exact: true }).fill(E2E_EMAIL);
	await page.getByRole("link", { name: "Having trouble logging in?" }).click();
	await expect(page).toHaveURL(/\/forgot-password$/);
	await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
		E2E_EMAIL
	);
	// Firefox aborts a reload (NS_BINDING_ABORTED) while the dev server is still streaming route modules.
	await page.waitForLoadState("networkidle");
	await page.reload();
	await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
		E2E_EMAIL
	);
	await page.getByRole("button", { name: "Send reset code" }).click();
	await expect(page.getByRole("status")).toHaveText(
		"If that email has an account, we've sent a code"
	);
	await page.getByRole("button", { name: "Send a new code" }).click();
	await expect(page.getByRole("status")).toHaveText(
		"If that email has an account, we've sent a code"
	);
	expect(requests).toBe(2);
	await page.getByLabel("Code", { exact: true }).fill("123456");
	await page.getByLabel("New password", { exact: true }).fill(E2E_PASSWORD);
	await page.getByLabel("Confirm password", { exact: true }).fill(E2E_PASSWORD);
	await page
		.getByRole("button", { name: "Reset password", exact: true })
		.click();
	await expect(page).toHaveURL(/\/login\?passwordReset=true$/);
	await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
	await expect(page.getByRole("status")).toContainText(
		"Every device was logged out."
	);
	const state: unknown = await page.evaluate(
		(): unknown => window.history.state
	);
	expect(z.object({ email: z.string() }).parse(state).email).toBe(E2E_EMAIL);
	// Ticket 05 owns filling LogInForm from this history state.
	expect(await webStorage(page)).not.toContain(E2E_EMAIL);
	for (const url of [...urls, page.url()]) {
		expect(url).not.toContain(E2E_EMAIL);
		expect(url).not.toContain(encodeURIComponent(E2E_EMAIL));
	}
});
