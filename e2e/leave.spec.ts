import { expect, test, type Route } from "@playwright/test";
import { mockSessionRoutes } from "./session";

const json = (route: Route, status: number, data: unknown): Promise<void> =>
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

const page_ = (
	content: Array<unknown>,
	totalElements = content.length
): unknown => ({
	content,
	page: { totalElements },
});

const request = (
	overrides: Record<string, unknown>
): Record<string, unknown> => ({
	leaveRequestId: "leave-1",
	membershipId: "m-aisha",
	employeeCode: "EMP-10517",
	displayName: "Aisha Rahman",
	branchId: "b-1",
	branchName: "Main branch",
	branchCountry: "SG",
	departmentId: "d-1",
	departmentName: "Sales",
	leaveType: "ANNUAL",
	startDate: "2026-05-22",
	endDate: "2026-05-22",
	workingDays: 1,
	status: "PENDING",
	requestedAt: "2026-05-02T08:00:00Z",
	requestedBy: { membershipId: "m-acme", displayName: "Owner" },
	reviewedAt: null,
	reviewedBy: null,
	rejectionReason: null,
	...overrides,
});

const cheryl = request({
	leaveRequestId: "leave-2",
	membershipId: "m-cheryl",
	employeeCode: "EMP-10620",
	displayName: "Cheryl Ng",
	leaveType: "SICK",
	startDate: "2026-05-20",
	endDate: "2026-05-21",
	workingDays: 2,
});

test.beforeEach(async ({ context }) => {
	const session = await mockSessionRoutes(context);
	session.session = "active";
	await context.route("**/api/v1/me/workspace", (route) =>
		json(route, 200, {
			companies: [
				{
					uuid: "acme",
					name: "Acme",
					permissions: [
						"leave_request:read",
						"leave_request:create",
						"leave_request:review",
					],
					branches: [
						{
							uuid: "b-1",
							name: "Main branch",
							status: "ACTIVE",
							country: "SG",
							permissions: [],
							departments: [],
						},
					],
				},
			],
		})
	);
	await context.route("**/api/v1/companies/acme/me/leave-requests**", (route) =>
		json(
			route,
			200,
			page_([request({ membershipId: "m-acme", displayName: "Owner" })])
		)
	);
	let rejected = false;
	await context.route("**/api/v1/companies/acme/leave-requests**", (route) =>
		json(
			route,
			200,
			page_(
				[
					request({}),
					rejected
						? {
								...cheryl,
								status: "REJECTED",
								reviewedAt: "2026-05-19T00:00:00Z",
								reviewedBy: { membershipId: "m-acme", displayName: "Owner" },
								rejectionReason: "Coverage needed for the team event.",
							}
						: cheryl,
				],
				24
			)
		)
	);
	await context.route(
		"**/api/v1/companies/acme/member-profiles/m-cheryl/leave-requests/leave-2/rejection",
		(route) => {
			rejected = true;
			return json(route, 200, {
				...cheryl,
				status: "REJECTED",
				rejectionReason: "Coverage needed for the team event.",
			});
		}
	);
});

test("requests, timeline, and a rejection against the API", async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 1440, height: 1236 });
	await page.goto("/leave");
	await expect(
		page.getByRole("heading", { name: "Leave overview" })
	).toBeVisible();
	await expect(page.getByRole("tab", { name: "My leave" })).toHaveAttribute(
		"aria-selected",
		"true"
	);
	await page.getByRole("tab", { name: "Team requests" }).click();
	await expect(page.getByText("1–10 of 24 entries")).toBeVisible();
	await page.screenshot({
		path: testInfo.outputPath("requests.png"),
		fullPage: true,
	});
	await page.getByRole("tab", { name: "Team timeline" }).click();
	await expect(page).toHaveURL(/view=timeline/);
	await page.screenshot({
		path: testInfo.outputPath("timeline.png"),
		fullPage: true,
	});
	await page.getByRole("tab", { name: "Team requests" }).click();
	await page
		.getByRole("button", { name: "Reject request for Cheryl Ng" })
		.click();
	const dialog = page.getByRole("dialog", { name: "Leave request" });
	await expect(dialog).toBeVisible();
	await page.screenshot({
		path: testInfo.outputPath("rejection.png"),
		fullPage: true,
	});
	await dialog
		.getByRole("textbox", { name: "Reason for rejection" })
		.fill("Coverage needed for the team event.");
	await dialog.getByRole("button", { name: "Confirm rejection" }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByText("Request for Cheryl Ng rejected.")).toBeVisible();
	await page
		.getByRole("button", { name: "View request for Cheryl Ng" })
		.click();
	await expect(
		dialog.getByText("Coverage needed for the team event.")
	).toBeVisible();
});

test("narrow-screen layout keeps the page within the viewport", async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto("/leave");
	await expect(
		page.getByRole("heading", { name: "Leave overview" })
	).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
		375
	);
	await page.getByRole("tab", { name: "Team timeline" }).click();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
		375
	);
	await page.screenshot({
		path: testInfo.outputPath("mobile-timeline.png"),
		fullPage: true,
	});
});
