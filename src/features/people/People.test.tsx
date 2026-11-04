import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	companyWideWorkspace,
	effectiveWorkspace,
} from "@/common/testing/effectiveWorkspace";
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
const PEOPLE = "GET /api/v1/companies/c-1/member-profiles";
const PEOPLE_PATH = "/api/v1/companies/c-1/member-profiles";
const FIRST_PAGE = "page=0&size=10&sort=displayName%2Casc";

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
	body: envelope(
		effectiveWorkspace({
			companies: [
				{ uuid: "c-1", name: "Company c-1", permissions, branches: [] },
			],
		})
	),
});

/**
 * A workspace granting `permissions` company-wide over Orchard and Jurong in
 * Singapore and Kuala Lumpur in Malaysia.
 */
const branchesWorkspaceReply = (permissions: Array<string>): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions,
					branches: [
						["b-1", "Orchard", "SG"],
						["b-2", "Jurong", "SG"],
						["b-3", "Kuala Lumpur", "MY"],
					].map(([uuid = "", name = "", country = ""]) => ({
						uuid,
						name,
						status: "ACTIVE",
						country,
						permissions: [],
						departments: [],
					})),
				},
			],
		})
	),
});

/** A workspace granting nothing at the company and `permissions` only at department d-1 of branch b-1. */
const departmentScopedWorkspaceReply = (
	permissions: Array<string>
): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
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
		})
	),
});

const pageReply = (
	content: Array<Record<string, unknown>>,
	totalElements = content.length
): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements } }),
});

const person = (
	membershipId: string,
	displayName: string,
	overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
	membershipId,
	employeeCode: `EMP-${membershipId}`,
	displayName,
	email: `${membershipId}@company.com`,
	phone: "+6591234821",
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Front Office",
	jobTitleId: "j-1",
	jobTitleName: "Front office manager",
	status: "ACTIVE",
	...overrides,
});

const baseRoutes = (
	permissions = ["member_profile:read"]
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

const peopleCalls = (
	calls: Array<{ path: string; search: string }>
): Array<string> => searchesOf(calls, PEOPLE_PATH);

describe("People", () => {
	it("lists the company's people a page at a time, sorted by name on the server", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[PEOPLE]: pageReply(
				[
					person("m-1", "Moses Lee"),
					person("m-2", "Daniel Koh", {
						phone: null,
						branchId: null,
						branchName: null,
						departmentId: null,
						departmentName: null,
						jobTitleId: null,
						jobTitleName: null,
						status: "INACTIVE",
					}),
				],
				160
			),
		});
		const opened = await open("/people");

		expect(
			await screen.findByRole("heading", { level: 1, name: "People overview" })
		).toBeVisible();
		expect(
			screen.getByText(
				"Manage employee records, roles, and workforce information across your organisation."
			)
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "People" });
		await within(table).findByText("Moses Lee");
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).toEqual([
			"Select all",
			"Employee",
			"Department",
			"Job title",
			"Contact",
			"Status",
			"Actions",
		]);
		const [moses, daniel] = bodyRows(table) as [HTMLElement, HTMLElement];
		expect(
			within(moses)
				.getAllByRole("cell")
				.map((cell) => cell.textContent)
		).toEqual([
			"Select Moses Lee",
			"MLMoses LeeEMP-m-1",
			"Front Office",
			"Front office manager",
			"+6591234821m-1@company.com",
			"Active",
			"",
		]);
		expect(within(moses).getByText("Active")).toHaveClass("bg-success-100");
		expect(
			within(daniel)
				.getAllByRole("cell")
				.map((cell) => cell.textContent)
		).toEqual([
			"Select Daniel Koh",
			"DKDaniel KohEMP-m-2",
			"—",
			"—",
			"m-2@company.com",
			"Inactive",
			"",
		]);
		expect(within(daniel).getByText("Inactive")).toHaveClass("bg-neutral-400");
		// Rows can be ticked for the bulk bar; its actions wait for the API.
		expect(
			within(moses).getByRole("checkbox", { name: "Select Moses Lee" })
		).not.toBeChecked();
		expect(
			within(table).queryByRole("button", { name: "Sort by Actions" })
		).not.toBeInTheDocument();
		expect(
			within(table).queryByRole("button", { name: "Sort by Contact" })
		).not.toBeInTheDocument();
		expect(screen.getByText("1–10 of 160 entries")).toBeVisible();
		expect(
			screen.getByRole("searchbox", { name: "Search employee" })
		).toBeVisible();
		// No Branch in the workspace: everyone in reach, with nothing to choose.
		expect(
			screen.queryByRole("button", { name: "Branch" })
		).not.toBeInTheDocument();
		// Nothing set: the filters wait behind one button, and no chips show.
		expect(screen.getByRole("button", { name: "Filters" })).toBeVisible();
		expect(
			screen.queryByRole("list", { name: "Active filters" })
		).not.toBeInTheDocument();
		expect(
			within(
				screen.getByRole("navigation", { name: "Main navigation" })
			).getByRole("link", { name: "People" })
		).toHaveAttribute("data-status", "active");
		expect(peopleCalls(calls)).toEqual([FIRST_PAGE]);
		expect(opened.router.state.location.search).toEqual({});
	});

	it("sorts from a column's menu on the server and starts again from the first page", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")], 40),
		});
		const opened = await open("/people?page=3");
		const table = await screen.findByRole("table", { name: "People" });
		await within(table).findByText("Moses Lee");

		await user.click(
			within(table).getByRole("button", { name: "Sort by Department" })
		);
		await user.click(await screen.findByRole("menuitem", { name: "Z – A" }));

		await waitFor(() => {
			expect(peopleCalls(calls)).toEqual([
				"page=2&size=10&sort=displayName%2Casc",
				"page=0&size=10&sort=department%2Cdesc",
			]);
		});
		expect(opened.router.state.location.search).toEqual({
			sort: "department,desc",
		});
		expect(
			within(table).getByRole("columnheader", { name: /Department/ })
		).toHaveAttribute("aria-sort", "descending");

		await user.click(
			within(table).getByRole("button", { name: "Sort by Status" })
		);
		await user.click(await screen.findByRole("menuitem", { name: "A – Z" }));
		await waitFor(() => {
			expect(peopleCalls(calls)).toContain("page=0&size=10&sort=status%2Casc");
		});
	});

	it("opens the requested page and moves between pages", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")], 25),
		});
		const opened = await open("/people");
		await screen.findByText("Moses Lee");

		await user.click(screen.getByRole("button", { name: "Next page" }));

		await waitFor(() => {
			expect(peopleCalls(calls)).toEqual([
				FIRST_PAGE,
				"page=1&size=10&sort=displayName%2Casc",
			]);
		});
		expect(opened.router.state.location.search).toEqual({ page: 2 });
		expect(await screen.findByText("11–20 of 25 entries")).toBeVisible();

		await user.click(screen.getByRole("button", { name: "Previous page" }));
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({});
		});
	});

	it("exports the list as filtered and opens the import page for someone who may add people", async () => {
		const user = userEvent.setup();
		const createObjectUrl = vi.fn(() => "blob:people");
		// jsdom has no object URLs; a subclass stands in without changing the real URL.
		class DownloadUrl extends URL {
			public static override createObjectURL = createObjectUrl;
			public static override revokeObjectURL = vi.fn();
		}
		vi.stubGlobal("URL", DownloadUrl);
		const calls = stubApi({
			...baseRoutes(["member_profile:read", "member_profile:create"]),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")]),
			[`GET ${PEOPLE_PATH}/export`]: {
				status: 200,
				body: "xlsx",
				headers: {
					"Content-Disposition":
						'attachment; filename="people-c-1-2026-11-04.xlsx"',
				},
			},
		});
		const opened = await open("/people?status=ACTIVE");
		await screen.findByText("Moses Lee");

		await user.click(screen.getByRole("button", { name: "Export" }));

		await waitFor(() => {
			expect(createObjectUrl).toHaveBeenCalled();
		});
		expect(searchesOf(calls, `${PEOPLE_PATH}/export`)).toEqual([
			"status=ACTIVE",
		]);
		expect(
			calls
				.find((call) => call.path === `${PEOPLE_PATH}/export`)
				?.headers.get("Accept")
		).toBe("*/*");

		await user.click(screen.getByRole("button", { name: "Import" }));
		await waitFor(() => {
			expect(opened.router.state.location.pathname).toBe("/people/import");
		});
	});

	it("says when the filtered list is too large to export", async () => {
		const user = userEvent.setup();
		stubApi({
			...baseRoutes(),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")]),
			[`GET ${PEOPLE_PATH}/export`]: problemReply(400, "EXPORT_TOO_LARGE"),
		});
		await open("/people");
		await screen.findByText("Moses Lee");

		await user.click(screen.getByRole("button", { name: "Export" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"More than 5,000 people match. Choose a Branch or Department first."
		);
	});

	it("ticks people for bulk actions and clears the selection on another page", async () => {
		const user = userEvent.setup();
		stubApi({
			...baseRoutes(),
			[PEOPLE]: pageReply(
				[person("m-1", "Moses Lee"), person("m-2", "Aisha Rahman")],
				25
			),
		});
		await open("/people");
		await screen.findByText("Moses Lee");
		// Importing needs member_profile:create; exporting only the list's read.
		expect(screen.queryByRole("button", { name: "Import" })).toBeNull();
		expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
		expect(screen.queryByText(/employees? selected/)).toBeNull();

		await user.click(
			screen.getByRole("checkbox", { name: "Select Moses Lee" })
		);
		await user.click(
			screen.getByRole("checkbox", { name: "Select Aisha Rahman" })
		);

		expect(screen.getByText("2 employees selected")).toBeVisible();
		expect(screen.getByRole("button", { name: "Set Inactive" })).toBeDisabled();

		await user.click(screen.getByRole("button", { name: "Next page" }));
		await waitFor(() => {
			expect(screen.queryByText(/employees? selected/)).toBeNull();
		});
	});

	it("clears ticked people from the bulk bar", async () => {
		const user = userEvent.setup();
		stubApi({
			...baseRoutes(),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")], 1),
		});
		await open("/people");
		await screen.findByText("Moses Lee");

		await user.click(
			screen.getByRole("checkbox", { name: "Select Moses Lee" })
		);
		expect(screen.getByText("1 employee selected")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Clear selection" }));

		expect(screen.queryByText("1 employee selected")).toBeNull();
		expect(
			screen.getByRole("checkbox", { name: "Select Moses Lee" })
		).not.toBeChecked();
	});

	it("filters by one status, and by none when both or neither are ticked", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")], 40),
		});
		const opened = await open("/people?page=2");
		await screen.findByText("Moses Lee");

		await user.click(screen.getByRole("button", { name: "Filters" }));
		await user.click(screen.getByRole("button", { name: "Showing" }));
		await user.click(screen.getByRole("option", { name: "Active" }));

		await waitFor(() => {
			expect(peopleCalls(calls)).toEqual([
				"page=1&size=10&sort=displayName%2Casc",
				"page=0&size=10&sort=displayName%2Casc&status=INACTIVE",
			]);
		});
		expect(opened.router.state.location.search).toEqual({
			status: "INACTIVE",
		});
		expect(screen.getByRole("button", { name: "Showing" })).toHaveTextContent(
			"Inactive"
		);
		expect(
			screen.getByRole("list", { name: "Active filters" })
		).toHaveTextContent("Showing: Inactive");
		expect(
			screen.getByRole("button", { name: "Filters" })
		).toHaveAccessibleDescription("1 applied");

		await user.click(screen.getByRole("option", { name: "Inactive" }));
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({});
		});
		expect(screen.getByRole("button", { name: "Showing" })).toHaveTextContent(
			"All employees"
		);
	});

	it("searches on the server once typing pauses, from the first page, without the text in the URL", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")], 40),
		});
		const opened = await open("/people?page=3");
		await screen.findByText("Moses Lee");

		await user.type(
			screen.getByRole("searchbox", { name: "Search employee" }),
			"  moses "
		);

		await waitFor(() => {
			expect(peopleCalls(calls)).toContain(
				"page=0&size=10&sort=displayName%2Casc&search=moses"
			);
		});
		// The page went back to the first, and no keystroke was a request of its own.
		expect(peopleCalls(calls)).toEqual([
			"page=2&size=10&sort=displayName%2Casc",
			FIRST_PAGE,
			"page=0&size=10&sort=displayName%2Casc&search=moses",
		]);
		expect(opened.router.state.location.search).toEqual({});
		expect(opened.router.state.location.href).not.toContain("moses");
	});

	it("says when there are no people yet", async () => {
		stubApi({ ...baseRoutes(), [PEOPLE]: pageReply([]) });
		await open("/people");

		expect(
			await screen.findByRole("cell", { name: "No people yet." })
		).toBeVisible();
		expect(
			screen.queryByRole("navigation", { name: "Pagination" })
		).not.toBeInTheDocument();
	});

	it("says when nobody matches the search", async () => {
		const user = userEvent.setup();
		stubApi({
			...baseRoutes(),
			[PEOPLE]: (call) =>
				call.search.includes("search=")
					? pageReply([])
					: pageReply([person("m-1", "Moses Lee")]),
		});
		await open("/people");
		await screen.findByText("Moses Lee");

		await user.type(
			screen.getByRole("searchbox", { name: "Search employee" }),
			"zzz"
		);

		expect(
			await screen.findByRole("cell", {
				name: "Nothing matches your search or filter.",
			})
		).toBeVisible();
	});

	it("shows the list to a person granted only at one department, since the API filters it", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[WORKSPACE]: departmentScopedWorkspaceReply(["member_profile:read"]),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")]),
		});
		const opened = await open("/people");

		const table = await screen.findByRole("table", { name: "People" });
		expect(await within(table).findByText("Moses Lee")).toBeVisible();
		expect(screen.getByRole("link", { name: "People" })).toBeVisible();
		// Every Branch in reach by default, so the URL and the request name none.
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"All branches"
		);
		expect(opened.router.state.location.search).toEqual({});
		expect(peopleCalls(calls)).toEqual([FIRST_PAGE]);
	});

	it("clears rows read under a grant that shrank, never showing them again (F07)", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[WORKSPACE]: [
				departmentScopedWorkspaceReply(["member_profile:read"]),
				departmentScopedWorkspaceReply([]),
			],
			[PEOPLE]: [
				pageReply([person("m-1", "Moses Lee")]),
				problemReply(403, "AUTHORIZATION_DENIED"),
			],
		});
		const opened = await open("/people");
		const table = await screen.findByRole("table", { name: "People" });
		expect(await within(table).findByText("Moses Lee")).toBeVisible();

		await act(async () => {
			await opened.queryClient.refetchQueries({ queryKey: ["workspace"] });
		});

		// The cached rows went with the old grant, before any new answer arrives.
		const cachedRows = (): Array<unknown> =>
			opened.queryClient
				.getQueryCache()
				.findAll({ queryKey: ["people", "c-1"] })
				.map((query) => query.state.data)
				.filter(Boolean);
		expect(cachedRows()).toEqual([]);
		await waitFor(() => {
			expect(screen.queryByText("Moses Lee")).not.toBeInTheDocument();
		});
		expect(
			await screen.findByText("You don’t have permission to view this list.")
		).toBeVisible();
		// The read key is gone everywhere, so nothing is asked for again.
		expect(peopleCalls(calls)).toEqual([FIRST_PAGE]);
		expect(cachedRows()).toEqual([]);
	});

	it("lists everyone in reach by default and one Branch once chosen", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[WORKSPACE]: branchesWorkspaceReply(["member_profile:read"]),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")], 40),
		});
		const opened = await open("/people?page=2");
		await screen.findByText("Moses Lee");

		// The header holds the Branch; Country is folded into its options.
		expect(
			screen.queryByRole("button", { name: "Country" })
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"All branches"
		);
		expect(opened.router.state.location.search).toEqual({ page: 2 });

		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(
			screen.getByRole("option", { name: "Singapore › Jurong" })
		);
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({ branch: "b-2" });
		});
		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(
			screen.getByRole("option", { name: "Singapore › Orchard" })
		);
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({ branch: "b-1" });
		});
		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "All branches" }));
		// Chosen, "All branches" is named so it follows the person to other pages.
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({ branch: "all" });
		});
		expect(peopleCalls(calls)).toEqual([
			"page=1&size=10&sort=displayName%2Casc",
			`${FIRST_PAGE}&branchId=b-2`,
			`${FIRST_PAGE}&branchId=b-1`,
			FIRST_PAGE,
		]);
	});

	it("narrows a chosen Branch to one Department, and clears the filters but keeps the Branch", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			// Orchard (Kitchen d-1, Bar d-2) and Tampines (Front d-3).
			[WORKSPACE]: {
				status: 200,
				body: envelope(companyWideWorkspace(["member_profile:read"])),
			},
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")]),
		});
		const opened = await open("/people?branch=b-1&status=ACTIVE");
		await screen.findByText("Moses Lee");

		await user.click(screen.getByRole("button", { name: "Filters" }));
		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(screen.getByRole("option", { name: "Bar" }));
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({
				branch: "b-1",
				department: "d-2",
				status: "ACTIVE",
			});
		});
		const chips = screen.getByRole("list", { name: "Active filters" });
		expect(
			within(chips)
				.getAllByRole("listitem")
				.map((chip) => chip.textContent)
		).toEqual(["Department: Bar", "Showing: Active"]);

		await user.click(screen.getByRole("button", { name: "Clear filters" }));
		// The Branch is the header's scope, not a filter: clearing keeps it.
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({ branch: "b-1" });
		});
		expect(peopleCalls(calls)).toEqual([
			`${FIRST_PAGE}&status=ACTIVE&branchId=b-1`,
			`${FIRST_PAGE}&status=ACTIVE&branchId=b-1&departmentId=d-2`,
			`${FIRST_PAGE}&branchId=b-1`,
		]);
		expect(
			screen.queryByRole("button", { name: "Clear filters" })
		).not.toBeInTheDocument();
	});

	it("never selects, shows or asks for a Branch outside the person's scope, whatever the URL says", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[WORKSPACE]: departmentScopedWorkspaceReply(["member_profile:read"]),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")]),
		});
		// Tampines (b-2) and its Front (d-3) are not in this person's workspace.
		const opened = await open("/people?branch=b-2&department=d-3");
		await screen.findByText("Moses Lee");

		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"All branches"
		);
		await waitFor(() => {
			expect(opened.router.state.location.search).not.toHaveProperty("branch");
		});
		expect(
			screen.queryByRole("list", { name: "Active filters" })
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Filters" })).not.toHaveAttribute(
			"aria-describedby"
		);
		// The list falls back to everything in scope; neither id is ever sent.
		expect(peopleCalls(calls).every((call) => !call.includes("Id="))).toBe(
			true
		);
	});

	it("never selects, shows or asks for a Department outside the person's scope in a Branch they can see", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			// Orchard offered for its Kitchen (d-1) only; Bar (d-2) exists but is out of scope.
			[WORKSPACE]: departmentScopedWorkspaceReply(["member_profile:read"]),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")]),
		});
		await open("/people?branch=b-1&department=d-2");
		await screen.findByText("Moses Lee");

		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Orchard"
		);
		expect(
			screen.queryByRole("list", { name: "Active filters" })
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Filters" }));
		// One Department in reach: nothing to choose, so no Department field.
		expect(
			screen.queryByRole("button", { name: "Department" })
		).not.toBeInTheDocument();
		expect(peopleCalls(calls)).toEqual([`${FIRST_PAGE}&branchId=b-1`]);
	});

	it("carries the chosen Branch to the next page and back, as the one shared Branch", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[WORKSPACE]: {
				status: 200,
				body: envelope(companyWideWorkspace(["member_profile:read"])),
			},
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")]),
		});
		const opened = await open("/people?branch=b-1&department=d-2");
		await screen.findByText("Moses Lee");

		await user.click(screen.getByRole("link", { name: "Leave" }));
		await waitFor(() => {
			expect(opened.router.state.location.pathname).toBe("/leave");
		});
		// Only the Branch travels: a Department belongs to the page it was chosen on.
		expect(opened.router.state.location.search).toEqual({ branch: "b-1" });

		await user.click(screen.getByRole("link", { name: "People" }));
		await screen.findByText("Moses Lee");
		expect(opened.router.state.location.search).toEqual({ branch: "b-1" });
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Orchard"
		);
		expect(peopleCalls(calls).slice(-1)).toEqual([
			`${FIRST_PAGE}&branchId=b-1`,
		]);
	});

	it("drops a Branch from the URL that is no longer offered, listing everyone", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[WORKSPACE]: branchesWorkspaceReply(["member_profile:read"]),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")]),
		});
		const opened = await open("/people?branch=b-9");
		await screen.findByText("Moses Lee");

		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({});
		});
		expect(peopleCalls(calls)).toEqual([FIRST_PAGE]);
	});

	it("opens on the Branch the URL names", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[WORKSPACE]: branchesWorkspaceReply(["member_profile:read"]),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")]),
		});
		await open("/people?branch=b-2");
		await screen.findByText("Moses Lee");

		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Jurong"
		);
		expect(peopleCalls(calls)).toEqual([`${FIRST_PAGE}&branchId=b-2`]);
	});

	it("is neither offered nor asked for without the key", async () => {
		const calls = stubApi(baseRoutes(["branch:read"]));
		await open("/people");

		expect(
			await screen.findByText("You don’t have permission to view this list.")
		).toBeVisible();
		expect(
			within(
				screen.getByRole("navigation", { name: "Main navigation" })
			).queryByRole("link", { name: "People" })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(peopleCalls(calls)).toEqual([]);
	});

	it("treats a refused list as hidden and reloads the workspace", async () => {
		const calls = stubApi({
			...baseRoutes(),
			[PEOPLE]: problemReply(403, "AUTHORIZATION_DENIED"),
		});
		app = await openApp("/people");
		renderAuthApp(app);

		expect(
			await screen.findByText("You don’t have permission to view this list.")
		).not.toHaveAttribute("role");
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		await waitFor(() => {
			expect(searchesOf(calls, "/api/v1/me/workspace").length).toBeGreaterThan(
				1
			);
		});
	});

	it("explains a list that failed to load", async () => {
		stubApi({
			...baseRoutes(),
			[PEOPLE]: problemReply(400, "INVALID_SORT_FIELD"),
		});
		await open("/people");

		expect(
			await screen.findByText("We couldn’t load this list. Please try again.")
		).toHaveAttribute("role", "alert");
	});
});
