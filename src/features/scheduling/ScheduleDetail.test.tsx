import { screen, within } from "@testing-library/react";
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
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	generatedScheduleFixture,
	generationFindingsFixture,
	generationFixture,
	scheduleAssignmentsFixture,
	scheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";

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

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const ASSIGNMENTS = `${SCHEDULE}/assignments`;
const ROSTER_URL = "/scheduling/s-1?branchId=b-1&departmentId=d-1";

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

it.each([
	["names no department", "/scheduling/s-1"],
	["names only the department", "/scheduling/s-1?departmentId=d-1"],
	["names a blank branch", "/scheduling/s-1?branchId=&departmentId=d-1"],
])("says the schedule can't be found when its URL %s", async (_, entry) => {
	await openRoster(signedIn(), entry);

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"This schedule could not be found."
	);
	expect(
		screen.getByRole("link", { name: "Back to Overview" })
	).toHaveAttribute("href", "/scheduling");
});

it("shows a generated schedule's header, figures and roster from the API", async () => {
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE}`]: ok(generatedScheduleFixture({ status: "GENERATED" })),
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
		[`GET ${SCHEDULE}`]: ok(generatedScheduleFixture({ status: "GENERATED" })),
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

it("shows a chosen day's shift read-only", async () => {
	await openRoster({
		...signedIn([
			"schedule:read",
			"shift:read",
			"shift:update",
			"shift:delete",
		]),
		[`GET ${SCHEDULE}`]: ok(generatedScheduleFixture({ status: "GENERATED" })),
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

it("quotes the engine's conflicts and errors by member as review notes", async () => {
	await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE}`]: ok(generatedScheduleFixture({ status: "GENERATED" })),
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
	});
	const user = userEvent.setup();

	expect(
		await screen.findByText(
			"The scheduling engine left 2 notes to review on this roster."
		)
	).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Review notes" }));

	const notes = screen.getByRole("dialog", { name: "Review notes" });
	const conflicts = within(notes).getByRole("region", { name: "Conflicts" });
	expect(conflicts).toHaveTextContent(
		"Sat, Oct 17, 09:00 – 15:00•1 person short"
	);
	expect(conflicts).toHaveTextContent("Rule: Morning cover");
	expect(
		within(conflicts).getByText("Front Desk AM is one Front Desk Staff short.")
			.tagName
	).toBe("Q");
	const byMember = within(notes).getByRole("region", {
		name: "Notes by member",
	});
	expect(byMember).toHaveTextContent("Ben Ong");
	expect(
		within(byMember).getByText("Ben Ong works more than five days in a row.")
			.tagName
	).toBe("Q");
});

it("reads a schedule being generated every 15 seconds until its roster is ready", async () => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE}`]: [
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
	expect(readsOf(calls, SCHEDULE)).toHaveLength(1);

	await vi.advanceTimersByTimeAsync(15_000);
	expect(readsOf(calls, SCHEDULE)).toHaveLength(2);
	expect(screen.getByRole("note")).toHaveTextContent(
		"This schedule is being generated."
	);
	expect(readsOf(calls, ASSIGNMENTS)).toHaveLength(0);

	await vi.advanceTimersByTimeAsync(15_000);
	expect(
		await screen.findByRole("row", { name: /Aisha Rahman/ })
	).toBeInTheDocument();
	expect(readsOf(calls, SCHEDULE)).toHaveLength(3);
	expect(readsOf(calls, ASSIGNMENTS)).toHaveLength(1);

	await vi.advanceTimersByTimeAsync(45_000);
	expect(readsOf(calls, SCHEDULE)).toHaveLength(3);
});

it("explains a failed run by its error code, without asking for a roster", async () => {
	const calls = await openRoster({
		...signedIn(),
		[`GET ${SCHEDULE}`]: ok(
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
		[`GET ${SCHEDULE}`]: ok(
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
		[`GET ${SCHEDULE}`]: ok(scheduleFixture()),
	});

	expect(await screen.findByRole("note")).toHaveTextContent(
		"This schedule is still a draft, so it has no roster yet."
	);
	expect(screen.getByRole("link", { name: "View setup" })).toBeInTheDocument();
	expect(readsOf(calls, ASSIGNMENTS)).toHaveLength(0);
});

it.each([
	["without schedule:read at its department", [], undefined],
	["the API doesn't know", ["schedule:read"], { status: 404 }],
	["the API refuses", ["schedule:read"], { status: 403 }],
] as const)(
	"says a schedule %s can't be shown",
	async (_, permissions, reply) => {
		const calls = await openRoster({
			...signedIn([...permissions]),
			...(reply && { [`GET ${SCHEDULE}`]: reply }),
		});

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"This schedule doesn’t exist or you don’t have permission to see it."
		);
		expect(screen.queryByRole("link", { name: "View setup" })).toBeNull();
		if (!reply) expect(readsOf(calls, SCHEDULE)).toHaveLength(0);
	}
);
