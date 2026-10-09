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
import { LEAVE_FIXTURES, leaveFixture } from "@/features/leave/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const BRANCHES = "GET /api/v1/companies/c-1/branches";
const LEAVE_PATH = "/api/v1/companies/c-1/leave-requests";
const LEAVE = `GET ${LEAVE_PATH}`;
const MY_LEAVE_PATH = "/api/v1/companies/c-1/me/leave-requests";
const MY_LEAVE = `GET ${MY_LEAVE_PATH}`;
const PEOPLE = "GET /api/v1/companies/c-1/member-profiles";
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

const branch = (
	branchId: string,
	name: string,
	country: string
): Record<string, string> => ({
	branchId,
	name,
	code: branchId.toUpperCase(),
	city: name,
	country,
	status: "ACTIVE",
});

/** A workspace holding `permissions` company-wide; `departmentOnly` holds them at department d-1 only. */
const workspaceReply = (
	permissions: Array<string>,
	departmentOnly = false
): StubReply => ({
	status: 200,
	body: envelope({
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
				],
			},
		],
	}),
});

const routes = (
	workspace: StubReply = workspaceReply(ALL)
): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspace,
	[BRANCHES]: pageReply([
		branch("b-1", "Main branch", "SG"),
		branch("b-2", "Jurong branch", "SG"),
		branch("b-3", "Kuala Lumpur branch", "MY"),
	]),
	[LEAVE]: pageReply(LEAVE_FIXTURES, 24),
	[MY_LEAVE]: pageReply([LEAVE_FIXTURES[0], LEAVE_FIXTURES[3]], 2),
});

const searchesOf = (calls: Array<Call>, path: string): Array<string> =>
	calls.filter((call) => call.path === path).map((call) => call.search);

const sent = (calls: Array<Call>, route: string): Array<unknown> =>
	calls
		.filter((call) => `${call.method} ${call.path}` === route)
		.map((call) => call.body);

describe("Leave", () => {
	it("lists the first Branch's requests a page at a time, as the API filters and sorts them", async () => {
		const calls = stubApi(routes());
		await open("/leave?view=requests");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Leave overview" })
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "Requests" });
		await within(table).findByText("Aisha Rahman");
		expect(screen.getByRole("button", { name: "Country" })).toHaveTextContent(
			"Singapore"
		);
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Main branch"
		);
		expect(screen.getByText("1–10 of 24 entries")).toBeVisible();
		expect(within(table).getByText("Rejected")).toHaveClass("bg-error-100");
		expect(searchesOf(calls, LEAVE_PATH)).toEqual([
			"page=0&size=10&sort=requestedAt%2Cdesc&branchId=b-1",
		]);
	});

	it("puts the Branch, status, sort and page in the URL and asks the API again", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		const { router } = await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");

		await user.click(screen.getByRole("button", { name: "Country" }));
		await user.click(screen.getByRole("option", { name: "Malaysia" }));
		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				view: "requests",
				branch: "b-3",
			});
		});
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Kuala Lumpur branch"
		);
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
		const searches = searchesOf(calls, LEAVE_PATH);
		expect(searches[searches.length - 1]).toBe(
			"page=1&size=10&sort=displayName%2Casc&status=PENDING&branchId=b-3"
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
		const [first] = searchesOf(calls, LEAVE_PATH);
		expect(first).toContain("size=200");
		expect(first).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
		await user.click(screen.getByRole("button", { name: "Next period" }));
		await waitFor(() => {
			expect(searchesOf(calls, LEAVE_PATH)).toHaveLength(2);
		});
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

		await user.click(
			screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
		);
		expect(
			await screen.findByText("Request for Aisha Rahman approved.")
		).toBeVisible();
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
			expect(searchesOf(calls, LEAVE_PATH)).toHaveLength(3);
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

		await user.click(
			screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
		);
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

	it("offers decisions only where the key is held", async () => {
		stubApi(routes(workspaceReply(["leave_request:read"], true)));
		await open("/leave?view=requests");
		await screen.findByText("Aisha Rahman");

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
		expect(searchesOf(calls, LEAVE_PATH)).toEqual([]);
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
	});

	it("keeps the team tabs for someone holding the read key, with their own leave first", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		const { router } = await open("/leave");

		expect(
			screen.getAllByRole("tab").map((tab) => tab.textContent?.trim())
		).toEqual(["My leave", "Team requests", "Team timeline"]);
		await user.click(screen.getByRole("tab", { name: "Team requests" }));
		await waitFor(() => {
			expect(router.state.location.search).toEqual({ view: "requests" });
		});
		await screen.findByText("Cheryl Ng");
		expect(
			screen.getByRole("button", { name: "Apply leave" })
		).toBeInTheDocument();
	});
});
