import { expect, test, type Route } from "@playwright/test";
import { E2E_ACCESS_PASS, logIn, mockSessionRoutes } from "./session";

const reply = (route: Route, data: unknown, status = 200): Promise<void> =>
	route.fulfill({
		status,
		contentType: "application/json",
		body: JSON.stringify({
			success: true,
			message: "OK",
			data,
			path: new URL(route.request().url()).pathname,
			timestamp: new Date().toISOString(),
		}),
	});

test("log in and create a branch with an active head, then see the refreshed list and overview", async ({
	page,
	context,
}) => {
	const pageErrors: Array<string> = [];
	page.on("pageerror", (error) => {
		pageErrors.push(error.message);
	});
	await mockSessionRoutes(context);
	let created = false;
	const branch = {
		branchId: "orchard-road",
		name: "Orchard Road",
		code: "ORC",
		status: "ACTIVE",
	};
	await context.route("**/api/v1/me/workspace", (route) =>
		reply(route, {
			companies: [
				{
					uuid: "acme",
					name: "Acme",
					permissions: [
						"branch:read",
						"branch:create",
						"company_member:read",
						"audit_event:read",
					],
					branches: [],
				},
			],
		})
	);
	await context.route("**/api/v1/companies/acme/branches**", (route) => {
		expect(route.request().headers()["authorization"]).toBe(
			`Bearer ${E2E_ACCESS_PASS}`
		);
		if (route.request().method() === "POST") {
			expect(route.request().postDataJSON()).toEqual({
				name: "Orchard Road",
				code: "ORC",
				initialHeadCompanyMembershipIds: ["marcus-membership"],
			});
			created = true;
			return reply(route, branch, 201);
		}
		return reply(route, {
			content: created ? [branch] : [],
			page: { totalElements: created ? 1 : 0 },
		});
	});
	await context.route("**/api/v1/companies/acme/members**", (route) => {
		const query = new URL(route.request().url()).searchParams;
		expect(query.get("status")).toBe("ACTIVE");
		expect(query.get("size")).toBe("20");
		expect(query.get("sort")).toMatch(/^user\.displayName(?:,asc)?$/);
		return reply(route, {
			content: [
				{
					membershipId: "marcus-membership",
					displayName: "Marcus Lim",
					status: "ACTIVE",
				},
			],
			page: { totalElements: 1 },
		});
	});
	await context.route("**/api/v1/companies/acme/audit-events**", (route) =>
		reply(route, {
			content: created
				? [
						{
							auditEventId: "branch-created",
							action: "branch.create",
							entityType: "Branch",
							entityId: branch.branchId,
							entityName: branch.name,
							actorDisplayName: "Owner",
							occurredAt: new Date().toISOString(),
						},
					]
				: [],
			page: { totalElements: created ? 1 : 0 },
		})
	);

	await page.goto("/login");
	await logIn(page);
	await page.getByRole("link", { name: "Organisation", exact: true }).click();
	const branchCard = page.getByRole("region", {
		name: "Branches",
		exact: true,
	});
	await expect(branchCard.getByText("0", { exact: true })).toBeVisible();
	await branchCard.getByRole("link", { name: "View all" }).click();
	await expect(page).toHaveURL(/\/organisation\/branches$/);
	const create = page.getByRole("button", {
		name: "Create branch",
		exact: true,
	});
	await create.click();
	const dialog = page.getByRole("dialog", { name: "Create branch" });
	await expect(dialog, pageErrors.join("\n")).toBeVisible();
	await expect(dialog.getByLabel("Branch name", { exact: true })).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(dialog.getByLabel("Branch code", { exact: true })).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(
		dialog.getByLabel("Branch heads", { exact: true })
	).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(
		page.getByRole("combobox", { name: "Search people" })
	).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeVisible();
	await expect(
		dialog.getByLabel("Branch heads", { exact: true })
	).toBeFocused();
	await dialog
		.getByLabel("Branch name", { exact: true })
		.fill("  Orchard Road  ");
	await dialog.getByLabel("Branch code", { exact: true }).fill("  orc  ");
	await expect(dialog.getByLabel("Branch code", { exact: true })).toHaveValue(
		"  ORC  "
	);
	await dialog.getByLabel("Branch heads", { exact: true }).click();
	await page.getByRole("option", { name: /Marcus Lim/ }).click();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeVisible();
	await dialog
		.getByRole("button", { name: "Create branch", exact: true })
		.click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByRole("row", { name: /Orchard Road/ })).toBeVisible();
	await expect(
		page
			.getByRole("row", { name: /Orchard Road/ })
			.getByRole("cell", { name: "ORC", exact: true })
	).toBeVisible();
	await expect(create).toBeFocused();

	await page.getByRole("link", { name: "Organisation", exact: true }).click();
	await expect(branchCard.getByText("1", { exact: true })).toBeVisible();
	await expect(
		page
			.getByRole("region", { name: "Recent Activity" })
			.getByText("Branch created: Orchard Road")
	).toBeVisible();
	expect(pageErrors).toEqual([]);
});
