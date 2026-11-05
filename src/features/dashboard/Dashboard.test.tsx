import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	companyWideWorkspace,
	effectiveWorkspace,
} from "@/common/testing/effectiveWorkspace";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { leaveFixture } from "@/features/leave/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const LEAVE_PATH = "/api/v1/companies/c-1/leave-requests";
const LEAVE = `GET ${LEAVE_PATH}`;
const AUDIT_EVENTS = "GET /api/v1/companies/c-1/audit-events";
const APPROVE =
	"POST /api/v1/companies/c-1/member-profiles/m-aisha/leave-requests/leave-aisha/approval";

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

const page = (content: Array<unknown>, totalElements: number): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements } }),
});

const workspaceReply = (permissions: Array<string>): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions,
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
									permissions: [],
								},
							],
						},
					],
				},
			],
		})
	),
});

/** Pending: 2 shown of 3; approved 5; rejected 2 — so 70% resolved. */
const leaveByStatus = (call: { search: string }): StubReply => {
	const status = new URLSearchParams(call.search).get("status");
	if (status === "APPROVED") return page([], 5);
	if (status === "REJECTED") return page([], 2);
	return page([leaveFixture({ leaveRequestId: "leave-aisha" })], 3);
};

const routes = (
	permissions: Array<string> = [
		"leave_request:read",
		"leave_request:review",
		"audit_event:read",
	]
): Record<string, StubReply | ((call: { search: string }) => StubReply)> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspaceReply(permissions),
	[LEAVE]: leaveByStatus,
	[AUDIT_EVENTS]: page(
		[
			{
				auditEventId: "e-1",
				action: "member_profile.create",
				entityType: "MemberProfile",
				entityId: "m-1",
				entityName: "Kent Chua",
				actorDisplayName: "Moses Lee",
				occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
			},
		],
		1
	),
});

const open = async (entry = "/"): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

describe("Dashboard", () => {
	it("given_grants_when_opened_then_showsApprovalsNotificationsAndActivity", async () => {
		stubApi(routes());
		await open();

		await screen.findByRole("heading", { level: 1, name: "Dashboard" });
		// The greeting lives on the dashboard only.
		expect(screen.getByRole("banner")).toHaveTextContent("Welcome, José.");
		const approvals = await screen.findByRole("region", {
			name: "Pending Approvals",
		});
		await within(approvals).findByText("3");
		expect(approvals).toHaveTextContent("70% Resolved");
		const notifications = screen.getByRole("region", {
			name: "Pending leave requests",
		});
		expect(
			await within(notifications).findByText("from Aisha Rahman", {
				exact: false,
			})
		).toBeInTheDocument();
		expect(within(notifications).queryByText("Example")).toBeNull();
		expect(
			await screen.findByText("Kent Chua added to People")
		).toBeInTheDocument();
		expect(
			screen.getByRole("list", { name: "Quick Actions" })
		).toBeInTheDocument();
	});

	it("given_severalBranches_when_theHeaderBranchChanges_then_theFiguresFollowIt", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			// Orchard (b-1) and Tampines (b-2), company-wide.
			[WORKSPACE]: {
				status: 200,
				body: envelope(
					companyWideWorkspace(["leave_request:read", "audit_event:read"])
				),
			},
		});
		const opened = await open();
		await screen.findByRole("heading", { level: 1, name: "Dashboard" });

		// The header holds the one Branch control: the dashboard has none of its own.
		const header = screen.getByRole("banner");
		expect(
			within(header).getByRole("button", { name: "Branch" })
		).toHaveTextContent("Orchard");
		expect(screen.getAllByRole("button", { name: "Branch" })).toHaveLength(1);
		await user.click(within(header).getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "All branches" }));

		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({ branch: "all" });
		});
		const branchesAsked = (): Array<string | null> =>
			calls
				.filter((call) => call.path === LEAVE_PATH)
				.map((call) => new URLSearchParams(call.search).get("branchId"));
		await waitFor(() => {
			expect(branchesAsked()).toContain(null);
		});
		expect(branchesAsked()).toContain("b-1");
	});

	it("given_aPendingRequest_when_approvedAndConfirmed_then_sendsIt", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[APPROVE]: {
				status: 200,
				body: envelope(
					leaveFixture({ leaveRequestId: "leave-aisha", status: "APPROVED" })
				),
			},
		});
		await open();
		const notifications = await screen.findByRole("region", {
			name: "Pending leave requests",
		});
		await within(notifications).findByText("from Aisha Rahman", {
			exact: false,
		});

		const approve = within(notifications).getAllByRole("button", {
			name: "Approve",
		})[0]!;
		await waitFor(() => {
			expect(approve).toBeEnabled();
		});
		await user.click(approve);
		// Approving asks for confirmation first, with an optional comment.
		expect(
			calls.filter((call) => `${call.method} ${call.path}` === APPROVE)
		).toHaveLength(0);
		const dialog = await screen.findByRole("dialog", { name: "Leave request" });
		await user.click(
			within(dialog).getByRole("button", { name: "Confirm approval" })
		);

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent(
				"Request for Aisha Rahman approved."
			);
		});
		expect(
			calls.filter((call) => `${call.method} ${call.path}` === APPROVE)
		).toHaveLength(1);
	});

	it("given_noGrants_when_opened_then_leavesOutApprovalsAndActivity", async () => {
		const calls = stubApi(routes([]));
		await open();

		await screen.findByRole("region", { name: "Active Workforce" });
		await waitFor(() => {
			expect(
				screen.queryByRole("region", { name: "Pending Approvals" })
			).toBeNull();
		});
		expect(
			screen.queryByRole("region", { name: "Recent Activity" })
		).toBeNull();
		expect(calls.some((call) => call.path.endsWith("/leave-requests"))).toBe(
			false
		);
		expect(calls.some((call) => call.path.endsWith("/audit-events"))).toBe(
			false
		);
	});
});

describe("Recent Activity", () => {
	it("given_activity_when_opened_then_listsItAPageAtATime", async () => {
		const calls = stubApi(routes());
		await open("/activity");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Recent Activity" })
		).toBeVisible();
		expect(
			await screen.findByText("Kent Chua added to People")
		).toBeInTheDocument();
		expect(
			screen.getByText("Kent Chua added to People").closest("li")
		).toHaveTextContent("by Moses Lee");
		const search = calls.find((call) =>
			call.path.endsWith("/audit-events")
		)?.search;
		expect(search).toContain("page=0&size=10");
		expect(search).toContain("entityType=LeaveRequest");
		expect(search).toContain("entityType=Schedule");
	});
});

describe("Set up your company", () => {
	const COMPANY = "/api/v1/companies/c-1";
	const SETUP_PERMISSIONS = [
		"branch:create",
		"branch:read",
		"department:read",
		"job_title:read",
		"member_profile:read",
		"member_profile:create",
	];

	const setupRoutes = (
		counts: {
			branches: number;
			departments: number;
			jobTitles: number;
			members: number;
		},
		permissions = SETUP_PERMISSIONS
	): ReturnType<typeof routes> => ({
		...routes(permissions),
		[`GET ${COMPANY}/branches`]: page([], counts.branches),
		[`GET ${COMPANY}/departments`]: page([], counts.departments),
		[`GET ${COMPANY}/job-titles`]: page([], counts.jobTitles),
		[`GET ${COMPANY}/member-profiles`]: page([], counts.members),
	});

	it("shows both steps to a new company, each with its import and a way by hand", async () => {
		stubApi(
			setupRoutes({ branches: 0, departments: 0, jobTitles: 0, members: 1 })
		);
		await open();

		const card = await screen.findByRole("region", {
			name: "Set up your company",
		});
		expect(card).toHaveTextContent("0 of 2");
		expect(
			within(card).getByRole("link", { name: "Import organisation" })
		).toHaveAttribute("href", "/settings/data/import-organisation");
		expect(
			within(card).getByRole("link", { name: "or add branches by hand" })
		).toHaveAttribute("href", "/organisation/branches");
		expect(
			within(card).getByRole("link", { name: "Import people →" })
		).toHaveAttribute("href", "/settings/data/import-people");
		expect(
			within(card).getByRole("link", { name: "or add people one by one" })
		).toHaveAttribute("href", "/people");
	});

	it("ticks the organisation once its units exist", async () => {
		stubApi(
			setupRoutes({ branches: 4, departments: 18, jobTitles: 36, members: 1 })
		);
		await open();

		const card = await screen.findByRole("region", {
			name: "Set up your company",
		});
		expect(card).toHaveTextContent("1 of 2");
		expect(card).toHaveTextContent(
			"Import organisation(done)4 branches · 18 departments · 36 job titles"
		);
		expect(
			within(card).queryByRole("link", { name: "Import organisation" })
		).not.toBeInTheDocument();
	});

	it("hides once units exist and the company has more than one member", async () => {
		stubApi(
			setupRoutes({ branches: 1, departments: 1, jobTitles: 1, members: 2 })
		);
		const opened = await open();

		// Every count has arrived, so the card has decided.
		await waitFor(() => {
			expect(
				opened.queryClient.getQueryData([
					"people",
					"c-1",
					"active-member-count",
				])
			).toBe(2);
		});
		expect(
			screen.queryByRole("region", { name: "Set up your company" })
		).not.toBeInTheDocument();
	});

	it("stays dismissed in this browser once dismissed", async () => {
		const user = userEvent.setup();
		stubApi(
			setupRoutes({ branches: 0, departments: 0, jobTitles: 0, members: 1 })
		);
		await open();
		const card = await screen.findByRole("region", {
			name: "Set up your company",
		});

		await user.click(
			within(card).getByRole("button", { name: "Dismiss set-up steps" })
		);

		expect(
			screen.queryByRole("region", { name: "Set up your company" })
		).not.toBeInTheDocument();
		expect(localStorage.getItem("horaion.setupChecklistDismissed.c-1")).toBe(
			"true"
		);
	});

	it("is not offered to someone who can import neither", async () => {
		const calls = stubApi(
			setupRoutes({ branches: 0, departments: 0, jobTitles: 0, members: 1 }, [
				"branch:read",
				"member_profile:read",
				"leave_request:read",
			])
		);
		await open();

		await screen.findByRole("region", { name: "Pending Approvals" });
		expect(
			screen.queryByRole("region", { name: "Set up your company" })
		).not.toBeInTheDocument();
		expect(
			calls.some((call) => call.path === `${COMPANY}/member-profiles`)
		).toBe(false);
	});
});
