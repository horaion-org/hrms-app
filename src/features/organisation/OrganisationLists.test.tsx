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
import es from "@/assets/locales/es/translations.json";
import { authTestI18n } from "@/features/auth/testingI18n";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const BRANCHES = "GET /api/v1/companies/c-1/branches";
const DEPARTMENTS = "GET /api/v1/companies/c-1/departments";
const ACCESS_ROLES = "GET /api/v1/companies/c-1/access-roles";
const JOB_TITLES = "GET /api/v1/companies/c-1/job-titles";
const EVERY_PERMISSION = [
	"branch:read",
	"branch:update",
	"department:read",
	"department:update",
	"access_role:read",
	"access_role:update",
	"job_title:read",
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

/** A workspace granting nothing at the company and `permissions` only at department d-1 of branch b-1. */
const departmentScopedWorkspaceReply = (
	permissions: Array<string>
): StubReply => ({
	status: 200,
	body: envelope({
		companies: [
			{
				uuid: "c-1",
				name: "Company c-1",
				permissions: [],
				branches: [
					{
						uuid: "b-1",
						name: "Orchard",
						status: "ACTIVE",
						country: "SG",
						permissions: [],
						departments: [
							{ uuid: "d-1", name: "Kitchen", status: "ACTIVE", permissions },
						],
					},
				],
			},
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
	code: "SG-ORC-01",
	city: "Singapore",
	country: "SG",
	status,
	headMembershipIds: [],
});

const jobTitle = (
	jobTitleId: string,
	name: string,
	status = "ACTIVE"
): Record<string, unknown> => ({
	jobTitleId,
	companyId: "c-1",
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Kitchen",
	name,
	status,
});

const department = (
	departmentId: string,
	name: string,
	status = "ACTIVE"
): Record<string, unknown> => ({
	departmentId,
	branchId: "b-1",
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
	it.each([
		["en", "Singapore", "Country"],
		["es", "Singapur", "País"],
	])(
		"localizes countries in %s with raw fallback and no country sort",
		async (language, label, header) => {
			authTestI18n.addResourceBundle("es", "translation", es);
			await authTestI18n.changeLanguage(language);
			try {
				stubApi({
					...baseRoutes(),
					[BRANCHES]: pageReply([
						{ ...branch("b-1", "Orchard"), city: "Central" },
						{ ...branch("b-2", "Unknown"), city: "Central", country: "QQ" },
					]),
				});
				await open("/organisation/branches");
				const table = await screen.findByRole("table");
				expect(await within(table).findByText(label)).toBeVisible();
				expect(within(table).getByText("QQ")).toBeVisible();
				expect(
					within(
						within(table).getByRole("columnheader", { name: header })
					).queryByRole("button")
				).not.toBeInTheDocument();
			} finally {
				await authTestI18n.changeLanguage("en");
			}
		}
	);
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
		).toEqual([
			"Select all",
			"Branch name",
			"Code",
			"City",
			"Country",
			"Status",
			"Actions",
		]);
		expect(
			within(bodyRows(table)[0] as HTMLElement).getByText("SG-ORC-01")
		).toBeVisible();
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

	it("sorts codes on the server and searches loaded rows by code without another request", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[BRANCHES]: pageReply([
				{ ...branch("b-1", "Main Branch"), code: "MAIN" },
				branch("b-2", "Orchard"),
			]),
		});
		await open("/organisation/branches");
		const table = await screen.findByRole("table", { name: "Branches" });
		await within(table).findByText("Orchard");
		await user.click(screen.getByRole("button", { name: "Sort by Code" }));
		await waitFor(() => {
			expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toEqual([
				"size=100&sort=name%2Casc",
				"size=100&sort=code%2Casc",
			]);
		});
		await user.click(screen.getByRole("button", { name: "Sort by Code" }));
		await waitFor(() => {
			expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toHaveLength(
				3
			);
		});
		expect(searchesOf(calls, "/api/v1/companies/c-1/branches")[2]).toBe(
			"size=100&sort=code%2Cdesc"
		);
		await user.type(
			screen.getByRole("searchbox", { name: "Search branch" }),
			"  sg-orc "
		);
		expect(bodyRows(table)).toHaveLength(1);
		expect(within(table).getByText("Orchard")).toBeVisible();
		expect(within(table).queryByText("Main Branch")).not.toBeInTheDocument();
		expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toHaveLength(3);
	});

	it("shows City after Code, sorts it on the server and never searches by city", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[BRANCHES]: pageReply([branch("b-1", "Orchard")]),
		});
		await open("/organisation/branches");
		const table = await screen.findByRole("table", { name: "Branches" });
		expect(await within(table).findAllByText("Singapore")).toHaveLength(2);
		await user.click(screen.getByRole("button", { name: "Sort by City" }));
		await waitFor(() => {
			expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toContain(
				"size=100&sort=city%2Casc"
			);
		});
		await user.click(screen.getByRole("button", { name: "Sort by City" }));
		await waitFor(() => {
			expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toContain(
				"size=100&sort=city%2Cdesc"
			);
		});
		await user.type(
			screen.getByRole("searchbox", { name: "Search branch" }),
			"singapore"
		);
		expect(
			within(table).getByText("Nothing matches your search or filter.")
		).toBeVisible();
		expect(within(table).queryByText("Orchard")).not.toBeInTheDocument();
		expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toHaveLength(3);
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

	it.each([
		{ status: "ACTIVE", statusAction: "Deactivate" },
		{ status: "INACTIVE", statusAction: "Activate" },
	])(
		"offers View and Duplicate as not yet built and changes a $status branch's status after asking",
		async ({ status, statusAction }) => {
			const user = userEvent.setup();
			const next = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
			const calls = stubApi({
				...baseRoutes(),
				[BRANCHES]: pageReply([branch("b-1", "Main Branch", status)]),
				"PUT /api/v1/companies/c-1/branches/b-1": {
					status: 200,
					body: envelope(branch("b-1", "Main Branch", next)),
				},
			});
			await open("/organisation/branches");

			const trigger = await screen.findByRole("button", {
				name: "More actions for Main Branch",
			});
			expect(
				screen.getByRole("button", { name: "Edit Main Branch" })
			).toBeEnabled();
			await user.click(trigger);

			const menu = screen.getByRole("menu");
			const items = within(menu).getAllByRole("menuitem");
			expect(items.map((item) => item.textContent)).toEqual([
				"View",
				"Duplicate",
				statusAction,
			]);
			expect(
				within(menu).queryByRole("menuitem", { name: "Edit" })
			).not.toBeInTheDocument();
			expect(items[0]).toHaveAttribute("aria-disabled", "true");
			expect(items[1]).toHaveAttribute("aria-disabled", "true");

			await user.click(
				within(menu).getByRole("menuitem", { name: statusAction })
			);
			// Nothing is sent until the person confirms.
			const dialog = await screen.findByRole("dialog", {
				name: `${statusAction} Main Branch`,
			});
			expect(calls.some((call) => call.method === "PUT")).toBe(false);
			await user.click(
				within(dialog).getByRole("button", { name: `${statusAction} branch` })
			);

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
			expect(
				calls.filter((call) => call.method === "PUT").map((call) => call.body)
			).toEqual([
				{
					name: "Main Branch",
					code: "SG-ORC-01",
					city: "Singapore",
					country: "SG",
					status: next,
				},
			]);
		}
	);

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

	it("shows the list to a person granted only at one department, since the API filters it", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[WORKSPACE]: departmentScopedWorkspaceReply(["branch:read"]),
			[BRANCHES]: pageReply([branch("b-1", "Orchard")]),
		});
		await open("/organisation/branches");

		const table = await screen.findByRole("table", { name: "Branches" });
		expect(await within(table).findByText("Orchard")).toBeVisible();
		expect(searchesOf(calls, "/api/v1/companies/c-1/branches")).toHaveLength(1);
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
			[DEPARTMENTS]: pageReply([department("d-1", "Front Office")]),
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
		).toEqual(["Select all", "Department name", "Status", "Actions"]);
		expect(
			screen.getByRole("searchbox", { name: "Search department" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Create department" })
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
			"All departments"
		);
		expect(searchesOf(calls, "/api/v1/companies/c-1/departments")).toEqual([
			"size=100&sort=name%2Casc",
		]);
	});

	it.each([
		{ status: "ACTIVE", statusAction: "Deactivate" },
		{ status: "INACTIVE", statusAction: "Activate" },
	])(
		"changes a $status department's status under its branch after asking",
		async ({ status, statusAction }) => {
			const user = userEvent.setup();
			const next = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
			const calls = stubApi({
				...baseRoutes(),
				[DEPARTMENTS]: pageReply([department("d-1", "Front Office", status)]),
				"PUT /api/v1/companies/c-1/branches/b-1/departments/d-1": {
					status: 200,
					body: envelope(department("d-1", "Front Office", next)),
				},
			});
			await open("/organisation/departments");

			await user.click(
				await screen.findByRole("button", {
					name: "More actions for Front Office",
				})
			);
			const menu = screen.getByRole("menu");
			expect(
				within(menu)
					.getAllByRole("menuitem")
					.map((item) => item.textContent)
			).toEqual(["Edit", statusAction]);

			await user.click(
				within(menu).getByRole("menuitem", { name: statusAction })
			);
			// Nothing is sent until the person confirms.
			const dialog = await screen.findByRole("dialog", {
				name: `${statusAction} Front Office`,
			});
			expect(calls.some((call) => call.method === "PUT")).toBe(false);
			await user.click(
				within(dialog).getByRole("button", {
					name: `${statusAction} department`,
				})
			);

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
			expect(
				calls.filter((call) => call.method === "PUT").map((call) => call.body)
			).toEqual([{ name: "Front Office", status: next }]);
		}
	);
});

describe("System roles", () => {
	it("lists access roles with their permission reach, people and status", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[ACCESS_ROLES]: pageReply([
				{
					accessRoleId: "r-1",
					companyId: "c-1",
					name: "Company Owner",
					protectedRole: true,
					status: "ACTIVE",
					permissions: ["branch:read", "branch:create"],
					holderCount: 1,
				},
				{
					accessRoleId: "r-2",
					companyId: "c-1",
					name: "Manager",
					protectedRole: false,
					status: "ACTIVE",
					permissions: ["branch:read", "department:read", "leave:approve"],
					holderCount: 3,
				},
				{
					accessRoleId: "r-3",
					companyId: "c-1",
					name: "Staff",
					protectedRole: false,
					status: "ACTIVE",
					permissions: ["leave:create"],
					holderCount: 0,
				},
			]),
		});
		await open("/organisation/system-roles");

		expect(
			await screen.findByRole("heading", { level: 1, name: "System roles" })
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "System roles" });
		await within(table).findByText("Manager");
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).toEqual([
			"Select all",
			"System role",
			"Key permissions",
			"People",
			"Status",
			"Actions",
		]);
		expect(
			bodyRows(table).map((row) =>
				within(row)
					.getAllByRole("cell")
					.slice(1, 4)
					.map((cell) => cell.textContent)
			)
		).toEqual([
			["Company Owner", "Full system access", "1 person"],
			["Manager", "3 permissions", "3 people"],
			["Staff", "1 permission", "0 people"],
		]);
		expect(
			screen.getByRole("button", { name: "Edit Company Owner" })
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Edit Manager" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
			"All roles"
		);
		expect(
			screen.queryByRole("button", { name: "Create system role" })
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Sort by System role" })
		);

		await waitFor(() => {
			expect(searchesOf(calls, "/api/v1/companies/c-1/access-roles")).toEqual([
				"size=100&sort=name%2Casc",
				"size=100&sort=name%2Cdesc",
			]);
		});
	});
});

describe("Job titles", () => {
	it("lists the company's job titles with server sort and status filter", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[JOB_TITLES]: pageReply([
				jobTitle("j-1", "Shift supervisor", "ACTIVE"),
				jobTitle("j-2", "Trainee", "INACTIVE"),
			]),
		});
		await open("/organisation/job-titles");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Job titles" })
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "Job titles" });
		expect(await within(table).findByText("Shift supervisor")).toBeVisible();
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).toEqual(["Select all", "Job title", "Department", "Status", "Actions"]);
		expect(
			bodyRows(table).map((row) =>
				within(row)
					.getAllByRole("cell")
					.slice(2, 4)
					.map((cell) => cell.textContent)
			)
		).toEqual([
			["Orchard › Kitchen", "Active"],
			["Orchard › Kitchen", "Inactive"],
		]);
		expect(
			screen.getByRole("searchbox", { name: "Search job title" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Create job title" })
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
			"All job titles"
		);

		await user.click(screen.getByRole("button", { name: "Showing:" }));
		await user.click(screen.getByRole("option", { name: "Inactive" }));
		await user.click(screen.getByRole("button", { name: "Sort by Status" }));

		await waitFor(() => {
			expect(searchesOf(calls, "/api/v1/companies/c-1/job-titles")).toEqual([
				"size=100&sort=name%2Casc",
				"size=100&sort=name%2Casc&status=INACTIVE",
				"size=100&sort=status%2Casc&status=INACTIVE",
			]);
		});
	});

	it.each([
		{ status: "ACTIVE", statusAction: "Deactivate" },
		{ status: "INACTIVE", statusAction: "Activate" },
	])(
		"changes a $status job title's status after asking",
		async ({ status, statusAction }) => {
			const user = userEvent.setup();
			const next = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
			const calls = stubApi({
				...baseRoutes([...EVERY_PERMISSION, "job_title:update"]),
				[JOB_TITLES]: pageReply([jobTitle("j-1", "Shift supervisor", status)]),
				"PUT /api/v1/companies/c-1/branches/b-1/departments/d-1/job-titles/j-1":
					{
						status: 200,
						body: envelope(jobTitle("j-1", "Shift supervisor", next)),
					},
			});
			await open("/organisation/job-titles");

			await user.click(
				await screen.findByRole("button", {
					name: "More actions for Shift supervisor",
				})
			);
			await user.click(screen.getByRole("menuitem", { name: statusAction }));
			// Nothing is sent until the person confirms.
			const dialog = await screen.findByRole("dialog", {
				name: `${statusAction} Shift supervisor`,
			});
			expect(calls.some((call) => call.method === "PUT")).toBe(false);
			await user.click(
				within(dialog).getByRole("button", {
					name: `${statusAction} job title`,
				})
			);

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
			expect(
				calls.filter((call) => call.method === "PUT").map((call) => call.body)
			).toEqual([{ name: "Shift supervisor", status: next }]);
		}
	);

	it("shows job titles to a person granted only at one department", async () => {
		stubApi({
			...baseRoutes(),
			[WORKSPACE]: departmentScopedWorkspaceReply(["job_title:read"]),
			[JOB_TITLES]: pageReply([jobTitle("j-1", "Shift supervisor")]),
		});
		await open("/organisation/job-titles");

		const table = await screen.findByRole("table", { name: "Job titles" });
		expect(await within(table).findByText("Shift supervisor")).toBeVisible();
	});

	it("never asks for job titles the workspace does not grant", async () => {
		const calls = stubApi(baseRoutes(["branch:read"]));
		await open("/organisation/job-titles");

		expect(
			await screen.findByText("You don’t have permission to view this list.")
		).toBeVisible();
		expect(searchesOf(calls, "/api/v1/companies/c-1/job-titles")).toEqual([]);
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
			[JOB_TITLES]: pageReply([]),
		});
		const opened = await open("/organisation");
		const navigation = await screen.findByRole("navigation", {
			name: "Main navigation",
		});

		const hrefs = await Promise.all(
			["Branches", "Departments", "Job titles", "System roles"].map(
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
