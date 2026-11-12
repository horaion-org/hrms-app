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
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { constraintFixture } from "@/features/scheduling/constraints/fixtures";
import {
	monthGenerationCheckFixture,
	monthGenerationFixture,
	monthWeekFixture,
	scheduleMonthFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import { departmentShiftFixture } from "@/features/scheduling/shifts/fixtures";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";

let app: OpenedApp | undefined;

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

const MONTHS = "/api/v1/companies/c-1/schedule-months";

type Routes = Parameters<typeof stubApi>[0];

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

const openMonth = async (
	routes: Routes,
	entry = "/scheduling/months/2026-11?department=d-1"
): Promise<ReturnType<typeof stubApi>> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi(routes);
	app = await openApp(entry);
	renderAuthApp(app);
	return calls;
};

// Dates read as the test browser (en-US) writes them.
it("given_novemberOfKitchen_when_opened_then_fiveWeekCardsInMondayOrderWithTheirStates", async () => {
	const calls = await openMonth({
		...signedIn(),
		[`GET ${MONTHS}/2026-11`]: ok(scheduleMonthFixture()),
	});

	expect(
		await screen.findByRole("heading", {
			level: 1,
			name: "Kitchen · November 2026",
		})
	).toBeInTheDocument();
	const cards = screen.getAllByRole("region");
	expect(cards).toHaveLength(5);
	expect(
		cards.map((card) => within(card).getByRole("heading").textContent)
	).toEqual([
		expect.stringMatching(/^Nov 2\s?–\s?8$/),
		expect.stringMatching(/^Nov 9\s?–\s?15$/),
		expect.stringMatching(/^Nov 16\s?–\s?22$/),
		expect.stringMatching(/^Nov 23\s?–\s?29$/),
		expect.stringMatching(/^Nov 30\s–\sDec 6$/),
	]);
	expect(within(cards[1]!).getByText("To review")).toBeInTheDocument();
	expect(
		screen.getByText(
			"5 weeks, Nov 2 to Dec 6. 1 published · 1 to review · 2 tentative."
		)
	).toBeInTheDocument();
	expect(calls.find((call) => call.path === `${MONTHS}/2026-11`)?.search).toBe(
		"departmentId=d-1"
	);
});

it("given_theWeekUnderReview_when_shown_then_reviewLinksToItsRoster", async () => {
	await openMonth({
		...signedIn(),
		[`GET ${MONTHS}/2026-11`]: ok(scheduleMonthFixture()),
	});

	const review = await screen.findByRole("link", { name: /^Review/ });
	expect(review).toHaveAttribute("href", "/scheduling/s-2");
});

it("given_theMonthSteps_when_nextIsChosen_then_decemberOfTheSameDepartmentIsRead", async () => {
	const user = userEvent.setup();
	const calls = await openMonth({
		...signedIn(),
		[`GET ${MONTHS}/2026-11`]: ok(scheduleMonthFixture()),
		[`GET ${MONTHS}/2026-12`]: ok(
			scheduleMonthFixture({
				month: "2026-12",
				weeks: [
					monthWeekFixture({
						periodStart: "2026-12-07",
						periodEnd: "2026-12-13",
						state: "NOT_GENERATED",
						scheduleId: null,
						days: [],
						handChangedDays: null,
					}),
				],
			})
		),
	});

	expect(
		screen.getByRole("link", { name: "Previous month, October 2026" })
	).toHaveTextContent("October");
	await user.click(
		await screen.findByRole("link", { name: "Next month, December 2026" })
	);

	expect(
		await screen.findByRole("heading", {
			level: 1,
			name: "Kitchen · December 2026",
		})
	).toBeInTheDocument();
	expect(
		screen.getByText("No week of December 2026 has a schedule yet.")
	).toBeInTheDocument();
	expect(screen.getByRole("link", { name: "November" })).toHaveAttribute(
		"href",
		"/scheduling/months/2026-11?department=d-1"
	);
	expect(
		calls.filter((call) => call.path === `${MONTHS}/2026-12`)[0]?.search
	).toBe("departmentId=d-1");
});

it("given_aDepartmentOutOfReach_when_opened_then_saysTheMonthIsUnavailable", async () => {
	await openMonth({
		...signedIn(),
		[`GET ${MONTHS}/2026-11`]: problemReply(404, "SCHEDULE_MONTH_NOT_FOUND"),
	});

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"This month doesn’t exist or you don’t have permission to see it."
	);
});

it("given_noDepartmentInTheLink_when_opened_then_asksForNothingAndSaysSo", async () => {
	const calls = await openMonth(signedIn(), "/scheduling/months/2026-11");

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"This month doesn’t exist or you don’t have permission to see it."
	);
	expect(calls.some((call) => call.path.startsWith(MONTHS))).toBe(false);
});

it("given_noScheduleRead_when_opened_then_asksForNothing", async () => {
	const calls = await openMonth(signedIn(["leave_request:read"]));

	expect(await screen.findByRole("alert")).toBeInTheDocument();
	expect(calls.some((call) => call.path.startsWith(MONTHS))).toBe(false);
});

// ===== generating a month =====

const DECEMBER = `${MONTHS}/2026-12`;
const KITCHEN_UNIT = "/api/v1/companies/c-1/branches/b-1/departments/d-1";
const GENERATORS = [
	"schedule:read",
	"schedule:generate",
	"schedule:create",
	"shift:read",
	"constraint:read",
];
const SHIFT = departmentShiftFixture();
const STAFFING = constraintFixture({
	constraintId: "co-1",
	name: "Morning cover",
	type: "SHIFT_STAFFING",
	values: [{ field: "SHIFT", value: SHIFT.shiftId, name: SHIFT.name }],
	requiresPeople: true,
});
const generatingDecember = ungeneratedMonthFixture({
	weeks: ungeneratedMonthFixture().weeks.map((week, index) => ({
		...week,
		state: "GENERATING" as const,
		scheduleId: `s-new-${index + 1}`,
		includedInMonthGeneration: false,
	})),
});

const decemberRoutes = (monthReplies: Array<StubReply>): Routes => ({
	...signedIn(GENERATORS),
	[`GET ${DECEMBER}`]: monthReplies,
	[`GET ${DECEMBER}/generation-check`]: ok(monthGenerationCheckFixture()),
	[`GET ${KITCHEN_UNIT}/shifts`]: ok([SHIFT]),
	[`GET ${KITCHEN_UNIT}/constraints`]: ok([STAFFING]),
	[`POST ${DECEMBER}/generation`]: ok(monthGenerationFixture()),
});

it("given_aMonthNothingWasGeneratedIn_when_generated_then_everyWeekIsSentAndTheMonthReadsGenerating", async () => {
	const calls = await openMonth(
		decemberRoutes([ok(ungeneratedMonthFixture()), ok(generatingDecember)]),
		"/scheduling/months/2026-12?department=d-1"
	);

	expect(
		await screen.findByRole("heading", { name: "Before you generate December" })
	).toBeInTheDocument();
	expect(screen.getByText("Kitchen has 3 shifts.")).toBeInTheDocument();
	const generate = screen.getByRole("button", { name: "Generate December" });
	await vi.waitFor(() => {
		expect(generate).toBeEnabled();
	});
	await userEvent.click(generate);

	expect(await screen.findByText("Generating December…")).toBeInTheDocument();
	const post = calls.find(
		(call) => call.method === "POST" && call.path === `${DECEMBER}/generation`
	);
	expect(post?.search).toBe("departmentId=d-1");
	expect(
		(post?.body as { newWeeks: Array<{ periodStart: string }> }).newWeeks.map(
			(week) => week.periodStart
		)
	).toEqual(["2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"]);
	expect(
		screen.queryByRole("heading", { name: "Before you generate December" })
	).toBeNull();
	expect(screen.getAllByText("Generating").length).toBeGreaterThanOrEqual(4);
});

it("given_aRefusedWeekInTheAnswer_when_generated_then_itsCardSaysWhy", async () => {
	const answer = monthGenerationFixture();
	answer.weeks[1] = {
		...answer.weeks[1]!,
		outcome: "REFUSED",
		scheduleId: null,
		reason: "SCHEDULE_HAS_NO_EMPLOYEES",
	};
	await openMonth(
		{
			...decemberRoutes([ok(ungeneratedMonthFixture())]),
			[`POST ${DECEMBER}/generation`]: ok(answer),
		},
		"/scheduling/months/2026-12?department=d-1"
	);
	const generate = await screen.findByRole("button", {
		name: "Generate December",
	});
	await vi.waitFor(() => {
		expect(generate).toBeEnabled();
	});

	await userEvent.click(generate);

	expect(
		await screen.findByText(
			"Not generated: This department has no employees who can be scheduled. Give at least one active member of the department a job title, then try again."
		)
	).toBeInTheDocument();
});

it("given_aFailedWeek_when_shown_then_itsCardSaysWhy", async () => {
	await openMonth({
		...signedIn(),
		[`GET ${MONTHS}/2026-11`]: ok(
			scheduleMonthFixture({
				weeks: [
					monthWeekFixture({
						state: "FAILED",
						days: [],
						handChangedDays: null,
						failure: {
							runStatus: "FAILED",
							errorCode: "engine_unreachable",
							engineOutcome: null,
						},
					}),
				],
			})
		),
	});

	expect(
		await screen.findByText(
			"The scheduling engine couldn’t be reached in time, so nothing was generated."
		)
	).toBeInTheDocument();
});

it("given_noScheduleGenerate_when_aMonthIsNotGenerated_then_noPanelAndTheNoScheduleLine", async () => {
	const calls = await openMonth(
		{ ...decemberRoutes([ok(ungeneratedMonthFixture())]), ...signedIn() },
		"/scheduling/months/2026-12?department=d-1"
	);

	expect(
		await screen.findByText("No week of December 2026 has a schedule yet.")
	).toBeInTheDocument();
	expect(
		screen.queryByRole("heading", { name: "Before you generate December" })
	).toBeNull();
	expect(calls.some((call) => call.path.endsWith("/generation-check"))).toBe(
		false
	);
});
