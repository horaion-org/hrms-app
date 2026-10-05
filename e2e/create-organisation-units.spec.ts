import {
	expect,
	test,
	type BrowserContext,
	type Route,
} from "@playwright/test";
import { logIn, mockSessionRoutes } from "./session";

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
const page = (content: Array<unknown>): unknown => ({
	content,
	page: { totalElements: content.length },
});
const OWNER = [
	"company:read",
	"company:update",
	"company_member:read",
	"branch:read",
	"branch:create",
	"branch:update",
	"branch_member:read",
	"branch_member:create",
	"branch_member:update",
	"branch_member:deactivate",
	"department:read",
	"department:create",
	"department:update",
	"department_member:read",
	"department_member:create",
	"department_member:update",
	"department_member:deactivate",
	"job_title:read",
	"job_title:create",
	"job_title:update",
	"access_role:read",
	"access_role:create",
	"access_role:update",
	"access_role:delete",
	"access_role:assign",
	"audit_event:read",
];

/** A logged-in Owner of Acme, with one active branch and one person. */
const mockOrganisation = async (context: BrowserContext): Promise<void> => {
	await mockSessionRoutes(context);
	await context.route("**/api/v1/me/workspace", (route) =>
		reply(route, {
			companies: [
				{ uuid: "acme", name: "Acme", permissions: OWNER, branches: [] },
			],
		})
	);
	await context.route(/\/api\/v1\/companies\/acme\/branches(\?.*)?$/, (route) =>
		reply(
			route,
			page([
				{
					branchId: "orchard",
					name: "Orchard Road",
					status: "ACTIVE",
					code: "ORC",
					city: "Singapore",
					country: "SG",
				},
			])
		)
	);
	await context.route("**/api/v1/companies/acme/members**", (route) =>
		reply(
			route,
			page([
				{ membershipId: "marcus", displayName: "Marcus Lim", status: "ACTIVE" },
			])
		)
	);
	await context.route("**/api/v1/companies/acme/audit-events**", (route) =>
		reply(route, page([]))
	);
};

test("create a department in the only active branch", async ({
	page: tab,
	context,
}) => {
	await mockOrganisation(context);
	let created = false;
	const department = {
		departmentId: "foh",
		branchId: "orchard",
		companyId: "acme",
		name: "Front of house",
		status: "ACTIVE",
		headMembershipIds: ["marcus"],
	};
	await context.route("**/api/v1/companies/acme/departments**", (route) =>
		reply(route, page(created ? [department] : []))
	);
	await context.route(
		"**/api/v1/companies/acme/branches/orchard/departments",
		(route) => {
			expect(route.request().method()).toBe("POST");
			expect(route.request().postDataJSON()).toEqual({
				name: "Front of house",
				initialHeadCompanyMembershipIds: ["marcus"],
			});
			created = true;
			return reply(route, department, 201);
		}
	);
	await tab.goto("/login");
	await logIn(tab);
	await tab.getByRole("link", { name: "Organisation", exact: true }).click();
	await tab
		.getByRole("region", { name: "Departments", exact: true })
		.getByRole("link", { name: "View all" })
		.click();
	await expect(tab).toHaveURL(/\/organisation\/departments$/);
	await tab
		.getByRole("button", { name: "Create department", exact: true })
		.click();
	const dialog = tab.getByRole("dialog", { name: "Create department" });
	await expect(dialog.getByRole("button", { name: "Branch" })).toHaveText(
		/Orchard Road/
	);
	await expect(
		dialog.getByLabel("Department name", { exact: true })
	).toBeFocused();
	await dialog
		.getByLabel("Department name", { exact: true })
		.fill(" Front of house ");
	await dialog.getByLabel("Department heads", { exact: true }).click();
	await tab.getByRole("option", { name: /Marcus Lim/ }).click();
	await tab.keyboard.press("Escape");
	await dialog
		.getByRole("button", { name: "Create department", exact: true })
		.click();
	await expect(dialog).not.toBeVisible();
	await expect(tab.getByRole("row", { name: /Front of house/ })).toBeVisible();
});

test("create a job title and see it listed", async ({ page: tab, context }) => {
	await mockOrganisation(context);
	let created = false;
	const jobTitle = {
		jobTitleId: "supervisor",
		companyId: "acme",
		name: "Shift supervisor",
		status: "ACTIVE",
	};
	await context.route("**/api/v1/companies/acme/job-titles**", (route) => {
		if (route.request().method() === "POST") {
			expect(route.request().postDataJSON()).toEqual({
				name: "Shift supervisor",
			});
			created = true;
			return reply(route, jobTitle, 201);
		}
		return reply(route, page(created ? [jobTitle] : []));
	});
	await tab.goto("/login");
	await logIn(tab);
	await tab.getByRole("link", { name: "Organisation", exact: true }).click();
	await tab
		.getByRole("region", { name: "Job titles", exact: true })
		.getByRole("link", { name: "View all" })
		.click();
	await expect(tab).toHaveURL(/\/organisation\/job-titles$/);
	await tab
		.getByRole("button", { name: "Create job title", exact: true })
		.click();
	const dialog = tab.getByRole("dialog", { name: "Create job title" });
	await dialog
		.getByLabel("Job title name", { exact: true })
		.fill("Shift supervisor");
	await dialog
		.getByRole("button", { name: "Create job title", exact: true })
		.click();
	await expect(dialog).not.toBeVisible();
	await expect(
		tab.getByRole("row", { name: /Shift supervisor/ })
	).toBeVisible();
});

test("create a system role from the permissions grid", async ({
	page: tab,
	context,
}) => {
	await mockOrganisation(context);
	let created = false;
	const role = {
		accessRoleId: "auditor",
		companyId: "acme",
		name: "Auditor",
		protectedRole: false,
		holderCount: 0,
		permissions: ["branch:read", "audit_event:read"],
	};
	await context.route("**/api/v1/companies/acme/access-roles**", (route) => {
		if (route.request().method() === "POST") {
			expect(route.request().postDataJSON()).toEqual({
				name: "Auditor",
				permissions: ["branch:read", "audit_event:read"],
			});
			created = true;
			return reply(route, role, 201);
		}
		return reply(route, page(created ? [role] : []));
	});
	await tab.goto("/login");
	await logIn(tab);
	await tab.getByRole("link", { name: "Organisation", exact: true }).click();
	await tab
		.getByRole("region", { name: "System roles", exact: true })
		.getByRole("link", { name: "View all" })
		.click();
	await expect(tab).toHaveURL(/\/organisation\/system-roles$/);
	await tab
		.getByRole("button", { name: "Create system role", exact: true })
		.click();
	const dialog = tab.getByRole("dialog", { name: "Create system role" });
	await dialog.getByLabel("Role name", { exact: true }).fill("Auditor");
	await dialog.getByRole("checkbox", { name: "Activity log: read" }).check();
	await dialog.getByRole("checkbox", { name: "Branch: read" }).check();
	await dialog
		.getByRole("button", { name: "Create system role", exact: true })
		.click();
	await expect(dialog).not.toBeVisible();
	await expect(tab.getByRole("row", { name: /Auditor/ })).toBeVisible();
});
