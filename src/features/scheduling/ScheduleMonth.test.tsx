import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
	editableMember,
	midMonthOpenings,
} from "@/features/scheduling/hours/fixtures";
import {
	monthGenerationCheckFixture,
	monthGenerationFixture,
	monthSummaryFixture,
	monthWeekFixture,
	scheduleMonthFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import { departmentShiftFixture } from "@/features/scheduling/shifts/fixtures";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
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

it("given_aMonth_when_opened_then_theLegendExplainsTentative", async () => {
	await openMonth({
		...signedIn(),
		[`GET ${MONTHS}/2026-11`]: ok(scheduleMonthFixture()),
	});

	expect(
		await screen.findByText(
			"Tentative: generated, and waits for an earlier week to be published."
		)
	).toBeInTheDocument();
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

it("given_theGenerationCheckStillLoading_when_opened_then_saysTheMonthIsBeingChecked", async () => {
	await openMonth(
		{
			...decemberRoutes([ok(ungeneratedMonthFixture())]),
			// A 503 is retried, so the check is still loading while the test looks.
			[`GET ${DECEMBER}/generation-check`]: problemReply(
				503,
				"SERVICE_UNAVAILABLE"
			),
		},
		"/scheduling/months/2026-12?department=d-1"
	);

	expect(
		await screen.findByText("Checking December before you generate…")
	).toHaveAttribute("role", "status");
	expect(
		screen.queryByRole("button", { name: "Generate December" })
	).toBeNull();
});

it("given_aFailedGenerationCheck_when_tryAgainIsChosen_then_theCheckIsReadAgain", async () => {
	await openMonth(
		{
			...decemberRoutes([ok(ungeneratedMonthFixture())]),
			[`GET ${DECEMBER}/generation-check`]: [
				problemReply(400, "BAD_REQUEST"),
				ok(monthGenerationCheckFixture()),
			],
		},
		"/scheduling/months/2026-12?department=d-1"
	);

	expect(
		await screen.findByText("We couldn’t check December before generating.")
	).toHaveAttribute("role", "alert");
	await userEvent.click(screen.getByRole("button", { name: "Try again" }));

	expect(
		await screen.findByRole("heading", { name: "Before you generate December" })
	).toBeInTheDocument();
});

it("given_aWeekPublishedSinceTheRead_when_generated_then_namesItWithoutSendingToSetup", async () => {
	const december = ungeneratedMonthFixture();
	const publishedSince = ungeneratedMonthFixture({
		weeks: december.weeks.map((week, index) =>
			index === 0
				? {
						...week,
						state: "PUBLISHED" as const,
						includedInMonthGeneration: false,
					}
				: week
		),
	});
	await openMonth(
		{
			...decemberRoutes([ok(december), ok(publishedSince)]),
			[`POST ${DECEMBER}/generation`]: problemReply(
				400,
				"MONTH_WEEK_CANNOT_BE_GENERATED"
			),
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

	// The month is read again, so the refusal names the week as it now is.
	const alert = await screen.findByText(
		/^The week of Dec 7\s?–\s?13 was published/
	);
	expect(alert).toHaveTextContent(
		"Nothing was generated. The page now shows December as it is; try again for the other weeks."
	);
	expect(alert).not.toHaveTextContent("Setup");
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

it("given_aFailedWeekAndStoppedWeeks_when_tryAgain_then_postsExactlyThoseWeeks", async () => {
	const stopped = {
		state: "DRAFT" as const,
		queueRefusal: { code: "EARLIER_WEEK_FAILED", at: "2026-11-17T09:20:00Z" },
	};
	const december = ungeneratedMonthFixture();
	const failedDecember = ungeneratedMonthFixture({
		weeks: december.weeks.map((week, index) => ({
			...week,
			scheduleId: `s-${index + 1}`,
			...[
				{ state: "TO_REVIEW" as const },
				{
					state: "FAILED" as const,
					failure: {
						runStatus: "FAILED",
						errorCode: "engine_unreachable",
						engineOutcome: null,
					},
				},
				stopped,
				stopped,
			][index],
		})),
	});
	const calls = await openMonth(
		decemberRoutes([ok(failedDecember)]),
		"/scheduling/months/2026-12?department=d-1"
	);

	const callout = (
		await screen.findByText(
			/^The week of Dec 14\s?–\s?20 could not be generated, so Dec 21\s?–\s?27 and Dec 28, 2026\s–\sJan 3, 2027 were not generated either\.$/
		)
	).closest("[role=note]") as HTMLElement;
	expect(
		screen.getAllByText(
			/^Not generated: The week of Dec 14\s?–\s?20 failed first\. Try again from this page\.$/
		)
	).toHaveLength(2);
	await userEvent.click(
		within(callout).getByRole("button", { name: "Try again" })
	);

	await vi.waitFor(() => {
		const post = calls.find(
			(call) => call.method === "POST" && call.path === `${DECEMBER}/generation`
		);
		expect(post?.body).toMatchObject({
			weeks: ["2026-12-14", "2026-12-21", "2026-12-28"],
			newWeeks: [],
		});
	});
});

it("given_stoppedWeeksAndNoScheduleGenerate_when_shown_then_theCalloutHasNoTryAgain", async () => {
	const december = ungeneratedMonthFixture();
	const failedDecember = ungeneratedMonthFixture({
		weeks: december.weeks.map((week, index) => ({
			...week,
			scheduleId: `s-${index + 1}`,
			state: index === 0 ? ("FAILED" as const) : ("DRAFT" as const),
			queueRefusal:
				index === 0
					? null
					: { code: "EARLIER_WEEK_FAILED", at: "2026-11-17T09:20:00Z" },
		})),
	});
	await openMonth(
		{ ...decemberRoutes([ok(failedDecember)]), ...signedIn() },
		"/scheduling/months/2026-12?department=d-1"
	);

	const callout = (
		await screen.findByText(
			/^The week of Dec 7\s?–\s?13 could not be generated/
		)
	).closest("[role=note]") as HTMLElement;
	expect(within(callout).queryByRole("button")).toBeNull();
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

it("given_aCoveredWeekChangedByHand_when_generated_then_asksFirstAndPostsOnConfirm", async () => {
	const user = userEvent.setup();
	const december = ungeneratedMonthFixture();
	const handChanged = ungeneratedMonthFixture({
		weeks: december.weeks.map((week, index) =>
			index === 0
				? {
						...week,
						state: "TENTATIVE" as const,
						scheduleId: "s-7",
						handChangedDays: 1,
					}
				: week
		),
	});
	const calls = await openMonth(
		decemberRoutes([ok(handChanged)]),
		"/scheduling/months/2026-12?department=d-1"
	);
	const generate = await screen.findByRole("button", {
		name: "Generate December",
	});
	await vi.waitFor(() => {
		expect(generate).toBeEnabled();
	});

	await user.click(generate);

	const dialog = await screen.findByRole("dialog", {
		name: "Regenerate December?",
	});
	expect(dialog).toHaveTextContent(/Dec 7\s?–\s?13 was changed by hand\./);
	expect(calls.some((call) => call.path === `${DECEMBER}/generation`)).toBe(
		false
	);
	await user.click(
		within(dialog).getByRole("button", { name: "Regenerate December" })
	);
	await vi.waitFor(() => {
		expect(
			calls.filter(
				(call) =>
					call.method === "POST" && call.path === `${DECEMBER}/generation`
			)
		).toHaveLength(1);
	});
});

describe("regenerating a month whose weeks all have a roster", () => {
	const generatedDecember = ungeneratedMonthFixture({
		weeks: ungeneratedMonthFixture().weeks.map((week, index) => ({
			...week,
			state: "TENTATIVE" as const,
			scheduleId: `s-${index + 10}`,
		})),
	});

	it("given_scheduleGenerate_when_regenerateIsChosen_then_asksInTheDialog", async () => {
		const user = userEvent.setup();
		await openMonth(
			decemberRoutes([ok(generatedDecember)]),
			"/scheduling/months/2026-12?department=d-1"
		);

		await user.click(
			await screen.findByRole("button", { name: "Regenerate December" })
		);

		expect(
			await screen.findByRole("dialog", { name: "Regenerate December?" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Before you generate December" })
		).toBeNull();
	});

	it("given_noScheduleGenerate_when_opened_then_noRegenerate", async () => {
		await openMonth(
			{ ...decemberRoutes([ok(generatedDecember)]), ...signedIn() },
			"/scheduling/months/2026-12?department=d-1"
		);

		await screen.findByRole("heading", {
			level: 1,
			name: "Kitchen · December 2026",
		});
		expect(
			screen.queryByRole("button", { name: "Regenerate December" })
		).toBeNull();
	});

	it("given_aMonthBeingGenerated_when_opened_then_noRegenerate", async () => {
		await openMonth(
			decemberRoutes([ok(generatingDecember)]),
			"/scheduling/months/2026-12?department=d-1"
		);

		expect(await screen.findByText("Generating December…")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Regenerate December" })
		).toBeNull();
	});
});

describe("a month held back by an earlier month's week", () => {
	const tentativeDecember = ungeneratedMonthFixture({
		weeks: ungeneratedMonthFixture().weeks.map((week, index) => ({
			...week,
			state: "TENTATIVE" as const,
			scheduleId: `s-${index + 10}`,
		})),
	});
	const novemberToReview = monthSummaryFixture({
		month: "2026-11",
		weeks: [
			{ periodStart: "2026-11-16", state: "TO_REVIEW", scheduleId: "s-2" },
		],
	});

	it("given_everyWeekTentativeAndAWeekToReviewInNovember_when_opened_then_saysWhichWeekTheyWaitFor", async () => {
		// Thursday 12 Nov 2026: the summaries are read from November.
		vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 12) });
		const calls = await openMonth(
			{
				...signedIn(),
				[`GET ${DECEMBER}`]: ok(tentativeDecember),
				[`GET ${MONTHS}`]: ok([novemberToReview]),
			},
			"/scheduling/months/2026-12?department=d-1"
		);

		const line = await screen.findByText(/These weeks wait for/);
		expect(line).toHaveTextContent(
			/^These weeks wait for Nov 16\s?–\s?22, 2026 to be published first\.$/
		);
		expect(within(line).getByRole("link")).toHaveAttribute(
			"href",
			"/scheduling/months/2026-11?department=d-1"
		);
		expect(calls.find((call) => call.path === MONTHS)?.search).toBe(
			"from=2026-11&to=2026-11&departmentId=d-1"
		);
	});

	it("given_aWeekToReviewInTheMonthItself_when_opened_then_noWaitingLineAndNoSummaryRead", async () => {
		const calls = await openMonth({
			...signedIn(),
			[`GET ${MONTHS}/2026-11`]: ok(scheduleMonthFixture()),
		});

		await screen.findByRole("heading", {
			level: 1,
			name: "Kitchen · November 2026",
		});
		expect(screen.queryByText(/These weeks wait for/)).toBeNull();
		expect(calls.some((call) => call.path === MONTHS)).toBe(false);
	});
});

describe("the hours worked this month before its first scheduled week", () => {
	/** December whose weeks all have a roster, the first starting on the 7th. */
	const generatedDecember = ungeneratedMonthFixture({
		weeks: ungeneratedMonthFixture().weeks.map((week, index) => ({
			...week,
			state: "TENTATIVE" as const,
			scheduleId: `s-${index + 10}`,
		})),
	});
	const FIRST_WEEK = `${KITCHEN_UNIT}/schedules/s-10`;
	const hoursRoutes = (permissions: Array<string>): Routes => ({
		...decemberRoutes([ok(generatedDecember)]),
		...signedIn(permissions),
		[`GET ${FIRST_WEEK}/opening-balances`]: ok({
			...midMonthOpenings([editableMember("p-tan")]),
			monthStart: "2026-12-01",
			asOf: "2026-12-07",
		}),
		[`GET ${FIRST_WEEK}/starting-days`]: ok(firstWeek()),
	});

	it("given_unknownHours_when_opened_then_theMonthSaysForHowManyAndAddsThemOnItsFirstWeek", async () => {
		const user = userEvent.setup();
		await openMonth(
			hoursRoutes([...GENERATORS, "schedule:update"]),
			"/scheduling/months/2026-12?department=d-1"
		);

		expect(
			await screen.findByText(
				"Hours worked before Dec 7 are unknown for 1 person."
			)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Add them" }));

		const dialog = await screen.findByRole("dialog", {
			name: "Hours already worked this month (Dec 1 to Dec 6)",
		});
		expect(dialog).toHaveTextContent(
			"Changing these hours doesn’t change a roster already generated. Regenerate the month to use them."
		);
	});

	it("given_unknownHours_when_regenerateIsChosen_then_theDialogSaysSoAndAddThemOpensTheHours", async () => {
		const user = userEvent.setup();
		await openMonth(
			hoursRoutes([...GENERATORS, "schedule:update"]),
			"/scheduling/months/2026-12?department=d-1"
		);
		await screen.findByText(
			"Hours worked before Dec 7 are unknown for 1 person."
		);

		await user.click(
			await screen.findByRole("button", { name: "Regenerate December" })
		);
		const regenerate = await screen.findByRole("dialog", {
			name: "Regenerate December?",
		});
		expect(regenerate).toHaveTextContent(
			"Hours worked before Dec 7 are unknown for 1 person."
		);
		await user.click(
			within(regenerate).getByRole("button", { name: "Add them" })
		);

		expect(
			await screen.findByRole("dialog", {
				name: "Hours already worked this month (Dec 1 to Dec 6)",
			})
		).toBeVisible();
		expect(
			screen.queryByRole("dialog", { name: "Regenerate December?" })
		).toBeNull();
	});

	it("given_noScheduleUpdate_when_opened_then_theLineHasNoButton", async () => {
		await openMonth(
			hoursRoutes(GENERATORS),
			"/scheduling/months/2026-12?department=d-1"
		);

		expect(
			await screen.findByText(
				"Hours worked before Dec 7 are unknown for 1 person."
			)
		).toBeVisible();
		expect(screen.queryByRole("button", { name: "Add them" })).toBeNull();
	});
});
