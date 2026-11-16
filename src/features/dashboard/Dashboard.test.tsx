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
import {
	shortageFixture,
	teamCoverOfferFixture,
} from "@/features/dashboard/fixtures";
import { leaveFixture } from "@/features/leave/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const LEAVE_PATH = "/api/v1/companies/c-1/leave-requests";
const SCHEDULES_PATH = "/api/v1/companies/c-1/schedules";
const LEAVE = `GET ${LEAVE_PATH}`;
const AUDIT_EVENTS = "GET /api/v1/companies/c-1/audit-events";
const APPROVE =
	"POST /api/v1/companies/c-1/member-profiles/m-aisha/leave-requests/leave-aisha/approval";
// Approving reads the member's rostered days first, to ask about any clash.
const ROSTERED_DAYS =
	"GET /api/v1/companies/c-1/member-profiles/m-aisha/leave-requests/rostered-days";

let app: OpenedApp | undefined;
/** Approving leave before today needs a comment; the fixtures' leave is in May 2026. */
const BEFORE_THE_FIXTURES_LEAVE = Date.parse("2026-05-01T08:00:00Z");
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

/** Pending leave: one request shown of 3. Approved leave, read for who is off: none. */
const leaveByStatus = (call: { search: string }): StubReply => {
	const status = new URLSearchParams(call.search).get("status");
	if (status === "APPROVED") return page([], 0);
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
	[ROSTERED_DAYS]: { status: 200, body: envelope([]) },
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
	it("given_grants_when_opened_then_listsWhatNeedsThePersonInOneTopAlignedColumn", async () => {
		stubApi(routes());
		await open();

		await screen.findByRole("heading", { level: 1, name: "Dashboard" });
		// The greeting lives on the dashboard only: in the header from lg, on the page below it.
		expect(screen.getByRole("banner")).toHaveTextContent("Welcome, José.");
		const pageGreeting = within(screen.getByRole("main")).getByText(
			(_, element) =>
				element?.tagName === "P" && element.textContent === "Welcome, José."
		);
		expect(pageGreeting).toHaveClass("lg:hidden");
		const leave = await screen.findByRole("region", {
			name: "Pending leave requests",
		});
		expect(
			await within(leave).findByText("from Aisha Rahman", { exact: false })
		).toBeInTheDocument();
		// One grid, one column, aligned to the top: no card stretches to a neighbour or sits alone.
		const grid = leave.parentElement;
		expect(grid).toHaveClass("grid", "grid-cols-1", "items-start");
		// Approvals appear once: no Pending Approvals tile, no notifications list, no shortcuts.
		expect(
			screen.queryByRole("region", { name: "Pending Approvals" })
		).toBeNull();
		expect(screen.queryByRole("list", { name: "Quick Actions" })).toBeNull();
		expect(
			screen.getByRole("link", { name: "Recent Activity" })
		).toHaveAttribute("href", "/activity");
	});

	it("given_moreLeaveThanFiveRows_when_opened_then_listsFiveAndLinksToTheRest", async () => {
		const pending = Array.from({ length: 7 }, (_, index) =>
			leaveFixture({ leaveRequestId: `leave-${index}` })
		);
		stubApi({
			...routes(),
			[LEAVE]: (call) =>
				new URLSearchParams(call.search).get("status") === "PENDING"
					? page(pending, 7)
					: page([], 0),
		});
		await open();

		const leave = await screen.findByRole("region", {
			name: "Pending leave requests",
		});
		expect(await within(leave).findAllByRole("listitem")).toHaveLength(5);
		expect(
			within(leave).getByRole("link", { name: "See all 7" })
		).toHaveAttribute("href", "/leave");
		// The full list is a page of its own, so the card offers no toggle.
		expect(
			within(leave).queryByRole("button", { name: /^Show all/ })
		).toBeNull();
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
		// Before the fixture's leave starts, so the optional comment stays optional.
		vi.spyOn(Date, "now").mockReturnValue(BEFORE_THE_FIXTURES_LEAVE);
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

	it("given_noGrants_when_opened_then_leavesOutWhatTheyCannotActOn", async () => {
		const calls = stubApi(routes([]));
		await open();

		await waitFor(() => {
			expect(
				screen.queryByRole("link", { name: "Recent Activity" })
			).toBeNull();
		});
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
		expect(calls.some((call) => call.path.startsWith(SCHEDULES_PATH))).toBe(
			false
		);
		expect(screen.queryByRole("region", { name: "Shifts short" })).toBeNull();
	});

	it("given_rosterGrants_when_opened_then_leadsToTheShortShiftAndShowsEachCard", async () => {
		stubApi({
			...routes(["schedule:read", "schedule:edit_shift", "leave_request:read"]),
			[`GET ${SCHEDULES_PATH}/shortages`]: {
				status: 200,
				body: envelope({
					from: "2026-11-16",
					to: "2026-11-29",
					shortages: [shortageFixture()],
				}),
			},
			[`GET ${SCHEDULES_PATH}/cover-offers`]: {
				status: 200,
				body: envelope({ offers: [teamCoverOfferFixture()] }),
			},
			[`GET ${SCHEDULES_PATH}/days-off`]: {
				status: 200,
				body: envelope({ from: "2026-11-16", to: "2026-11-17", daysOff: [] }),
			},
			["GET /api/v1/companies/c-1/schedule-months"]: {
				status: 200,
				body: envelope([]),
			},
		});
		await open();

		const short = await screen.findByRole("region", { name: "Shifts short" });
		expect(
			await within(short).findByRole("link", { name: /Morning/ })
		).toHaveAttribute(
			"href",
			"/scheduling/s-1?week=2026-11-16&day=2026-11-18&cover=fs-am%7C2026-11-18"
		);
		const offers = screen.getByRole("region", { name: "Cover offers waiting" });
		expect(
			await within(offers).findByText(/Kent Chua has not answered/)
		).toBeInTheDocument();
		expect(
			screen.getByRole("region", { name: "Next roster" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("region", { name: "Off today and tomorrow" })
		).toBeInTheDocument();
		expect(screen.queryByText("Example")).toBeNull();
	});
});

const PREFERENCES_PATH = "/api/v1/companies/c-1/me/dashboard-preferences";

/** The member's saved choice: these sections hidden. */
const savedHidden = (hiddenSections: Array<string>): StubReply => ({
	status: 200,
	body: envelope({ hiddenSections }),
});

/** Whether Home asked for pending leave, the read behind "Pending leave requests". */
const askedForPendingLeave = (
	calls: Array<{ method: string; path: string; search: string }>
): boolean =>
	calls.some(
		(call) =>
			`${call.method} ${call.path}` === LEAVE &&
			new URLSearchParams(call.search).get("status") === "PENDING"
	);

describe("Customise Home", () => {
	it("given_nothingSaved_when_opened_then_showsEverySection", async () => {
		stubApi({ ...routes(), [`GET ${PREFERENCES_PATH}`]: savedHidden([]) });
		await open();

		expect(
			await screen.findByRole("region", { name: "Pending leave requests" })
		).toBeInTheDocument();
	});

	it("given_aHiddenSection_when_opened_then_neitherShowsNorReadsIt", async () => {
		const calls = stubApi({
			...routes(),
			[`GET ${PREFERENCES_PATH}`]: savedHidden(["leave-to-decide"]),
		});
		await open();

		await screen.findByRole("button", { name: "Customise" });
		await waitFor(() => {
			expect(calls.some((call) => call.path === PREFERENCES_PATH)).toBe(true);
		});
		expect(
			screen.queryByRole("region", { name: "Pending leave requests" })
		).toBeNull();
		expect(askedForPendingLeave(calls)).toBe(false);
	});

	it("given_anUnknownSavedKey_when_opened_then_ignoresIt", async () => {
		stubApi({
			...routes(),
			[`GET ${PREFERENCES_PATH}`]: savedHidden(["a-retired-section"]),
		});
		await open();

		expect(
			await screen.findByRole("region", { name: "Pending leave requests" })
		).toBeInTheDocument();
	});

	it("given_theDialog_when_aSectionIsCleared_then_hidesItAndSavesTheChoice", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[`GET ${PREFERENCES_PATH}`]: savedHidden([]),
			[`PUT ${PREFERENCES_PATH}`]: savedHidden(["leave-to-decide"]),
		});
		await open();
		await screen.findByRole("region", { name: "Pending leave requests" });

		await user.click(screen.getByRole("button", { name: "Customise" }));
		await user.click(
			await screen.findByRole("checkbox", { name: "Pending leave requests" })
		);
		await user.click(screen.getByRole("button", { name: "Done" }));

		await waitFor(() => {
			expect(
				screen.queryByRole("region", { name: "Pending leave requests" })
			).toBeNull();
		});
		expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
			hiddenSections: ["leave-to-decide"],
		});
	});

	it("given_hiddenSections_when_reset_then_showsEverySectionAgain", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[`GET ${PREFERENCES_PATH}`]: savedHidden(["leave-to-decide"]),
			[`PUT ${PREFERENCES_PATH}`]: savedHidden([]),
		});
		await open();

		await user.click(await screen.findByRole("button", { name: "Customise" }));
		await user.click(
			await screen.findByRole("button", { name: "Reset to default" })
		);
		await user.click(screen.getByRole("button", { name: "Done" }));

		expect(
			await screen.findByRole("region", { name: "Pending leave requests" })
		).toBeInTheDocument();
		expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
			hiddenSections: [],
		});
	});

	it("given_aRefusedSave_when_aSectionIsCleared_then_putsItBackAndSaysSo", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes(),
			[`GET ${PREFERENCES_PATH}`]: savedHidden([]),
			[`PUT ${PREFERENCES_PATH}`]: { status: 500 },
		});
		await open();
		await screen.findByRole("region", { name: "Pending leave requests" });

		await user.click(screen.getByRole("button", { name: "Customise" }));
		const box = await screen.findByRole("checkbox", {
			name: "Pending leave requests",
		});
		await user.click(box);

		expect(
			await screen.findByText(/^We couldn’t save your choice\./)
		).toBeInTheDocument();
		expect(box).toBeChecked();
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
		expect(search).not.toContain("entityType");
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

		await screen.findByRole("region", { name: "Pending leave requests" });
		expect(
			screen.queryByRole("region", { name: "Set up your company" })
		).not.toBeInTheDocument();
		expect(
			calls.some((call) => call.path === `${COMPANY}/member-profiles`)
		).toBe(false);
	});
});
