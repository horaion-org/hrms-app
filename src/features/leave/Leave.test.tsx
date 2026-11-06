import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
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
import {
	LEAVE_FIXTURES,
	LEAVE_TYPE_FIXTURES,
	leaveFixture,
} from "@/features/leave/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const LEAVE_PATH = "/api/v1/companies/c-1/leave-requests";
const LEAVE = `GET ${LEAVE_PATH}`;
const MY_LEAVE_PATH = "/api/v1/companies/c-1/me/leave-requests";
const MY_LEAVE = `GET ${MY_LEAVE_PATH}`;
const PEOPLE = "GET /api/v1/companies/c-1/member-profiles";
const LEAVE_TYPES_PATH = "/api/v1/companies/c-1/me/leave-types";
const AISHA = "/api/v1/companies/c-1/member-profiles/m-aisha/leave-requests";
const CHERYL = "/api/v1/companies/c-1/member-profiles/m-cheryl/leave-requests";
const ALL = [
	"leave_request:read",
	"leave_request:create",
	"leave_request:review",
];

type Call = { method: string; path: string; search: string; body: unknown };

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

const pageReply = (
	content: Array<unknown>,
	totalElements = content.length
): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements } }),
});

/**
 * A workspace holding `permissions` company-wide; `departmentOnly` holds them
 * at department d-1 of Main branch only. Main and Jurong branches are in
 * Singapore, Kuala Lumpur branch in Malaysia.
 */
const workspaceReply = (
	permissions: Array<string>,
	departmentOnly = false
): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions: departmentOnly ? [] : permissions,
					branches: [
						{
							uuid: "b-1",
							name: "Main branch",
							status: "ACTIVE",
							country: "SG",
							permissions: [],
							departments: [
								{
									uuid: "d-1",
									name: "Sales",
									status: "ACTIVE",
									permissions: departmentOnly ? permissions : [],
								},
								{
									uuid: "d-2",
									name: "Kitchen",
									status: "ACTIVE",
									permissions: [],
								},
							],
						},
						{
							uuid: "b-2",
							name: "Jurong branch",
							status: "ACTIVE",
							country: "SG",
							permissions: [],
							departments: [],
						},
						{
							uuid: "b-3",
							name: "Kuala Lumpur branch",
							status: "ACTIVE",
							country: "MY",
							permissions: [],
							departments: [],
						},
					],
				},
			],
		})
	),
});

const routes = (
	workspace: StubReply = workspaceReply(ALL)
): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspace,
	[LEAVE]: pageReply(LEAVE_FIXTURES, 24),
	[MY_LEAVE]: pageReply([LEAVE_FIXTURES[0], LEAVE_FIXTURES[3]], 2),
	[`GET ${LEAVE_TYPES_PATH}`]: {
		status: 200,
		body: envelope(LEAVE_TYPE_FIXTURES),
	},
	[`GET ${AISHA}/rostered-days`]: { status: 200, body: [] },
});

const searchesOf = (calls: Array<Call>, path: string): Array<string> =>
	calls.filter((call) => call.path === path).map((call) => call.search);

/** The Team requests tab's count: one pending row, newest first, across everything in reach. */
const PENDING_COUNT_SEARCH =
	"page=0&size=1&sort=requestedAt%2Cdesc&status=PENDING";

/** The lists and windows asked for, leaving out the tab's pending count. */
const listSearchesOf = (calls: Array<Call>): Array<string> =>
	searchesOf(calls, LEAVE_PATH).filter(
		(search) => search !== PENDING_COUNT_SEARCH
	);

const sent = (calls: Array<Call>, route: string): Array<unknown> =>
	calls
		.filter((call) => `${call.method} ${call.path}` === route)
		.map((call) => call.body);

/** Opens a row's approval step and confirms it, with a comment when one is given. */
const approveFromRow = async (
	user: ReturnType<typeof userEvent.setup>,
	name: string,
	comment = ""
): Promise<void> => {
	await user.click(
		screen.getByRole("button", { name: `Approve request for ${name}` })
	);
	const dialog = await screen.findByRole("dialog", { name: "Leave request" });
	if (comment)
		await user.type(
			within(dialog).getByRole("textbox", { name: "Comment (optional)" }),
			comment
		);
	await user.click(
		within(dialog).getByRole("button", { name: "Confirm approval" })
	);
};

describe("Leave", () => {
	it("lists the first Branch's requests a page at a time, as the API filters and sorts them", async () => {
		const calls = stubApi(routes());
		const { router } = await open("/leave?view=requests");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Leave overview" })
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "Requests" });
		await within(table).findByText("Aisha Rahman");
		// The header holds the Branch: with no home Branch, the first in scope by name.
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Jurong branch"
		);
		expect(screen.getByText("1–10 of 24 entries")).toBeVisible();
		expect(within(table).getByText("Rejected")).toHaveClass("bg-error-100");
		// The first Branch is shown, not written: the URL keeps only what the person chose.
		await waitFor(() => {
			expect(router.state.location.search).toEqual({ view: "requests" });
		});
		expect(listSearchesOf(calls)).toEqual([
			"page=0&size=10&sort=requestedAt%2Cdesc&branchId=b-2",
		]);
		expect(
			calls.filter((call) => call.path.endsWith("/branches"))
		).toHaveLength(0);
	});

	it("puts the Branch, status, sort and page in the URL and asks the API again", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		const { router } = await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");

		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(
			screen.getByRole("option", { name: "Kuala Lumpur branch" })
		);
		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				view: "requests",
				branch: "b-3",
			});
		});
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Kuala Lumpur branch"
		);
		await user.click(screen.getByRole("button", { name: "Filters" }));
		await user.click(screen.getByRole("button", { name: "Showing" }));
		await user.click(screen.getByRole("option", { name: "Pending" }));
		await user.click(screen.getByRole("button", { name: /Sort by Employee/i }));
		await user.click(screen.getByRole("button", { name: "Next page" }));
		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				view: "requests",
				branch: "b-3",
				status: "PENDING",
				sort: "displayName,asc",
				page: 2,
			});
		});
		const searches = listSearchesOf(calls);
		expect(searches[searches.length - 1]).toBe(
			"page=1&size=10&sort=displayName%2Casc&status=PENDING&branchId=b-3"
		);
	});

	it("lists every Branch's requests once All branches is chosen, naming it in the URL", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		const { router } = await open("/leave?view=requests&branch=b-1");
		await screen.findByText("Aisha Rahman");

		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "All branches" }));

		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				view: "requests",
				branch: "all",
			});
		});
		expect(listSearchesOf(calls)).toEqual([
			"page=0&size=10&sort=requestedAt%2Cdesc&branchId=b-1",
			"page=0&size=10&sort=requestedAt%2Cdesc",
		]);
		// The Branch is scope, not a filter: no chip. Every Department stays on offer under its Branch.
		expect(
			screen.queryByRole("list", { name: "Active filters" })
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Filters" }));
		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(
			within(screen.getByRole("group", { name: "Main branch" })).getByRole(
				"option",
				{ name: "Kitchen" }
			)
		);
		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				view: "requests",
				branch: "all",
				department: "d-2",
			});
		});
		expect(
			screen.getByRole("list", { name: "Active filters" })
		).toHaveTextContent("Department: Main branch › Kitchen");
		expect(listSearchesOf(calls).slice(-1)[0]).toBe(
			"page=0&size=10&sort=requestedAt%2Cdesc&departmentId=d-2"
		);
	});

	it("never selects, shows or asks for a Branch or Department outside the person's scope, whatever the URL says", async () => {
		// Read held only at Sales (d-1) of Main branch; Jurong (b-2) and Kitchen (d-2) are out of scope.
		const calls = stubApi(routes(workspaceReply(["leave_request:read"], true)));
		const { router } = await open(
			"/leave?view=requests&branch=b-2&department=d-2"
		);
		await screen.findByText("Aisha Rahman");

		// One Branch in scope: the header names it as text.
		expect(
			within(screen.getByRole("banner")).getByText("Main branch")
		).toBeVisible();
		await waitFor(() => {
			expect(router.state.location.search).not.toHaveProperty("branch");
		});
		expect(
			screen.queryByRole("list", { name: "Active filters" })
		).not.toBeInTheDocument();
		// The list falls back to the first Branch in scope, never naming the out-of-scope ids.
		expect(
			listSearchesOf(calls).every(
				(search) => !search.includes("b-2") && !search.includes("d-2")
			)
		).toBe(true);
		expect(listSearchesOf(calls).slice(-1)[0]).toBe(
			"page=0&size=10&sort=requestedAt%2Cdesc&branchId=b-1"
		);
	});

	it("draws the timeline from one window of requests and moves the window on the server", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		await open("/leave?view=timeline");

		expect(
			await screen.findByRole("tab", { name: "Team timeline" })
		).toHaveAttribute("aria-selected", "true");
		await screen.findByRole("button", { name: "Next period" });
		const [first] = listSearchesOf(calls);
		expect(first).toContain("size=200");
		expect(first).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
		await user.click(screen.getByRole("button", { name: "Next period" }));
		await waitFor(() => {
			expect(listSearchesOf(calls)).toHaveLength(2);
		});
	});

	it("draws the timeline across every Branch once All branches is chosen", async () => {
		const calls = stubApi(routes());
		await open("/leave?view=timeline&branch=all");

		await screen.findByRole("button", { name: "Next period" });
		await waitFor(() => {
			expect(listSearchesOf(calls)).toHaveLength(1);
		});
		expect(listSearchesOf(calls)[0]).not.toContain("branchId");
	});

	it("approves and rejects through the member's routes and reloads the list", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[`POST ${AISHA}/leave-aisha/approval`]: {
				status: 200,
				body: envelope(
					leaveFixture({ leaveRequestId: "leave-aisha", status: "APPROVED" })
				),
			},
			[`POST ${CHERYL}/leave-cheryl/rejection`]: {
				status: 200,
				body: envelope(LEAVE_FIXTURES[1]),
			},
		});
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");

		await approveFromRow(user, "Aisha Rahman", "Enjoy the break.");
		expect(
			await screen.findByText("Request for Aisha Rahman approved.")
		).toBeVisible();
		expect(sent(calls, `POST ${AISHA}/leave-aisha/approval`)).toEqual([
			{ comment: "Enjoy the break." },
		]);
		await user.click(
			screen.getByRole("button", { name: "Reject request for Cheryl Ng" })
		);
		const dialog = await screen.findByRole("dialog", { name: "Leave request" });
		await user.type(
			within(dialog).getByRole("textbox", { name: "Reason for rejection" }),
			"Coverage needed"
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Confirm rejection" })
		);
		expect(
			await screen.findByText("Request for Cheryl Ng rejected.")
		).toBeVisible();
		expect(sent(calls, `POST ${CHERYL}/leave-cheryl/rejection`)).toEqual([
			{ reason: "Coverage needed" },
		]);
		// Each decision reloads the list.
		await waitFor(() => {
			expect(listSearchesOf(calls)).toHaveLength(3);
		});
	});

	it("explains a refused decision without the API's own words", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes(),
			[`POST ${AISHA}/leave-aisha/approval`]: problemReply(
				409,
				"LEAVE_REQUEST_NOT_PENDING"
			),
		});
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");

		await approveFromRow(user, "Aisha Rahman");
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"This request was already decided. Reload the page to see it."
		);
	});

	it("applies on behalf of someone the person may apply for, and shows a refusal on the dates", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[PEOPLE]: pageReply([
				{
					membershipId: "m-aisha",
					employeeCode: "EMP-10517",
					displayName: "Aisha Rahman",
					email: "aisha@company.com",
					phone: null,
					branchId: "b-1",
					branchName: "Main branch",
					departmentId: "d-1",
					departmentName: "Sales",
					jobTitleId: null,
					jobTitleName: null,
					status: "ACTIVE",
				},
			]),
			[`POST ${AISHA}`]: [
				problemReply(409, "LEAVE_REQUEST_OVERLAPS"),
				{ status: 201, body: envelope(LEAVE_FIXTURES[0]) },
			],
		});
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");

		await user.click(screen.getByRole("button", { name: "Apply leave" }));
		const dialog = await screen.findByRole("dialog", { name: "Apply leave" });
		await user.type(
			within(dialog).getByRole("searchbox", { name: "Search employees" }),
			"Ais"
		);
		await waitFor(() => {
			const people = searchesOf(calls, "/api/v1/companies/c-1/member-profiles");
			expect(people[people.length - 1]).toContain("search=Ais");
		});
		await user.click(within(dialog).getByRole("button", { name: "Employee" }));
		await user.click(
			await screen.findByRole("option", { name: "Aisha Rahman · EMP-10517" })
		);
		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: "Type" })
			).toHaveTextContent("Annual leave");
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Submit request" })
		);
		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"They already have leave on one of these days."
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Submit request" })
		);
		expect(
			await screen.findByText("Leave request for Aisha Rahman submitted.")
		).toBeVisible();
		expect(sent(calls, `POST ${AISHA}`)).toHaveLength(2);
		expect(sent(calls, `POST ${AISHA}`)[0]).toEqual(
			expect.objectContaining({ leaveType: "ANNUAL" })
		);
	});

	it("says there is no Branch to show when the workspace offers none, and asks for no list", async () => {
		const calls = stubApi(
			routes({
				status: 200,
				body: envelope({
					companies: [
						{
							uuid: "c-1",
							name: "Company c-1",
							permissions: ALL,
							branches: [],
						},
					],
				}),
			})
		);
		await open("/leave?view=requests");

		expect(
			await screen.findByText(
				"Add a branch to the organisation before managing leave."
			)
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Branch" })
		).not.toBeInTheDocument();
		expect(listSearchesOf(calls)).toEqual([]);
	});

	it("offers decisions only where the key is held", async () => {
		const calls = stubApi(routes(workspaceReply(["leave_request:read"], true)));
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");

		// Only the Branch holding the key beneath it is offered, so no country is asked for.
		expect(
			screen.queryByRole("button", { name: "Country" })
		).not.toBeInTheDocument();
		expect(
			within(screen.getByRole("banner")).getByText("Main branch")
		).toBeVisible();
		expect(listSearchesOf(calls)).toEqual([
			"page=0&size=10&sort=requestedAt%2Cdesc&branchId=b-1",
		]);
		// Nothing to decide anywhere, so no pending count is asked for or shown.
		expect(searchesOf(calls, LEAVE_PATH)).not.toContain(PENDING_COUNT_SEARCH);
		expect(
			screen.getByRole("tab", { name: "Team requests" })
		).not.toHaveAttribute("aria-describedby");

		expect(
			screen.queryByRole("button", { name: "Apply leave" })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
		).toBeDisabled();
	});

	it("opens on the member's own leave, which needs nothing granted, and offers only that to someone holding the key nowhere", async () => {
		const calls = stubApi(routes(workspaceReply([])));
		await open("/leave");

		expect(
			await screen.findByRole("tab", { name: "My leave" })
		).toHaveAttribute("aria-selected", "true");
		expect(
			screen.queryByRole("tab", { name: "Team requests" })
		).not.toBeInTheDocument();
		const table = await screen.findByRole("table", { name: "Requests" });
		await within(table).findByText("Approved");
		expect(within(table).queryByText("Aisha Rahman")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Approve request for Aisha Rahman" })
		).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Leave" })).toBeInTheDocument();
		expect(searchesOf(calls, MY_LEAVE_PATH)).toEqual([
			"page=0&size=10&sort=requestedAt%2Cdesc",
		]);
		expect(listSearchesOf(calls)).toEqual([]);
	});

	it("applies for the member's own leave through the me route", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(workspaceReply([])),
			[`POST ${MY_LEAVE_PATH}`]: {
				status: 201,
				body: envelope(LEAVE_FIXTURES[0]),
			},
		});
		await open("/leave");
		await screen.findByRole("table", { name: "Requests" });

		await user.click(screen.getByRole("button", { name: "Apply for leave" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Apply for leave",
		});
		expect(
			within(dialog).queryByRole("searchbox", { name: "Search employees" })
		).not.toBeInTheDocument();
		// The company's leave types arrive once the dialog opens; the first is chosen.
		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: "Type" })
			).toHaveTextContent("Annual leave");
		});
		await user.click(within(dialog).getByRole("button", { name: "Type" }));
		await user.click(screen.getByRole("option", { name: "Sick leave" }));
		await user.click(
			within(dialog).getByRole("button", { name: "Submit request" })
		);
		expect(
			await screen.findByText("Your leave request was submitted.")
		).toBeVisible();
		expect(sent(calls, `POST ${MY_LEAVE_PATH}`)).toEqual([
			expect.objectContaining({ leaveType: "SICK" }),
		]);
		expect(searchesOf(calls, LEAVE_TYPES_PATH)).toEqual(["status=ACTIVE"]);
	});

	it("reads the leave types again from the dialog after they failed to load", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(workspaceReply([])),
			[`GET ${LEAVE_TYPES_PATH}`]: [
				problemReply(400, "BAD_REQUEST"),
				{ status: 200, body: envelope(LEAVE_TYPE_FIXTURES) },
			],
		});
		await open("/leave");
		await screen.findByRole("table", { name: "Requests" });

		await user.click(screen.getByRole("button", { name: "Apply for leave" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Apply for leave",
		});
		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"We couldn’t load the leave types."
		);
		await user.click(within(dialog).getByRole("button", { name: "Try again" }));

		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: "Type" })
			).toHaveTextContent("Annual leave");
		});
		expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
		expect(searchesOf(calls, LEAVE_TYPES_PATH)).toHaveLength(2);
	});

	it("keeps the team tabs for someone holding the read key, with their own leave first", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		const { router } = await open("/leave");

		expect(screen.getAllByRole("tab")).toEqual([
			screen.getByRole("tab", { name: "My leave" }),
			screen.getByRole("tab", { name: "Team requests" }),
			screen.getByRole("tab", { name: "Team timeline" }),
		]);
		await user.click(screen.getByRole("tab", { name: "Team requests" }));
		// The first Branch is shown, not written: the URL keeps only what the person chose.
		await waitFor(() => {
			expect(router.state.location.search).toEqual({ view: "requests" });
		});
		await screen.findByText("Cheryl Ng");
		expect(
			screen.getByRole("button", { name: "Apply leave" })
		).toBeInTheDocument();
	});

	it("shows how many requests wait for a decision on the Team requests tab, from any tab", async () => {
		const calls = stubApi(routes());
		await open("/leave");

		const tab = await screen.findByRole("tab", { name: "Team requests" });
		await waitFor(() => {
			expect(tab).toHaveAccessibleDescription("24 pending");
		});
		expect(within(tab).getByText("24")).toBeVisible();
		expect(searchesOf(calls, LEAVE_PATH)).toEqual([PENDING_COUNT_SEARCH]);
	});

	it("narrows the timeline's Branch to a Department and clears it back", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		const { router } = await open("/leave?view=timeline&branch=b-1");
		await screen.findByRole("button", { name: "Next period" });

		// The same header Branch as every page: "All branches" last.
		await user.click(screen.getByRole("button", { name: "Branch" }));
		const options = screen.getAllByRole("option");
		expect(options[options.length - 1]).toHaveTextContent("All branches");
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Filters" }));
		// The timeline has no status filter.
		expect(
			screen.queryByRole("button", { name: "Showing" })
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(screen.getByRole("option", { name: "Kitchen" }));
		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				view: "timeline",
				branch: "b-1",
				department: "d-2",
			});
		});
		expect(listSearchesOf(calls).slice(-1)[0]).toContain(
			"branchId=b-1&departmentId=d-2"
		);
		expect(
			screen.getByRole("list", { name: "Active filters" })
		).toHaveTextContent("Department: Main branch › Kitchen");

		await user.click(screen.getByRole("button", { name: "Clear filters" }));
		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				view: "timeline",
				branch: "b-1",
			});
		});
	});

	it("never offers to decide the person's own request, whatever their roles (M06)", async () => {
		// The person testing is `m-c-1`.
		const own = leaveFixture({
			leaveRequestId: "leave-own",
			membershipId: "m-c-1",
			displayName: "José",
		});
		stubApi({
			...routes(),
			[LEAVE]: pageReply([own, LEAVE_FIXTURES[0]], 2),
		});
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");

		expect(
			screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
		).toBeEnabled();
		expect(
			screen.getByRole("button", { name: "Approve request for José" })
		).toBeDisabled();
	});

	it("given_rosteredDays_when_approving_then_holdsApproveUntilTheReviewerConfirms", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[`GET ${AISHA}/rostered-days`]: {
				status: 200,
				body: [{ day: "2026-07-06", minutes: 480 }],
			},
			[`POST ${AISHA}/leave-aisha/approval`]: {
				status: 200,
				body: envelope(LEAVE_FIXTURES[0]),
			},
		});
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");
		await user.click(
			screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
		);
		const dialog = await screen.findByRole("dialog");
		const confirm = within(dialog).getByRole("button", {
			name: "Confirm approval",
		});
		await within(dialog).findByText(/is rostered on/);
		expect(confirm).toBeDisabled();

		await user.click(within(dialog).getByRole("checkbox"));
		await user.click(confirm);

		await waitFor(() => {
			expect(
				calls.find((call) => call.path.endsWith("/approval"))?.body
			).toEqual({ takeOffRosteredDays: true });
		});
	});

	it("given_aClashTheScreenDidNotKnowOf_when_approvalIsRefused_then_rereadsTheDaysAndAsksForTheConfirmation", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[`GET ${AISHA}/rostered-days`]: [
				{ status: 200, body: [] },
				{ status: 200, body: [{ day: "2026-07-06", minutes: 480 }] },
			],
			[`POST ${AISHA}/leave-aisha/approval`]: [
				problemReply(409, "LEAVE_CLASHES_WITH_ROSTER"),
				{ status: 200, body: envelope(LEAVE_FIXTURES[0]) },
			],
		});
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");
		await user.click(
			screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
		);
		const dialog = await screen.findByRole("dialog");
		const confirm = within(dialog).getByRole("button", {
			name: "Confirm approval",
		});
		await waitFor(() => {
			expect(confirm).toBeEnabled();
		});

		await user.click(confirm);

		const takeOff = await within(dialog).findByRole("checkbox");
		expect(confirm).toBeDisabled();
		await user.click(takeOff);
		await user.click(confirm);
		await waitFor(() => {
			expect(
				calls.filter((call) => call.path.endsWith("/approval")).pop()?.body
			).toEqual({ takeOffRosteredDays: true });
		});
	});

	it("given_theRosterCouldNotBeRead_when_approving_then_holdsApproveUntilARetryReadsIt", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes(),
			[`GET ${AISHA}/rostered-days`]: [
				problemReply(404, "SOMETHING_ELSE"),
				{ status: 200, body: [{ day: "2026-07-06", minutes: 480 }] },
			],
		});
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");
		await user.click(
			screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
		);
		const dialog = await screen.findByRole("dialog");
		const confirm = within(dialog).getByRole("button", {
			name: "Confirm approval",
		});

		await within(dialog).findByText(/couldn’t check the roster/);
		expect(confirm).toBeDisabled();

		await user.click(within(dialog).getByRole("button", { name: "Try again" }));

		await within(dialog).findByText(/is rostered on/);
		expect(within(dialog).getByRole("checkbox")).toBeInTheDocument();
		expect(confirm).toBeDisabled();
	});

	it("explains the server's own-review refusal in its own words, without reloading the workspace", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[`POST ${AISHA}/leave-aisha/approval`]: problemReply(
				403,
				"OWN_LEAVE_REVIEW_DENIED"
			),
		});
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");
		const workspaces = calls.filter(
			(call) => `${call.method} ${call.path}` === WORKSPACE
		).length;

		await approveFromRow(user, "Aisha Rahman");
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"You can’t approve or reject your own leave. Another reviewer needs to decide it."
		);
		expect(
			calls.filter((call) => `${call.method} ${call.path}` === WORKSPACE)
		).toHaveLength(workspaces);
	});

	it("keeps My leave usable when the workspace fails, offering no team views (M09, F10)", async () => {
		const calls = stubApi(
			routes(problemReply(503, "AUTHORIZATION_UNAVAILABLE"))
		);
		await open("/leave");

		expect(
			await screen.findByRole("tab", { name: "My leave" })
		).toHaveAttribute("aria-selected", "true");
		const table = await screen.findByRole("table", { name: "Requests" });
		await within(table).findByText("Approved");
		expect(
			screen.getByRole("button", { name: "Apply for leave" })
		).toBeEnabled();
		expect(
			screen.queryByRole("tab", { name: "Team requests" })
		).not.toBeInTheDocument();
		expect(listSearchesOf(calls)).toEqual([]);
	});
});
