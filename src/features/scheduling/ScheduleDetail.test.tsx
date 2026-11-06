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
	twoBranchSchedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import {
	editedAssignmentFixture,
	rosterChangeFixture,
	rosterChangePreviewFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import { midMonthOpenings } from "@/features/scheduling/hours/fixtures";
import { firstWeek } from "@/features/scheduling/startingContext/fixtures";

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

it.each(["GENERATED", "PUBLISHED", "REJECTED"] as const)(
	"offers only Export roster in the header menu of a %s roster without schedule:delete",
	async (status) => {
		await openRoster({
			...signedIn(),
			[`GET ${SCHEDULE_READ}`]: ok(generatedScheduleFixture({ status })),
			[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		});
		const user = userEvent.setup();

		await user.click(
			await screen.findByRole("button", {
				name: "More actions for Front Office - Week 42",
			})
		);

		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent)
		).toEqual(["Export roster"]);
	}
);

it("downloads the roster as a spreadsheet from the header's menu", async () => {
	const createObjectUrl = vi.fn(() => "blob:roster");
	// jsdom has no object URLs; a subclass stands in without changing the real URL.
	class DownloadUrl extends URL {
		public static override createObjectURL = createObjectUrl;
		public static override revokeObjectURL = vi.fn();
	}
	vi.stubGlobal("URL", DownloadUrl);
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`GET ${SCHEDULE}/export`]: {
			status: 200,
			body: "xlsx",
			headers: {
				"Content-Disposition":
					'attachment; filename="roster-front-office-2026-10-12.xlsx"',
			},
		},
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", {
			name: "More actions for Front Office - Week 42",
		})
	);
	await user.click(screen.getByRole("menuitem", { name: "Export roster" }));

	await waitFor(() => {
		expect(createObjectUrl).toHaveBeenCalled();
	});
	expect(
		calls
			.find((call) => call.path === `${SCHEDULE}/export`)
			?.headers.get("Accept")
	).toBe("*/*");
	// The app-level success toast (not mounted in page tests) reads this key.
	expect(
		app?.queryClient
			.getMutationCache()
			.getAll()
			.map((mutation) => mutation.options.meta?.successMessage)
	).toContain("scheduling.export.done");
});

it("says when the roster couldn't be downloaded and lets the person try again", async () => {
	await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`GET ${SCHEDULE}/export`]: { status: 500 },
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", {
			name: "More actions for Front Office - Week 42",
		})
	);
	await user.click(screen.getByRole("menuitem", { name: "Export roster" }));

	const dialog = await screen.findByRole("dialog", {
		name: "The roster couldn’t be downloaded",
	});
	expect(
		within(dialog).getByText("Check your connection and try again.")
	).toBeVisible();
	expect(
		within(dialog).getByRole("button", { name: "Try again" })
	).toBeEnabled();
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
	expect(confirm).toHaveClass("bg-error-600");
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

/** A run's roster in which only Ben and Chen are rostered: Aisha's rows are gone. */
const rosterWithoutAisha = (): ReturnType<typeof scheduleAssignmentsFixture> =>
	scheduleAssignmentsFixture().filter(
		(row) => row.member?.displayName !== "Aisha Rahman"
	);

/** Schedule s-1 with run `runId` in the state `status` implies. */
const scheduleAtRun = (
	status: "GENERATED" | "GENERATION_REQUESTED",
	runId: string
): ReturnType<typeof generatedScheduleFixture> => {
	const schedule = generatedScheduleFixture({ status });
	return { ...schedule, generation: { ...schedule.generation!, runId } };
};

it("shows the new run's roster once the poll reports it finished, without a reload", async () => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	// What the API answers now: the run-1 roster, none while run-2 is open, then run-2's.
	let roster = scheduleAssignmentsFixture();
	const calls = await openRoster({
		...signedIn(["schedule:read", "schedule:generate"]),
		[`GET ${SCHEDULE_READ}`]: [
			ok(scheduleAtRun("GENERATED", "run-1")),
			ok(scheduleAtRun("GENERATION_REQUESTED", "run-2")),
			ok(scheduleAtRun("GENERATED", "run-2")),
		],
		[`GET ${ASSIGNMENTS}`]: () => ok(roster),
		[`POST ${SCHEDULE}/regeneration`]: { status: 204 },
	});
	const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

	expect(
		await screen.findByRole("row", { name: /Aisha Rahman/ })
	).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Regenerate roster" }));
	roster = [];
	await user.click(
		within(screen.getByRole("dialog")).getByRole("button", {
			name: "Regenerate roster",
		})
	);
	expect(await screen.findByRole("note")).toHaveTextContent(
		"This schedule is being generated."
	);

	roster = rosterWithoutAisha();
	await vi.advanceTimersByTimeAsync(15_000);

	expect(
		await screen.findByRole("row", { name: /Ben Ong/ })
	).toBeInTheDocument();
	expect(screen.queryByRole("row", { name: /Aisha Rahman/ })).toBeNull();
	expect(readsOf(calls, SCHEDULE_READ)).toHaveLength(3);
});

it("shows the generating state, not the old roster, while a new run is open", async () => {
	await openRoster({
		...signedIn(["schedule:read", "schedule:generate"]),
		[`GET ${SCHEDULE_READ}`]: [
			ok(scheduleAtRun("GENERATED", "run-1")),
			ok(scheduleAtRun("GENERATION_REQUESTED", "run-2")),
		],
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`POST ${SCHEDULE}/regeneration`]: { status: 204 },
	});
	const user = userEvent.setup();

	await screen.findByRole("table", { name: "Roster" });
	await user.click(screen.getByRole("button", { name: "Regenerate roster" }));
	await user.click(
		within(screen.getByRole("dialog")).getByRole("button", {
			name: "Regenerate roster",
		})
	);

	expect(await screen.findByRole("note")).toHaveTextContent(
		"This schedule is being generated."
	);
	expect(screen.queryByRole("table", { name: "Roster" })).toBeNull();
	expect(screen.queryByRole("region", { name: "Staff Rostered" })).toBeNull();
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
	expect(confirm).not.toHaveClass("bg-error-600");
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

it("opens last week's grid when a schedule with nothing frozen is refused for missing days", async () => {
	await openRoster({
		...signedIn(["schedule:read", "schedule:generate", "schedule:update"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`GET ${SCHEDULE}/starting-days`]: ok(firstWeek()),
		[`GET ${SCHEDULE}/opening-balances`]: ok(midMonthOpenings([])),
		[`POST ${SCHEDULE}/regeneration`]: problemReply(
			409,
			"PRIOR_WEEK_INCOMPLETE"
		),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", { name: "Regenerate roster" })
	);
	await user.click(
		within(
			screen.getByRole("dialog", { name: "Regenerate this roster?" })
		).getByRole("button", { name: "Regenerate roster" })
	);

	const grid = await screen.findByRole("dialog", { name: "Before this week" });
	expect(
		within(grid).getByText("12 days still need an answer.")
	).toBeInTheDocument();
	expect(
		screen.queryByRole("dialog", { name: "Regenerate this roster?" })
	).toBeNull();
});

it("says who can add the days when someone who can't edit is refused for missing days", async () => {
	await openRoster({
		...signedIn(["schedule:read", "schedule:generate"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`POST ${SCHEDULE}/regeneration`]: problemReply(
			409,
			"PRIOR_WEEK_INCOMPLETE"
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
		"Someone who can edit it needs to add them."
	);
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
	[
		"once it is published",
		["schedule:read", "schedule:generate"],
		generatedScheduleFixture({ status: "PUBLISHED" }),
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

it("publishes a generated roster after a confirm, then says who published it", async () => {
	const calls = await openRoster({
		...signedIn(["schedule:read", "schedule:generate", "schedule:publish"]),
		[`GET ${SCHEDULE_READ}`]: [
			ok(generatedScheduleFixture({ status: "GENERATED" })),
			ok(generatedScheduleFixture({ status: "PUBLISHED" })),
		],
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`POST ${SCHEDULE}/approval`]: ok(
			generatedScheduleFixture({ status: "PUBLISHED" })
		),
	});
	const user = userEvent.setup();

	const panel = await screen.findByRole("region", { name: "Roster decision" });
	expect(panel).toHaveTextContent("This roster hasn’t been published yet.");
	await user.click(
		within(panel).getByRole("button", { name: "Publish roster" })
	);
	const dialog = screen.getByRole("dialog", { name: "Publish this roster?" });
	expect(dialog).toHaveTextContent("It can’t be regenerated afterwards");
	await user.click(
		within(dialog).getByRole("button", { name: "Publish roster" })
	);

	expect(
		await within(panel).findByText(/^Published by José · /)
	).toBeInTheDocument();
	expect(screen.queryByRole("dialog")).toBeNull();
	expect(within(panel).queryByRole("button")).toBeNull();
	expect(
		screen.queryByRole("button", { name: "Regenerate roster" })
	).toBeNull();
	const decisions = calls.filter(
		(call) => call.method === "POST" && call.path.startsWith(SCHEDULE)
	);
	expect(decisions.map((call) => call.path)).toEqual([`${SCHEDULE}/approval`]);
	expect(decisions[0]?.body).toBeUndefined();
});

it("asks for a reason before rejecting a roster, then shows the reason", async () => {
	const calls = await openRoster({
		...signedIn(["schedule:read", "schedule:generate", "schedule:publish"]),
		[`GET ${SCHEDULE_READ}`]: [
			ok(generatedScheduleFixture({ status: "GENERATED" })),
			ok(generatedScheduleFixture({ status: "REJECTED" })),
		],
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`POST ${SCHEDULE}/rejection`]: ok(
			generatedScheduleFixture({ status: "REJECTED" })
		),
	});
	const user = userEvent.setup();

	const panel = await screen.findByRole("region", { name: "Roster decision" });
	await user.click(within(panel).getByRole("button", { name: "Reject" }));
	const dialog = screen.getByRole("dialog", { name: "Reject this roster?" });
	const confirm = within(dialog).getByRole("button", {
		name: "Confirm rejection",
	});
	expect(confirm).toHaveClass("bg-error-600");
	await user.click(confirm);
	expect(within(dialog).getByRole("alert")).toHaveTextContent(
		"Enter a reason for rejection."
	);
	expect(
		calls.filter(
			(call) => call.method === "POST" && call.path.startsWith(SCHEDULE)
		)
	).toHaveLength(0);

	await user.type(
		within(dialog).getByRole("textbox", { name: "Reason for rejection" }),
		"Two nights have no supervisor."
	);
	await user.click(confirm);

	expect(
		await within(panel).findByText(/^Rejected by José · /)
	).toBeInTheDocument();
	expect(panel).toHaveTextContent(
		"Two nights have no supervisor. Regenerate once Siti is back."
	);
	expect(panel).toHaveTextContent(
		"Regenerate the roster, or delete the schedule."
	);
	expect(
		calls.find((call) => call.path === `${SCHEDULE}/rejection`)?.body
	).toEqual({ reason: "Two nights have no supervisor." });
	expect(
		screen.getByRole("button", { name: "Regenerate roster" })
	).toBeInTheDocument();
});

it("shows a refused decision inside the dialog and keeps it open", async () => {
	await openRoster({
		...signedIn(["schedule:read", "schedule:publish"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`POST ${SCHEDULE}/approval`]: problemReply(
			409,
			"SCHEDULE_ALREADY_DECIDED"
		),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", { name: "Publish roster" })
	);
	const dialog = screen.getByRole("dialog", { name: "Publish this roster?" });
	await user.click(
		within(dialog).getByRole("button", { name: "Publish roster" })
	);

	expect(await within(dialog).findByRole("alert")).toHaveTextContent(
		"This roster was already published or rejected. Reload the page to see it."
	);
	expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it("shows a generated roster as waiting, without buttons, to someone without schedule:publish", async () => {
	await openRoster({
		...signedIn(["schedule:read"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});

	const panel = await screen.findByRole("region", { name: "Roster decision" });
	expect(panel).toHaveTextContent(
		"This roster is waiting to be published or rejected."
	);
	expect(within(panel).queryByRole("button")).toBeNull();
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

/** A starting context as `GET …/starting-context` answers it, frozen at generation. */
const startingContextReply = (
	staleMemberProfileIds: Array<string>
): StubReply =>
	ok({
		frozen: true,
		staleMemberProfileIds,
		members: [
			{
				memberProfileId: "mp-1",
				displayName: "Aisha Rahman",
				consecutiveWorkingDays: 3,
				trailingSevenDays: "OWWWOOW",
				source: "PUBLISHED",
			},
			{
				memberProfileId: "mp-2",
				displayName: "Ben Ong",
				consecutiveWorkingDays: 0,
				trailingSevenDays: "OOOOOOO",
				source: "PUBLISHED",
			},
		],
	});

it("badges a member who brought a run into the week and warns when starting points changed since", async () => {
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`GET ${SCHEDULE}/starting-context`]: startingContextReply(["mp-2"]),
	});

	const roster = await screen.findByRole("table", { name: "Roster" });
	// Three days worked before Monday make Monday the fourth day of the run.
	expect(await within(roster).findByText("Day 4 of a run")).toBeInTheDocument();
	expect(
		within(within(roster).getByRole("row", { name: /Aisha Rahman/ })).getByText(
			"Day 4 of a run"
		)
	).toBeInTheDocument();
	expect(within(roster).getAllByText(/of a run/)).toHaveLength(1);
	expect(
		screen.getByText(
			/^1 person’s days before this week changed after this schedule was generated\./
		)
	).toBeInTheDocument();
	expect(readsOf(calls, `${SCHEDULE}/starting-context`)).toHaveLength(1);
});

it("shows the roster without starting points when they can't be read", async () => {
	await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		// No starting-context route: the API answers 404.
	});

	const roster = await screen.findByRole("table", { name: "Roster" });
	expect(within(roster).getAllByRole("row")).toHaveLength(4);
	expect(within(roster).queryByText(/of a run/)).toBeNull();
	expect(
		screen.queryByText(/changed after this schedule was generated/)
	).toBeNull();
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

it("names the schedule's Branch in the header as text, keeping the list's Branch for the way back", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi({
		...signedIn(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(twoBranchSchedulingWorkspace(["schedule:read"])),
		},
		[`GET ${SCHEDULE_READ}`]: ok(scheduleFixture()),
	});
	app = await openApp(`${ROSTER_URL}?branch=all`);
	renderAuthApp(app);
	await screen.findByRole("note");

	const header = screen.getByRole("banner");
	expect(
		within(header).queryByRole("button", { name: "Branch" })
	).not.toBeInTheDocument();
	expect(within(header).getByText("Main branch")).toBeVisible();
	expect(app.router.state.location.search).toMatchObject({ branch: "all" });
});

/** The roster's hand-change routes (hrms-backend-v2 docs/adr/0062). */
const ROSTER_CHANGES = `${SCHEDULE}/roster-changes`;

/** Aisha's Monday as the roster names it. */
const aishaMonday = (): ScheduleAssignment =>
	scheduleAssignmentsFixture().find(
		(row) => row.member?.membershipId === "m-1" && row.day === "2026-10-12"
	)!;

/**
 * A generated roster that someone holding `schedule:edit_shift` (and neither
 * `schedule:update` nor `shift:read`) changes by hand: the schedule, its
 * roster and its latest change follow what was applied.
 */
const editableRoster = (
	routes: Routes = {}
): {
	routes: Routes;
	landed: { revision: number; rows: Array<ScheduleAssignment> };
} => {
	const landed = { revision: 1, rows: scheduleAssignmentsFixture() };
	return {
		landed,
		routes: {
			...signedIn(["schedule:read", "schedule:edit_shift"]),
			[`GET ${SCHEDULE_READ}`]: () =>
				ok(
					generatedScheduleFixture({
						status: "GENERATED",
						rosterRevision: landed.revision,
					})
				),
			[`GET ${ASSIGNMENTS}`]: () => ok(landed.rows),
			[`GET ${ROSTER_CHANGES}/shifts`]: ok(frozenShiftsFixture()),
			[`GET ${ROSTER_CHANGES}/latest`]: () =>
				ok({
					change:
						landed.revision === 2
							? rosterChangeFixture({
									assignments: [],
								})
							: null,
				}),
			[`POST ${ROSTER_CHANGES}/preview`]: ok(rosterChangePreviewFixture()),
			...routes,
		},
	};
};

const openAishaMonday = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<HTMLElement> => {
	await user.click(
		await screen.findByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00",
		})
	);
	return screen.getByRole("complementary", {
		name: "Aisha Rahman · Mon, Oct 12",
	});
};

it("changes a generated roster's day by hand: preview, apply, mark, then undo", async () => {
	const edited = editedAssignmentFixture(aishaMonday());
	const { routes, landed } = editableRoster({
		[`POST ${ROSTER_CHANGES}`]: () => {
			landed.revision = 2;
			landed.rows = landed.rows.map((row) =>
				row.assignmentId === edited.assignmentId ? edited : row
			);
			return {
				status: 201,
				body: envelope(rosterChangeFixture({ assignments: [edited] })),
			};
		},
		[`POST ${ROSTER_CHANGES}/rc-1/undo/preview`]: ok(
			rosterChangePreviewFixture({ expectedRevision: 2, checks: [] })
		),
		[`POST ${ROSTER_CHANGES}/rc-1/undo`]: () => {
			landed.revision = 3;
			landed.rows = scheduleAssignmentsFixture();
			return {
				status: 201,
				body: envelope(
					rosterChangeFixture({
						kind: "UNDO",
						fromRevision: 2,
						toRevision: 3,
						undoable: false,
						assignments: [aishaMonday()],
					})
				),
			};
		},
	});
	const calls = await openRoster(routes);
	const user = userEvent.setup();

	const panel = await openAishaMonday(user);
	expect(panel).toHaveTextContent(
		"NowFront Desk AM · 09:00 – 15:00 · Front Desk Lead"
	);
	await user.click(within(panel).getByRole("radio", { name: "Day off" }));

	expect(
		await within(panel).findByText("Front Desk AM, Mon, Oct 12: 2 → 1 people.")
	).toBeVisible();
	expect(panel).toHaveTextContent(
		"Scheduling rules aren’t checked again for changes made by hand."
	);
	expect(panel).toHaveTextContent(
		"Aisha Rahman Front Desk AM · 09:00 – 15:00 → Day off"
	);
	await user.click(within(panel).getByRole("button", { name: "Apply change" }));

	expect(await screen.findByRole("status", { name: "" })).toHaveTextContent(
		"Roster changed."
	);
	expect(
		await screen.findByRole("button", {
			name: "Aisha Rahman, Mon: Day off, changed",
		})
	).toBeVisible();
	expect(
		screen.queryByRole("complementary", { name: /Aisha Rahman ·/ })
	).toBeNull();
	const applied = calls.find(
		(call) => call.method === "POST" && call.path === ROSTER_CHANGES
	);
	expect(applied?.body).toEqual({
		expectedRevision: 1,
		cells: [{ membershipId: "m-1", day: "2026-10-12", kind: "OFF" }],
	});
	expect(
		await screen.findByText("Last change: Aisha Rahman, Mon, Oct 12")
	).toBeVisible();

	await user.click(screen.getAllByRole("button", { name: "Undo" })[0]!);

	expect(
		await screen.findByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00",
		})
	).toBeVisible();
	expect(
		calls.find((call) => call.path === `${ROSTER_CHANGES}/rc-1/undo`)?.body
	).toEqual({ expectedRevision: 2 });
});

it("asks before an undo that needs a tick and a remark, as an edit would", async () => {
	const edited = editedAssignmentFixture(aishaMonday());
	const { routes, landed } = editableRoster({
		[`POST ${ROSTER_CHANGES}`]: () => {
			landed.revision = 2;
			landed.rows = landed.rows.map((row) =>
				row.assignmentId === edited.assignmentId ? edited : row
			);
			return {
				status: 201,
				body: envelope(rosterChangeFixture({ assignments: [edited] })),
			};
		},
		[`POST ${ROSTER_CHANGES}/rc-1/undo/preview`]: ok(
			rosterChangePreviewFixture({
				expectedRevision: 2,
				checks: [
					rosterCheckFixture({
						code: "LEAVE_APPROVED",
						severity: "NEEDS_REMARK",
						membershipId: "m-1",
						countBefore: null,
						countAfter: null,
					}),
				],
				needsAcknowledgement: true,
				needsRemark: true,
				checksFingerprint: "e".repeat(64),
			})
		),
		[`POST ${ROSTER_CHANGES}/rc-1/undo`]: {
			status: 201,
			body: envelope(
				rosterChangeFixture({
					kind: "UNDO",
					fromRevision: 2,
					toRevision: 3,
					undoable: false,
				})
			),
		},
	});
	const calls = await openRoster(routes);
	const user = userEvent.setup();

	const panel = await openAishaMonday(user);
	await user.click(within(panel).getByRole("radio", { name: "Day off" }));
	await within(panel).findByText("Front Desk AM, Mon, Oct 12: 2 → 1 people.");
	await user.click(within(panel).getByRole("button", { name: "Apply change" }));
	await screen.findByText("Last change: Aisha Rahman, Mon, Oct 12");
	await user.click(screen.getAllByRole("button", { name: "Undo" })[0]!);

	const dialog = await screen.findByRole("dialog", {
		name: "Undo this change?",
	});
	expect(dialog).toHaveTextContent(
		"Aisha Rahman has approved leave on Mon, Oct 12."
	);
	const confirm = within(dialog).getByRole("button", { name: "Undo anyway" });
	expect(confirm).toBeDisabled();
	await user.click(
		within(dialog).getByRole("checkbox", { name: "I’ve read these checks" })
	);
	await user.type(
		within(dialog).getByRole("textbox", { name: /Remark \(required\)/ }),
		"Leave was cancelled by phone"
	);
	await user.click(confirm);

	await waitFor(() => {
		expect(
			calls.find((call) => call.path === `${ROSTER_CHANGES}/rc-1/undo`)?.body
		).toEqual({
			expectedRevision: 2,
			remark: "Leave was cancelled by phone",
			checksFingerprint: "e".repeat(64),
		});
	});
});

it("keeps the grid, its week and the open editor while a stale roster reloads", async () => {
	const { routes, landed } = editableRoster({
		[`POST ${ROSTER_CHANGES}/preview`]: (call) =>
			(call.body as { expectedRevision: number }).expectedRevision ===
			landed.revision
				? ok(rosterChangePreviewFixture({ expectedRevision: landed.revision }))
				: problemReply(409, "ROSTER_REVISION_CONFLICT"),
	});
	await openRoster(routes);
	const user = userEvent.setup();
	const panel = await openAishaMonday(user);
	// Someone else changed the roster meanwhile.
	landed.revision = 2;
	landed.rows = landed.rows.map((row) =>
		row.assignmentId === aishaMonday().assignmentId
			? editedAssignmentFixture(row)
			: row
	);

	await user.click(within(panel).getByRole("radio", { name: "Day off" }));
	expect(await within(panel).findByRole("alert")).toHaveTextContent(
		"Someone changed this roster since you opened it. Check your change again."
	);
	await user.click(
		within(panel).getByRole("button", { name: "Reload roster" })
	);

	expect(screen.getByRole("table", { name: "Roster" })).toBeInTheDocument();
	expect(
		screen.getByRole("complementary", { name: "Aisha Rahman · Mon, Oct 12" })
	).toBeInTheDocument();
	expect(
		await screen.findByRole("button", {
			name: "Aisha Rahman, Mon: Day off, changed",
		})
	).toBeVisible();
	expect(screen.getByRole("table", { name: "Roster" })).toBeInTheDocument();
});

it("says the roster changed when someone else got there first, and reads it again", async () => {
	const { routes } = editableRoster({
		[`POST ${ROSTER_CHANGES}`]: problemReply(409, "ROSTER_REVISION_CONFLICT"),
	});
	const calls = await openRoster(routes);
	const user = userEvent.setup();

	const panel = await openAishaMonday(user);
	await user.click(within(panel).getByRole("radio", { name: "Day off" }));
	await within(panel).findByText("Front Desk AM, Mon, Oct 12: 2 → 1 people.");
	const readsBefore = readsOf(calls, SCHEDULE_READ).length;
	await user.click(within(panel).getByRole("button", { name: "Apply change" }));

	expect(await within(panel).findByRole("alert")).toHaveTextContent(
		"Someone changed this roster since you opened it. Check your change again."
	);
	await waitFor(() => {
		expect(readsOf(calls, SCHEDULE_READ).length).toBeGreaterThan(readsBefore);
	});
});

it("holds Apply on a check that needs a remark until it is ticked and a remark is written", async () => {
	const { routes } = editableRoster({
		[`POST ${ROSTER_CHANGES}/preview`]: ok(
			rosterChangePreviewFixture({
				checks: [
					rosterCheckFixture({
						code: "OUTSIDE_AVAILABILITY",
						severity: "NEEDS_REMARK",
						membershipId: "m-1",
						countBefore: null,
						countAfter: null,
					}),
				],
				needsAcknowledgement: true,
				needsRemark: true,
				checksFingerprint: "f".repeat(64),
			})
		),
		[`POST ${ROSTER_CHANGES}`]: {
			status: 201,
			body: envelope(rosterChangeFixture()),
		},
	});
	const calls = await openRoster(routes);
	const user = userEvent.setup();

	const panel = await openAishaMonday(user);
	await user.click(within(panel).getByRole("radio", { name: "Day off" }));
	expect(
		await within(panel).findByText(
			"Front Desk AM is outside Aisha Rahman’s availability on Mon, Oct 12."
		)
	).toBeVisible();
	const apply = within(panel).getByRole("button", { name: "Apply anyway" });
	expect(apply).toBeDisabled();

	await user.click(
		within(panel).getByRole("checkbox", { name: "I’ve read these checks" })
	);
	expect(apply).toBeDisabled();
	await user.type(
		within(panel).getByRole("textbox", { name: /Remark \(required\)/ }),
		"Asked to cover"
	);
	expect(apply).toBeEnabled();
	await user.click(apply);

	await waitFor(() => {
		expect(
			calls.find(
				(call) => call.method === "POST" && call.path === ROSTER_CHANGES
			)?.body
		).toEqual({
			expectedRevision: 1,
			cells: [{ membershipId: "m-1", day: "2026-10-12", kind: "OFF" }],
			remark: "Asked to cover",
			checksFingerprint: "f".repeat(64),
		});
	});
});

it("keeps the roster read-only for someone who may only read it", async () => {
	await openRoster({
		...signedIn(["schedule:read"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00",
		})
	);

	expect(
		screen.getByRole("complementary", { name: "Shift Details" })
	).toBeVisible();
	expect(screen.queryByRole("radio", { name: "Day off" })).toBeNull();
	expect(screen.queryByRole("button", { name: /Day off$/ })).toBeNull();
});

it("keeps the roster read-only for someone who may change a draft but not edit shifts", async () => {
	const calls = await openRoster({
		...signedIn(["schedule:read", "schedule:update", "shift:read"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "GENERATED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`GET ${SCHEDULE}/shifts`]: ok(frozenShiftsFixture()),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00",
		})
	);

	expect(
		screen.getByRole("complementary", { name: "Shift Details" })
	).toBeVisible();
	expect(screen.queryByRole("radio", { name: "Day off" })).toBeNull();
	expect(readsOf(calls, `${ROSTER_CHANGES}/shifts`)).toHaveLength(0);
	expect(readsOf(calls, `${ROSTER_CHANGES}/latest`)).toHaveLength(0);
});

it("offers another shift to an editor without shift:read, from the frozen shifts the editor reads", async () => {
	const { routes } = editableRoster();
	const calls = await openRoster(routes);
	const user = userEvent.setup();

	const panel = await openAishaMonday(user);

	expect(
		await within(panel).findByRole("radio", { name: "Another shift" })
	).toBeVisible();
	expect(readsOf(calls, `${ROSTER_CHANGES}/shifts`)).toHaveLength(1);
	expect(readsOf(calls, `${SCHEDULE}/shifts`)).toHaveLength(0);
});

it("keeps a published roster read-only even for someone who may edit shifts", async () => {
	await openRoster({
		...signedIn(["schedule:read", "schedule:edit_shift"]),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({ status: "PUBLISHED" })
		),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00",
		})
	);

	expect(
		screen.getByRole("complementary", { name: "Shift Details" })
	).toBeVisible();
});
