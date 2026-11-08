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
	// The shell no longer names the company, so the test follows the company id in the API paths the pages call.
	const requestedCompanyIds: Array<string> = [];
	page.on("request", (request) => {
		const match = new URL(request.url()).pathname.match(
			/^\/api\/v1\/companies\/([^/]+)/
		);
		if (match?.[1]) requestedCompanyIds.push(match[1]);
	});
	const latestRequestedCompanyId = (): string | undefined =>
		requestedCompanyIds[requestedCompanyIds.length - 1];
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
	await expect.poll(latestRequestedCompanyId).toBe("North");
	await page.getByRole("button", { name: "Switch company" }).click();
	await page.getByRole("button", { name: "Acme acme" }).click();
	await expect.poll(latestRequestedCompanyId).toBe("Acme");
	requestedCompanyIds.length = 0;
	await page.reload();
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	await expect.poll(latestRequestedCompanyId).toBe("Acme");
	expect(await webStorage(page)).not.toContain(E2E_ACCESS_PASS);
	expect(await webStorage(page)).not.toContain(E2E_EMAIL);
	expect(page.url()).not.toContain(E2E_EMAIL);
});
