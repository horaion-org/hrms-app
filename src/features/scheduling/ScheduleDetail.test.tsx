import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
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
import { frozenConstraintsFixture } from "@/features/scheduling/constraints/fixtures";
import {
	emptyFindingsFixture,
	generatedScheduleFixture,
	generationFindingsFixture,
	generationFixture,
	scheduleAssignmentsFixture,
	scheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

let app: OpenedApp | undefined;
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

/** The schedule's own routes, at its department: its roster, deletion and regeneration. */
const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
/** The schedule itself, read by its id alone. */
const SCHEDULE_READ = "/api/v1/companies/c-1/schedules/s-1";
const ASSIGNMENTS = `${SCHEDULE}/assignments`;
const ROSTER_URL = "/scheduling/s-1";

type Routes = Parameters<typeof stubApi>[0];
type Calls = ReturnType<typeof stubApi>;

/** Signed in to company c-1 holding `permissions` company-wide. */
const signedIn = (permissions = ["schedule:read"]): Routes => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(schedulingWorkspace(permissions)),
	},
});

const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

const openRoster = async (
	routes: Routes,
	entry = ROSTER_URL
): Promise<Calls> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi(routes);
	app = await openApp(entry);
	renderAuthApp(app);
	return calls;
};

const readsOf = (calls: Calls, path: string): Calls =>
	calls.filter((call) => call.method === "GET" && call.path === path);

it("opens an older link that also names the department, reading the schedule by its id", async () => {
	const calls = await openRoster(
		{
			...signedIn(),
			[`GET ${SCHEDULE_READ}`]: ok(scheduleFixture()),
		},
		"/scheduling/s-1?branchId=b-1&departmentId=d-1"
	);

	expect(await screen.findByRole("note")).toHaveTextContent(
		"This schedule is still a draft, so it has no roster yet."
	);
	expect(readsOf(calls, SCHEDULE_READ)).toHaveLength(1);
	expect(readsOf(calls, SCHEDULE)).toHaveLength(0);
	expect(
		screen.getByRole("link", { name: "Back to Overview" })
	).toHaveAttribute("href", "/scheduling");
});

it("shows a generated schedule's header, figures and roster from the API", async () => {
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});

	expect(
		await screen.findByRole("row", { name: /Aisha Rahman/ })
	).toBeInTheDocument();
	expect(
		screen.getByRole("heading", { level: 1, name: "Front Office Schedule" })
	).toBeInTheDocument();
	expect(screen.getByText("Generated")).toBeInTheDocument();
	expect(screen.getByText("Times in Asia/Singapore")).toBeInTheDocument();
	expect(
		screen.getByText(/Requested by José on Oct 9, 2026, 6:00/)
	).toHaveTextContent(/Finished on Oct 9, 2026, 6:02/);

	const figures = {
		"Staff Rostered": "3of 3 staff",
		"Shifts Assigned": "15",
		"Days Off": "4",
		"On Leave": "2",
		Conflicts: "1",
	};
	for (const [title, figure] of Object.entries(figures))
		expect(screen.getByRole("region", { name: title })).toHaveTextContent(
			figure
		);
	expect(screen.queryByRole("region", { name: "Coverage" })).toBeNull();
	expect(screen.queryByRole("region", { name: "Open Shifts" })).toBeNull();

	const roster = screen.getByRole("table", { name: "Roster" });
	expect(within(roster).getAllByRole("row")).toHaveLength(4);
	const ben = within(roster).getByRole("row", { name: /Ben Ong/ });
	expect(within(ben).getAllByText("LEAVE")).toHaveLength(2);
	expect(screen.getByRole("list", { name: "Legend" })).toHaveTextContent(
		"Day OffOn LeaveFront Desk AMLunch RushSwing Shift"
	);
	expect(readsOf(calls, ASSIGNMENTS)).toHaveLength(1);
});

it("links a schedule to its setup in the wizard", async () => {
	await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});

	const link = await screen.findByRole("link", { name: "View setup" });
	const target = new URL(link.getAttribute("href")!, "http://localhost");
	expect(target.pathname).toBe("/scheduling/new");
	expect(Object.fromEntries(target.searchParams)).toEqual({
		step: "setup",
		scheduleId: "s-1",
		departmentId: "d-1",
	});
});

it("deletes the schedule from the header's menu and goes back to the overview", async () => {
	const calls = await openRoster({
		...signedIn(["schedule:read", "schedule:delete"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`DELETE ${SCHEDULE}`]: { status: 204 },
		"GET /api/v1/companies/c-1/schedules": ok({
			content: [],
			page: { hasNext: false },
		}),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", {
			name: "More actions for Front Office - Week 42",
		})
	);
	await user.click(screen.getByRole("menuitem", { name: "Delete" }));
	await user.click(
		within(
			screen.getByRole("dialog", { name: "Delete Front Office - Week 42?" })
		).getByRole("button", { name: "Delete schedule" })
	);

	expect(
		await screen.findByRole("heading", { level: 1, name: "Schedule overview" })
	).toBeInTheDocument();
	expect(app?.router.state.location.pathname).toBe("/scheduling");
	expect(
		calls.filter((call) => call.method === "DELETE" && call.path === SCHEDULE)
	).toHaveLength(1);
});

it("offers no header menu without schedule:delete", async () => {
	await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});

	await screen.findByRole("link", { name: "View setup" });
	expect(
		screen.queryByRole("button", {
			name: "More actions for Front Office - Week 42",
		})
	).toBeNull();
});

it("regenerates a generated roster after a danger confirm, then follows the new run", async () => {
	const calls = await openRoster({
		...signedIn(["schedule:read", "schedule:generate"]),
		[`GET ${SCHEDULE_READ}`]: [
			ok(generatedScheduleFixture({ status: "GENERATED" })),
			ok(generatedScheduleFixture({ status: "GENERATION_REQUESTED" })),
		],
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`POST ${SCHEDULE}/regeneration`]: ok(
			generatedScheduleFixture({ status: "GENERATION_REQUESTED" })
		),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", { name: "Regenerate roster" })
	);
	const dialog = screen.getByRole("dialog", {
		name: "Regenerate this roster?",
	});
	expect(dialog).toHaveTextContent(
		"A new run replaces the current roster. It keeps this schedule’s setup, shifts and constraints, and reads its staff, approved leave and availability again."
	);
	const confirm = within(dialog).getByRole("button", {
		name: "Regenerate roster",
	});
	expect(confirm).toHaveClass("not-disabled:bg-error-600!");
	await user.click(confirm);

	expect(await screen.findByRole("note")).toHaveTextContent(
		"This schedule is being generated."
	);
	expect(screen.queryByRole("dialog")).toBeNull();
	expect(
		screen.queryByRole("button", { name: "Regenerate roster" })
	).toBeNull();
	expect(
		calls.filter(
			(call) =>
				call.method === "POST" && call.path === `${SCHEDULE}/regeneration`
		)
	).toHaveLength(1);
});

it("offers to generate a failed schedule again from its failure panel", async () => {
	const calls = await openRoster({
		...signedIn(["schedule:read", "schedule:generate"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATION_FAILED" })
		),
		[`POST ${SCHEDULE}/regeneration`]: ok(
			generatedScheduleFixture({ status: "GENERATION_REQUESTED" })
		),
	});
	const user = userEvent.setup();

	const panel = await screen.findByRole("region", {
		name: "Why it wasn’t generated",
	});
	await user.click(
		within(panel).getByRole("button", { name: "Generate again" })
	);
	const dialog = screen.getByRole("dialog", {
		name: "Try generating again?",
	});
	expect(dialog).not.toHaveTextContent("replaces the current roster");
	const confirm = within(dialog).getByRole("button", {
		name: "Generate again",
	});
	expect(confirm).not.toHaveClass("not-disabled:bg-error-600!");
	await user.click(confirm);

	await waitFor(() => {
		expect(
			calls.filter(
				(call) =>
					call.method === "POST" && call.path === `${SCHEDULE}/regeneration`
			)
		).toHaveLength(1);
	});
});

it("shows a refused regeneration inside the dialog and keeps it open", async () => {
	await openRoster({
		...signedIn(["schedule:read", "schedule:generate"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`POST ${SCHEDULE}/regeneration`]: problemReply(
			409,
			"SCHEDULE_GENERATION_IN_PROGRESS"
		),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", { name: "Regenerate roster" })
	);
	const dialog = screen.getByRole("dialog", {
		name: "Regenerate this roster?",
	});
	await user.click(
		within(dialog).getByRole("button", { name: "Regenerate roster" })
	);

	expect(await within(dialog).findByRole("alert")).toHaveTextContent(
		"This schedule is being generated. Try again once the run finishes."
	);
	expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it.each([
	[
		"without schedule:generate",
		["schedule:read"],
		generatedScheduleFixture({ status: "GENERATED" }),
	],
	[
		"while it is being generated",
		["schedule:read", "schedule:generate"],
		generatedScheduleFixture({ status: "GENERATION_REQUESTED" }),
	],
	[
		"while it is a draft",
		["schedule:read", "schedule:generate"],
		scheduleFixture(),
	],
] as const)("offers no regeneration %s", async (_, permissions, schedule) => {
	await openRoster({
		...signedIn([...permissions]),
		[`GET ${SCHEDULE_READ}`]: ok(schedule),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});

	await screen.findByRole("link", { name: "View setup" });
	expect(
		screen.queryByRole("button", { name: "Regenerate roster" })
	).toBeNull();
});

it("shows a chosen day's shift read-only", async () => {
	await openRoster({
		...signedIn([
			"schedule:read",
			"shift:read",
			"shift:update",
			"shift:delete",
		]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", {
			name: "Ben Ong, Fri 11:00 – 13:00",
		})
	);

	const panel = screen.getByRole("complementary", { name: "Shift Details" });
	expect(panel).toHaveTextContent("Ben Ong");
	expect(panel).toHaveTextContent("ShiftLunch Rush");
	expect(panel).toHaveTextContent("RoleCashier");
	expect(panel).toHaveTextContent("Time11:00 – 13:00");
	expect(screen.queryByRole("button", { name: "Edit Shift" })).toBeNull();
	expect(screen.queryByRole("button", { name: "Delete Shift" })).toBeNull();
	expect(screen.queryByRole("button", { name: "Reassign Shift" })).toBeNull();
});

/** The frozen shifts and constraints that name the findings, readable with `shift:read` and `constraint:read`. */
const FROZEN_SETUP: Routes = {
	[`GET ${SCHEDULE}/shifts`]: ok(frozenShiftsFixture()),
	[`GET ${SCHEDULE}/constraints`]: ok(frozenConstraintsFixture()),
};

const generatedWith = (findings = generationFindingsFixture()): StubReply =>
	ok(
		generatedScheduleFixture({
			status: "GENERATED",
			generation: generationFixture({ findings }),
		})
	);

it("summarises what the engine found and lists it in the findings panel", async () => {
	const calls = await openRoster({
		...signedIn(["schedule:read", "shift:read", "constraint:read"]),
		...FROZEN_SETUP,
		[`GET ${SCHEDULE_READ}`]: generatedWith(),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});
	const user = userEvent.setup();

	expect(
		await screen.findByText(
			"The scheduling engine left 3 roster notes and 1 setup issue."
		)
	).toBeInTheDocument();
	expect(screen.queryByRole("region", { name: /Setup issues/ })).toBeNull();
	await user.click(screen.getByRole("button", { name: "Show details" }));

	const setup = screen.getByRole("region", { name: "Setup issues (1)" });
	expect(setup).toHaveTextContent("Shifts nobody can take · 1");
	expect(setup).toHaveTextContent(
		"No one in this schedule can take Breakfast Prep."
	);
	expect(
		within(setup).getByText(
			"Shift Breakfast Prep: no employee holds an eligible role."
		).tagName
	).toBe("Q");
	const roster = screen.getByRole("region", { name: "Roster notes (3)" });
	expect(roster).toHaveTextContent("Sat, Oct 1709:00 – 15:00•1 person short");
	expect(roster).toHaveTextContent("Rule: Morning cover");
	expect(roster).toHaveTextContent(
		"Ben OngBen Ong works more than five days in a row."
	);
	expect(roster).toHaveTextContent(
		"Chen WeiSun, Oct 18Chen Wei covers the Sunday swing alone."
	);
	expect(screen.queryByRole("dialog")).toBeNull();
	await waitFor(() => {
		expect(readsOf(calls, `${SCHEDULE}/constraints`)).toHaveLength(1);
	});

	await user.click(screen.getByRole("button", { name: "Hide details" }));
	expect(screen.queryByRole("region", { name: "Roster notes (3)" })).toBeNull();
});

it("names findings without reading the setup it can't see", async () => {
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: generatedWith(),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});
	const user = userEvent.setup();

	await user.click(await screen.findByRole("button", { name: "Show details" }));

	expect(
		screen.getByRole("region", { name: "Roster notes (3)" })
	).toHaveTextContent("Rule: Shift staffing");
	expect(
		screen.getByRole("region", { name: "Setup issues (1)" })
	).toHaveTextContent("No one in this schedule can take one of its shifts.");
	expect(readsOf(calls, `${SCHEDULE}/shifts`)).toHaveLength(0);
	expect(readsOf(calls, `${SCHEDULE}/constraints`)).toHaveLength(0);
});

it("marks findings on the roster and opens one in a popover", async () => {
	await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: generatedWith(),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});
	const user = userEvent.setup();

	const roster = await screen.findByRole("table", { name: "Roster" });
	expect(
		within(roster).getByRole("button", {
			name: "1 note for Saturday, October 17",
		})
	).toBeInTheDocument();
	expect(
		within(roster).getByRole("button", { name: "1 note for Ben Ong" })
	).toBeInTheDocument();
	expect(
		within(roster).getByRole("button", {
			name: "Chen Wei, Sun 14:00 – 22:00, 1 note",
		})
	).toBeInTheDocument();
	await user.click(
		within(roster).getByRole("button", {
			name: "1 note for Chen Wei on Sunday, October 18",
		})
	);

	const popover = await screen.findByRole("dialog", {
		name: "1 note for Chen Wei on Sunday, October 18",
	});
	expect(
		within(popover).getByText("Chen Wei covers the Sunday swing alone.").tagName
	).toBe("Q");
	await user.click(
		within(popover).getByRole("button", { name: "Show in findings" })
	);

	expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute(
		"aria-expanded",
		"true"
	);
	expect(
		screen.getByRole("region", { name: "Roster notes (3)" })
	).toBeInTheDocument();
});

it("shows nothing about findings when the engine found nothing", async () => {
	await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: generatedWith(emptyFindingsFixture()),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});

	const roster = await screen.findByRole("table", { name: "Roster" });
	expect(screen.queryByText(/The scheduling engine left/)).toBeNull();
	expect(screen.queryByRole("button", { name: "Show details" })).toBeNull();
	expect(within(roster).queryByRole("button", { name: /note/ })).toBeNull();
});

it("reads a schedule being generated every 15 seconds until its roster is ready", async () => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: [
			ok(generatedScheduleFixture({ status: "GENERATION_REQUESTED" })),
			ok(generatedScheduleFixture({ status: "GENERATION_REQUESTED" })),
			ok(generatedScheduleFixture({ status: "GENERATED" })),
		],
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});

	expect(await screen.findByRole("note")).toHaveTextContent(
		"This schedule is being generated."
	);
	expect(screen.getByText("Generation requested")).toBeInTheDocument();
	expect(readsOf(calls, SCHEDULE_READ)).toHaveLength(1);

	await vi.advanceTimersByTimeAsync(15_000);
	expect(readsOf(calls, SCHEDULE_READ)).toHaveLength(2);
	expect(screen.getByRole("note")).toHaveTextContent(
		"This schedule is being generated."
	);
	expect(readsOf(calls, ASSIGNMENTS)).toHaveLength(0);

	await vi.advanceTimersByTimeAsync(15_000);
	expect(
		await screen.findByRole("row", { name: /Aisha Rahman/ })
	).toBeInTheDocument();
	expect(readsOf(calls, SCHEDULE_READ)).toHaveLength(3);
	expect(readsOf(calls, ASSIGNMENTS)).toHaveLength(1);

	await vi.advanceTimersByTimeAsync(45_000);
	expect(readsOf(calls, SCHEDULE_READ)).toHaveLength(3);
});

it("explains a failed run by its error code, without asking for a roster", async () => {
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATION_FAILED" })
		),
	});

	const panel = await screen.findByRole("region", {
		name: "Why it wasn’t generated",
	});
	expect(panel).toHaveTextContent(
		"The engine couldn’t use this schedule’s shifts and constraints."
	);
	expect(panel).toHaveTextContent("Error code: snapshot_invalid");
	expect(screen.getByText("Generation failed")).toBeInTheDocument();
	expect(screen.queryByRole("table", { name: "Roster" })).toBeNull();
	expect(readsOf(calls, ASSIGNMENTS)).toHaveLength(0);
});

it("quotes the engine's reason and errors by member when no roster could meet the rules", async () => {
	await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({
				status: "GENERATION_FAILED",
				generation: generationFixture({
					status: "SUCCEEDED",
					engineOutcome: "INFEASIBLE",
					errorCode: null,
					findings: generationFindingsFixture({
						scheduleStatus: "INFEASIBLE",
						failureReason: "No roster satisfies the staffing rules",
						errors: [
							{
								employeeId: "mp-2",
								date: null,
								messages: ["Ben Ong cannot cover Saturday."],
							},
							{
								employeeId: "mp-9",
								date: "2026-10-17",
								messages: ["An unknown member is short of rest."],
							},
						],
						members: [
							{
								memberProfileId: "mp-2",
								membershipId: "m-2",
								displayName: "Ben Ong",
							},
							{
								memberProfileId: "mp-9",
								membershipId: null,
								displayName: null,
							},
						],
					}),
				}),
			})
		),
	});

	const panel = await screen.findByRole("region", {
		name: "Why it wasn’t generated",
	});
	expect(panel).toHaveTextContent(
		"No roster could meet every shift and constraint of this schedule."
	);
	expect(panel).not.toHaveTextContent("Error code");
	expect(
		within(panel).getByText("No roster satisfies the staffing rules").tagName
	).toBe("BLOCKQUOTE");
	const byMember = within(panel).getByRole("region", {
		name: "Notes by member",
	});
	expect(byMember).toHaveTextContent(
		"Notes by memberBen OngBen Ong cannot cover Saturday.mp-9Sat, Oct 17An unknown member is short of rest."
	);
	expect(
		within(byMember).getByText("Ben Ong cannot cover Saturday.").tagName
	).toBe("Q");
	expect(
		within(byMember).getByText("An unknown member is short of rest.").tagName
	).toBe("Q");
});

it("shows a draft reached by its URL with a link to its setup", async () => {
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(scheduleFixture()),
	});

	expect(await screen.findByRole("note")).toHaveTextContent(
		"This schedule is still a draft, so it has no roster yet."
	);
	expect(screen.getByRole("link", { name: "View setup" })).toBeInTheDocument();
	expect(readsOf(calls, ASSIGNMENTS)).toHaveLength(0);
});

it.each([
	["without schedule:read anywhere", [], undefined],
	["the API doesn't know", ["schedule:read"], { status: 404 }],
	["the API refuses", ["schedule:read"], { status: 403 }],
] as const)(
	"says a schedule %s can't be shown",
	async (_, permissions, reply) => {
		const calls = await openRoster({
			...signedIn([...permissions]),
			...(reply && { [`GET ${SCHEDULE_READ}`]: reply }),
		});

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"This schedule doesn’t exist or you don’t have permission to see it."
		);
		expect(screen.queryByRole("link", { name: "View setup" })).toBeNull();
		if (!reply) expect(readsOf(calls, SCHEDULE_READ)).toHaveLength(0);
	}
);
