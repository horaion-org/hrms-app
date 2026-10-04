import { expect, test } from "@playwright/test";
import { z } from "zod";
import {
	E2E_EMAIL,
	E2E_PASSWORD,
	mockSessionRoutes,
	webStorage,
} from "./session";

test("Onboarding → Email confirmation → Log in → home keeps the email out of every URL", async ({
	page,
	context,
}) => {
	await mockSessionRoutes(context);
	const urls: Array<string> = [];
	page.on("framenavigated", (frame) => {
		if (frame === page.mainFrame()) urls.push(frame.url());
	});
	page.on("request", (request) => {
		urls.push(request.url());
	});
	await page.route("**/api/v1/public/onboardings", async (route) => {
		const body: unknown = route.request().postDataJSON();
		expect(z.object({ email: z.string() }).parse(body).email).toBe(E2E_EMAIL);
		await route.fulfill({ status: 201 });
	});
	await page.route("**/api/v1/public/sign-up-confirmations", async (route) => {
		expect(route.request().method()).toBe("POST");
		const body: unknown = route.request().postDataJSON();
		expect(
			z.object({ email: z.string(), code: z.string() }).parse(body)
		).toEqual({ email: E2E_EMAIL, code: "123456" });
		await route.fulfill({ status: 204 });
	});
	await page.goto("/register");
	await page.getByLabel("First name").fill("Alice");
	await page.getByLabel("Last name").fill("Owner");
	await page.getByLabel("Company name", { exact: true }).fill("Acme");
	await page
		.getByLabel("Registration number", { exact: true })
		.fill("202600001A");
	await page.getByLabel("Workspace name").fill("acme");
	await page.getByLabel("Email address").fill(E2E_EMAIL);
	await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
	await page.getByLabel("Confirm password", { exact: true }).fill(E2E_PASSWORD);
	await page.getByRole("button", { name: "Sign up", exact: true }).click();
	await expect(page).toHaveURL(/\/confirm-email$/);
	await expect(
		page.getByRole("heading", { name: "Email confirmation" })
	).toBeVisible();
	await expect(page.getByLabel("Email address")).toHaveValue(E2E_EMAIL);
	await page.reload();
	await expect(page.getByLabel("Email address")).toHaveValue(E2E_EMAIL);
	await page.getByLabel("Confirmation code").fill("123456");
	await page.clock.install();
	await page.clock.pauseAt(new Date());
	await page
		.getByRole("button", { name: "Confirm email", exact: true })
		.click();
	await expect(page.getByRole("status")).toHaveText(
		"Your email is confirmed. Redirecting to log in in 3 seconds."
	);
	await page.clock.runFor(2999);
	await expect(page).toHaveURL(/\/confirm-email$/);
	await page.clock.runFor(1);
	await page.clock.resume();
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole("status")).toHaveCount(0);
	await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
		E2E_EMAIL
	);
	await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
	await page.getByRole("button", { name: "Log in", exact: true }).click();
	await expect(
		page.getByRole("banner").getByText("Welcome, Owner.")
	).toBeVisible();
	await expect(page).toHaveURL(/\/$/);
	for (const url of urls)
		expect(decodeURIComponent(url)).not.toContain(E2E_EMAIL);
	expect(await webStorage(page)).not.toContain(E2E_EMAIL);
});
