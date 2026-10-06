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
import { refreshWorkspaceOnRefusal } from "@/features/workspace/refreshWorkspaceOnRefusal";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const PEOPLE = "GET /api/v1/companies/c-1/member-profiles";
const PEOPLE_PATH = "/api/v1/companies/c-1/member-profiles";
const FIRST_PAGE = "page=0&size=10&sort=displayName%2Casc";

let app: OpenedApp | undefined;
let stopRefreshing: (() => void) | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	stopRefreshing?.();
	stopRefreshing = undefined;
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
						permissions: [],
						departments: [{ uuid: "d-1", name: "Kitchen", permissions }],
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
		).toEqual(["Employee", "Department", "Job title", "Contact", "Status"]);
		const [moses, daniel] = bodyRows(table) as [HTMLElement, HTMLElement];
		expect(
			within(moses)
				.getAllByRole("cell")
				.map((cell) => cell.textContent)
		).toEqual([
			"MLMoses LeeEMP-m-1",
			"Front Office",
			"Front office manager",
			"+6591234821m-1@company.com",
			"Active",
		]);
		expect(within(moses).getByText("Active")).toHaveClass("bg-success-100");
		expect(
			within(daniel)
				.getAllByRole("cell")
				.map((cell) => cell.textContent)
		).toEqual(["DKDaniel KohEMP-m-2", "—", "—", "m-2@company.com", "Inactive"]);
		expect(within(daniel).getByText("Inactive")).toHaveClass("bg-neutral-400");
		// Nothing that does nothing yet is offered.
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		expect(
			within(table).queryByRole("columnheader", { name: "Actions" })
		).not.toBeInTheDocument();
		expect(
			within(table).queryByRole("button", { name: "Sort by Contact" })
		).not.toBeInTheDocument();
		expect(screen.getByText("1–10 of 160 entries")).toBeVisible();
		expect(
			screen.getByRole("searchbox", { name: "Search employee" })
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
			"All employees"
		);
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

	it("filters by one status, and by none when both or neither are ticked", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...baseRoutes(),
			[PEOPLE]: pageReply([person("m-1", "Moses Lee")], 40),
		});
		const opened = await open("/people?page=2");
		await screen.findByText("Moses Lee");

		await user.click(screen.getByRole("button", { name: "Showing:" }));
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
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
			"Inactive"
		);

		await user.click(screen.getByRole("option", { name: "Inactive" }));
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({});
		});
		expect(screen.getByRole("button", { name: "Showing:" })).toHaveTextContent(
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
		await open("/people");

		const table = await screen.findByRole("table", { name: "People" });
		expect(await within(table).findByText("Moses Lee")).toBeVisible();
		expect(screen.getByRole("link", { name: "People" })).toBeVisible();
		expect(peopleCalls(calls)).toEqual([FIRST_PAGE]);
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
		stopRefreshing = refreshWorkspaceOnRefusal(app.queryClient);
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
