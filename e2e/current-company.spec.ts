import { expect, test } from "@playwright/test";
import {
	E2E_ACCESS_PASS,
	E2E_EMAIL,
	logIn,
	mockSessionRoutes,
	webStorage,
} from "./session";

test("lands in the last company, switches, and reloads into that company", async ({
	page,
	context,
}) => {
	await mockSessionRoutes(context);
	await context.route("**/api/v1/me", (route) => {
		expect(route.request().headers()["authorization"]).toBe(
			`Bearer ${E2E_ACCESS_PASS}`
		);
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				message: "OK",
				path: "/api/v1/me",
				timestamp: "2026-09-29T00:00:00Z",
				data: {
					userId: "owner",
					email: E2E_EMAIL,
					displayName: "Owner",
					status: "ACTIVE",
					memberships: ["Acme", "North"].map((name) => ({
						membershipId: `m-${name}`,
						companyId: name,
						companyName: name,
						subdomain: name.toLowerCase(),
						companyStatus: "ACTIVE",
						status: "ACTIVE",
					})),
				},
			}),
		});
	});
	await page.goto("/login");
	await page.evaluate(() => {
		localStorage.setItem("horaion.currentCompanyId", "North");
	});
	await logIn(page);
	await expect(
		page.getByRole("heading", { name: "North", exact: true })
	).toBeVisible();
	await page.getByRole("button", { name: "Switch company" }).click();
	await page.getByRole("button", { name: "Acme acme" }).click();
	await expect(
		page.getByRole("heading", { name: "Acme", exact: true })
	).toBeVisible();
	await page.reload();
	await expect(
		page.getByRole("heading", { name: "Acme", exact: true })
	).toBeVisible();
	expect(await webStorage(page)).not.toContain(E2E_ACCESS_PASS);
	expect(await webStorage(page)).not.toContain(E2E_EMAIL);
	expect(page.url()).not.toContain(E2E_EMAIL);
});
