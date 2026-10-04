import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const BRANCHES = "GET /api/v1/companies/c-1/branches";
const DEPARTMENTS = "GET /api/v1/companies/c-1/departments";
const ACCESS_ROLES = "GET /api/v1/companies/c-1/access-roles";
const EVERY_PERMISSION = [
	"branch:read",
	"branch:update",
	"department:read",
	"department:update",
	"access_role:read",
	"access_role:update",
];

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

const open = async (entry: string): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

const workspaceReply = (permissions: Array<string>): StubReply => ({
	status: 200,
	body: envelope({
		companies: [
			{ uuid: "c-1", name: "Company c-1", permissions, branches: [] },
		],
	}),
});

const pageReply = (
	content: Array<Record<string, unknown>>,
	totalElements = content.length
): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements } }),
});

const branch = (
	branchId: string,
	name: string,
	status = "ACTIVE"
): Record<string, unknown> => ({
	branchId,
	companyId: "c-1",
	name,
	status,
	headMembershipIds: [],
});

const baseRoutes = (
	permissions = EVERY_PERMISSION
): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspaceReply(permissions),
});

const bodyRows = (table: HTMLElement): Array<HTMLElement> =>
	within(table).getAllByRole("row").slice(1);

const searchesOf = (
	calls: Array<{ path: string; search: string }>,
	path: string
): Array<string> =>
	calls.filter((call) => call.path === path).map((call) => call.search);

describe("Branches", () => {
	it("lists the company's branches sorted by name on the server", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[BRANCHES]: pageReply([
				branch("b-1", "Main Branch"),
				branch("b-2", "Orchard", "INACTIVE"),
			]),
		});
		await open("/organisation/branches");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Branches" })
		).toBeVisible();
		expect(
			screen.getByText("Create and manage organisation branches.")
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "Branches" });
		await within(table).findByText("Main Branch");
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).toEqual(["Select all", "Branch name", "Status", "Actions"]);
		expect(
			bodyRows(table).map(
				(row) => within(row).getAllByRole("cell")[1]?.textContent
			)
		).toEqual(["Main Branch", "Orchard"]);
		expect(
			within(bodyRows(table)[0] as HTMLElement).getByText("Active")
		).toHaveClass("bg-success-100");
		expect(
			within(bodyRows(table)[1] as HTMLElement).getByText("Inactive")
		).toHaveClass("bg-neutral-400");
		expect(
			screen.getByRole("checkbox", { name: "Select Orchard" })
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Edit Orchard" })).toBeEnabled();
		expect(
			screen.getByRole("searchbox", { name: "Search branch" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Create branch" })
		).not.toBeInTheDocument();
		expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toEqual([
			"size=100&sort=name%2Casc",
		]);
	});

	it("asks the server for the chosen sort and status", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[BRANCHES]: pageReply([branch("b-1", "Main Branch")]),
		});
		await open("/organisation/branches");
		await screen.findByText("Main Branch");

		await user.click(
			screen.getByRole("button", { name: "Sort by Branch name" })
		);
		await waitFor(() =>
			expect(
				screen.getByRole("columnheader", { name: /Branch name/ })
			).toHaveAttribute("aria-sort", "descending")
		);
		await user.click(screen.getByRole("button", { name: "Sort by Status" }));
		await user.click(screen.getByRole("button", { name: "Showing:" }));
		await user.click(screen.getByRole("option", { name: "Active" }));

		await waitFor(() => {
			expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toEqual([
				"size=100&sort=name%2Casc",
				"size=100&sort=name%2Cdesc",
				"size=100&sort=status%2Casc",
				"size=100&sort=status%2Casc&status=ACTIVE",
			]);
		});
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
			"Active"
		);
	});

	it("searches the loaded branches by name without asking the server again", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[BRANCHES]: pageReply([
				branch("b-1", "Main Branch"),
				branch("b-2", "Orchard"),
			]),
		});
		await open("/organisation/branches");
		const table = await screen.findByRole("table", { name: "Branches" });
		await within(table).findByText("Orchard");

		await user.type(
			screen.getByRole("searchbox", { name: "Search branch" }),
			"  orch "
		);

		expect(bodyRows(table)).toHaveLength(1);
		expect(within(table).getByText("Orchard")).toBeVisible();
		await user.type(
			screen.getByRole("searchbox", { name: "Search branch" }),
			"zzz"
		);
		expect(
			within(table).getByRole("cell", {
				name: "Nothing matches your search or filter.",
			})
		).toBeVisible();
		expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toHaveLength(1);
	});

	it("offers each row's more actions without pretending to change status", async () => {
		const user = userEvent.setup();
		stubApi({
			...baseRoutes(),
			[BRANCHES]: pageReply([branch("b-1", "Main Branch")]),
		});
		await open("/organisation/branches");

		await user.click(
			await screen.findByRole("button", {
				name: "More actions for Main Branch",
			})
		);

		const menu = screen.getByRole("menu");
		expect(within(menu).getByRole("menuitem", { name: "Edit" })).toBeEnabled();
		expect(
			within(menu).getByRole("menuitem", { name: "Deactivate" })
		).toHaveAttribute("aria-disabled", "true");
	});

	it("says when there are no branches yet", async () => {
		stubApi({ ...baseRoutes(), [BRANCHES]: pageReply([]) });
		await open("/organisation/branches");

		expect(
			await screen.findByRole("cell", { name: "No branches yet." })
		).toBeVisible();
	});

	it("says when only the first page of branches is shown", async () => {
		stubApi({
			...baseRoutes(),
			[BRANCHES]: pageReply([branch("b-1", "Main Branch")], 150),
		});
		await open("/organisation/branches");

		expect(
			await screen.findByText(
				"Showing the first 1 of 150. Use the status filter to narrow the list."
			)
		).toBeVisible();
	});

	it("never asks for branches the workspace does not grant", async () => {
		const calls = stubApi(baseRoutes([]));
		await open("/organisation/branches");

		expect(
			await screen.findByText("You don’t have permission to view this list.")
		).toBeVisible();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toEqual([]);
	});

	it("treats a refused list as hidden and a failed one as an alert", async () => {
		stubApi({
			...baseRoutes(),
			[BRANCHES]: problemReply(403, "AUTHORIZATION_DENIED"),
			[DEPARTMENTS]: problemReply(400, "INVALID_SORT_FIELD"),
		});
		const opened = await open("/organisation/branches");

		expect(
			await screen.findByText("You don’t have permission to view this list.")
		).not.toHaveAttribute("role");

		await opened.router.navigate({ to: "/organisation/departments" });

		expect(
			await screen.findByText("We couldn’t load this list. Please try again.")
		).toHaveAttribute("role", "alert");
	});
});

describe("Departments", () => {
	it("lists the company's departments with the same toolbar and filter", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[DEPARTMENTS]: pageReply([
				{
					departmentId: "d-1",
					branchId: "b-1",
					companyId: "c-1",
					name: "Front Office",
					status: "ACTIVE",
					headMembershipIds: [],
				},
			]),
		});
		await open("/organisation/departments");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Departments" })
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "Departments" });
		expect(await within(table).findByText("Front Office")).toBeVisible();
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).toEqual(["Select all", "Department Name", "Status", "Actions"]);
		expect(
			screen.getByRole("searchbox", { name: "Search Department" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Create Department" })
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
			"All Departments"
		);
		expect(searchesOf(calls, "/api/v1/companies/c-1/departments")).toEqual([
			"size=100&sort=name%2Casc",
		]);
	});
});

describe("System Roles", () => {
	it("lists access roles with their permission reach and no status filter", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[ACCESS_ROLES]: pageReply([
				{
					accessRoleId: "r-1",
					companyId: "c-1",
					name: "Company Owner",
					protectedRole: true,
					permissions: ["branch:read", "branch:create"],
				},
				{
					accessRoleId: "r-2",
					companyId: "c-1",
					name: "Manager",
					protectedRole: false,
					permissions: ["branch:read", "department:read", "leave:approve"],
				},
				{
					accessRoleId: "r-3",
					companyId: "c-1",
					name: "Staff",
					protectedRole: false,
					permissions: ["leave:create"],
				},
			]),
		});
		await open("/organisation/system-roles");

		expect(
			await screen.findByRole("heading", { level: 1, name: "System Roles" })
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "System roles" });
		await within(table).findByText("Manager");
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).toEqual(["Select all", "System Role", "Key Permissions", "Actions"]);
		expect(
			bodyRows(table).map((row) =>
				within(row)
					.getAllByRole("cell")
					.slice(1, 3)
					.map((cell) => cell.textContent)
			)
		).toEqual([
			["Company Owner", "Full system access"],
			["Manager", "3 permissions"],
			["Staff", "1 permission"],
		]);
		expect(
			screen.getByRole("button", { name: "Edit Company Owner" })
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Edit Manager" })).toBeEnabled();
		expect(screen.queryByText("Showing:")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Create Role" })
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Sort by System Role" })
		);

		await waitFor(() => {
			expect(searchesOf(calls, "/api/v1/companies/c-1/access-roles")).toEqual([
				"size=100&sort=name%2Casc",
				"size=100&sort=name%2Cdesc",
			]);
		});
	});
});

describe("Job Titles", () => {
	it("shows the full list layout with an empty state and asks the API for nothing", async () => {
		const calls = stubApi(baseRoutes());
		await open("/organisation/job-titles");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Job Titles" })
		).toBeVisible();
		const table = screen.getByRole("table", { name: "Job titles" });
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).toEqual([
			"Select all",
			"Job Title",
			"System Role",
			"Employee Count",
			"Status",
			"Actions",
		]);
		expect(
			within(table).getByRole("cell", { name: "No job titles yet." })
		).toBeVisible();
		expect(
			screen.getByRole("searchbox", { name: "Search Job Title" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Create Job Title" })
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
			"All Job Titles"
		);
		expect(
			calls.some((call) => call.path.startsWith("/api/v1/companies/"))
		).toBe(false);
	});
});

describe("Organisation navigation", () => {
	it("opens each list from its overview card and keeps Organisation current", async () => {
		const user = userEvent.setup();
		stubApi({
			...baseRoutes(),
			[BRANCHES]: pageReply([branch("b-1", "Main Branch")]),
			[DEPARTMENTS]: pageReply([]),
			[ACCESS_ROLES]: pageReply([]),
		});
		const opened = await open("/organisation");
		const navigation = await screen.findByRole("navigation", {
			name: "Main navigation",
		});

		const hrefs = await Promise.all(
			["Branches", "Departments", "Job Titles", "System Roles"].map(
				async (name) =>
					within(await screen.findByRole("region", { name }))
						.getByRole("link", { name: "View All" })
						.getAttribute("href")
			)
		);
		expect(hrefs).toEqual([
			"/organisation/branches",
			"/organisation/departments",
			"/organisation/job-titles",
			"/organisation/system-roles",
		]);

		await user.click(
			within(screen.getByRole("region", { name: "Branches" })).getByRole(
				"link",
				{ name: "View All" }
			)
		);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Branches" })
		).toBeVisible();
		expect(opened.router.state.location.pathname).toBe(
			"/organisation/branches"
		);
		expect(
			within(navigation).getByRole("link", { name: "Organisation" })
		).toHaveAttribute("data-status", "active");
	});
});
