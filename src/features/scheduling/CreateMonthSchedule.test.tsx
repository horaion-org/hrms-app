import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	settled,
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
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS_RESPONSE,
} from "@/features/scheduling/constraints/fixtures";
import type {
	GenerateMonthBody,
	MonthWeek,
} from "@/features/scheduling/months/api";
import { midMonthOpenings } from "@/features/scheduling/hours/fixtures";
import {
	monthGenerationCheckFixture,
	monthGenerationFixture,
	monthSummaryFixture,
	monthWeekFixture,
	scheduleMonthFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import {
	scheduleFixture,
	schedulingWorkspace,
	twoBranchSchedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import {
	SHIFT_FIXTURES,
	departmentShiftFixture,
	scheduleShiftsFixture,
} from "@/features/scheduling/shifts/fixtures";
import {
	enteredNightCell,
	firstWeek,
} from "@/features/scheduling/startingContext/fixtures";
import { allOf, withShiftsChosen } from "@/features/scheduling/weekChoice";
import type { Workspace } from "@/features/workspace/api";

vi.setConfig({ testTimeout: 15_000 });

const COMPANY = "/api/v1/companies/c-1";
const DEPARTMENT = `${COMPANY}/branches/b-1/departments/d-1`;
const DECEMBER = `${COMPANY}/schedule-months/2026-12`;
const READINESS = `GET ${COMPANY}/scheduling-readiness`;
const ALL = [
	"schedule:read",
	"schedule:create",
	"schedule:update",
	"schedule:generate",
	"shift:read",
	"shift:create",
	"constraint:read",
	"constraint:create",
];
const SHIFTS = [
	"front-desk-am",
	"breakfast-prep",
	"lunch-rush",
	"closing-crew",
].map((shiftId) =>
	departmentShiftFixture(
		SHIFT_FIXTURES.find((shift) => shift.shiftId === shiftId)
	)
);
const EVERYTHING = allOf(SHIFTS, CONSTRAINT_FIXTURES);
const NEW_DECEMBER = "/scheduling/new?department=d-1&month=2026-12";

const reply = (data: unknown, status = 200): StubReply => ({
	status,
	body: envelope(data),
});

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// Thursday 12 Nov 2026: November and the twelve months after it are offered.
	vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 12) });
});
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

const routes = (
	permissions: Array<string> | Workspace
): Record<string, StubReply | Array<StubReply>> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": reply(
		Array.isArray(permissions) ? schedulingWorkspace(permissions) : permissions
	),
	[READINESS]: reply([readinessFixture({ departmentName: "Front Office" })]),
	[`GET ${DECEMBER}`]: reply(ungeneratedMonthFixture()),
	[`GET ${DECEMBER}/generation-check`]: reply(monthGenerationCheckFixture()),
	[`POST ${DECEMBER}/generation`]: reply(monthGenerationFixture()),
	[`GET ${DEPARTMENT}/shifts`]: reply(SHIFTS),
	[`GET ${DEPARTMENT}/constraints`]: reply(CONSTRAINT_FIXTURES),
	[`GET ${DEPARTMENT}/constraint-options`]: reply(CONSTRAINT_OPTIONS_RESPONSE),
});

const open = async (
	entry: string,
	extra: Record<string, StubReply | Array<StubReply>> = {},
	permissions: Array<string> | Workspace = ALL
): Promise<{
	opened: OpenedApp;
	calls: ReturnType<typeof stubApi>;
}> => {
	const calls = stubApi({ ...routes(permissions), ...extra });
	app = await openApp(entry);
	renderAuthApp(app);
	return { opened: app, calls };
};

const next = (): HTMLElement => screen.getByRole("button", { name: "Next" });

/** The note under a disabled Next. */
const nextNote = (): string | null =>
	document.getElementById(next().getAttribute("aria-describedby") ?? "")
		?.textContent ?? null;

const frontOffice = (
	missing: Array<"SHIFT" | "STAFFING_CONSTRAINT">
): StubReply =>
	reply([
		readinessFixture({
			departmentName: "Front Office",
			branchName: "Main branch",
			ready: missing.length === 0,
			missing,
		}),
	]);

const EVERY_WEEK_LINE =
	"Every week uses all 4 shifts and 5 constraints of Front Office.";

describe("Create schedules for a month", () => {
	it("given_aNewVisit_when_opened_then_theMonthSetupWithItsWeeksAndWhatTheyUse", async () => {
		await open(NEW_DECEMBER);

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		expect(
			screen.getByText("A week belongs to the month its Monday falls in.")
		).toBeInTheDocument();
		const table = await screen.findByRole("table", { name: "Weeks" });
		for (const dates of [
			"Mon, Dec 7 to Sun, Dec 13",
			"Mon, Dec 14 to Sun, Dec 20",
			"Mon, Dec 21 to Sun, Dec 27",
			"Mon, Dec 28 to Sun, Jan 3",
		]) {
			expect(
				within(table).getByRole("checkbox", { name: `Select ${dates}` })
			).toBeChecked();
		}
		expect(
			screen.getByText("4 weeks: Mon, Dec 7 to Sun, Jan 3")
		).toBeInTheDocument();
		expect(await screen.findByText(EVERY_WEEK_LINE)).toBeInTheDocument();
		expect(screen.queryByRole("textbox", { name: /Schedule name/ })).toBeNull();
	});

	it("given_aSavedDraftsUrl_when_opened_then_theWeekWizardStillOpensIt", async () => {
		await open(
			"/scheduling/new?step=forecast&scheduleId=s-1&departmentId=d-1",
			{
				[`GET ${DEPARTMENT}/schedules/s-1`]: reply(scheduleFixture()),
				[`GET ${DEPARTMENT}/schedules/s-1/shifts`]: reply(
					scheduleShiftsFixture()
				),
			}
		);

		expect(
			await screen.findByRole("region", { name: "Staffing forecast" })
		).toBeVisible();
	});

	it("given_aLaterStepWithoutASetup_when_linkedTo_then_returnsToSetupKeepingDepartmentAndMonth", async () => {
		const { opened } = await open(
			"/scheduling/new?step=generate&department=d-1&month=2026-12"
		);

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		await settled(opened.router);
		expect(opened.router.state.location.search).toEqual({
			step: "setup",
			department: "d-1",
			month: "2026-12",
		});
	});

	it("given_aDepartmentWithoutStaffing_when_onSetup_then_stopsThereWithTheGate", async () => {
		await open(NEW_DECEMBER, {
			[READINESS]: reply([
				readinessFixture({
					departmentName: "Front Office",
					ready: false,
					missing: ["STAFFING_CONSTRAINT"],
				}),
			]),
		});

		expect(
			await screen.findByRole("link", { name: "Add a staffing constraint" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=constraints&branch=b-1&department=d-1&next=create&month=2026-12"
		);
		expect(
			screen.getByText(
				"Front Office has shifts but no staffing constraint, so nobody would be rostered.",
				{ exact: false }
			)
		).toBeVisible();
		expect(next()).toBeDisabled();
	});

	it("given_oneWeekChosenDifferently_when_generated_then_postsItsChoiceAndEverythingForTheRestAndLandsOnTheMonth", async () => {
		const user = userEvent.setup();
		const { opened, calls } = await open(NEW_DECEMBER);

		await screen.findByText(EVERY_WEEK_LINE);
		await user.click(screen.getByRole("button", { name: "Choose per week" }));
		await user.click(await screen.findByRole("tab", { name: /^Dec 14/ }));
		await user.click(
			within(screen.getByRole("tabpanel")).getByRole("checkbox", {
				name: "Select Lunch Rush",
			})
		);
		await user.click(screen.getByRole("button", { name: "Use for December" }));
		expect(
			await screen.findByText(
				/^3 of 4 weeks use everything of Front Office\. Changed: Dec 14/
			)
		).toBeInTheDocument();
		await user.click(next());
		await screen.findByRole("region", { name: "Staffing forecast" });
		await user.click(next());
		const generate = await screen.findByRole("button", {
			name: "Generate December",
		});
		await vi.waitFor(() => {
			expect(generate).toBeEnabled();
		});
		await user.click(generate);

		await vi.waitFor(() => {
			expect(opened.router.state.location.pathname).toBe(
				"/scheduling/months/2026-12"
			);
		});
		expect(opened.router.state.location.search).toEqual({ department: "d-1" });
		const post = calls.find(
			(call) => call.method === "POST" && call.path === `${DECEMBER}/generation`
		);
		expect(post?.search).toBe("departmentId=d-1");
		const changed = withShiftsChosen(
			EVERYTHING,
			EVERYTHING.shiftIds.filter((shiftId) => shiftId !== "lunch-rush"),
			CONSTRAINT_FIXTURES
		);
		expect(post?.body as GenerateMonthBody).toEqual({
			includeLeave: true,
			weeks: ["2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"],
			newWeeks: ["2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"].map(
				(periodStart) => ({
					periodStart,
					includedShiftIds: (periodStart === "2026-12-14"
						? changed
						: EVERYTHING
					).shiftIds,
					includedConstraintIds: (periodStart === "2026-12-14"
						? changed
						: EVERYTHING
					).constraintIds,
				})
			),
		});
	});

	it("given_aRefusedMonth_when_generated_then_saysWhyAndStays", async () => {
		const user = userEvent.setup();
		const { opened } = await open(NEW_DECEMBER, {
			[`POST ${DECEMBER}/generation`]: problemReply(403, "FORBIDDEN"),
		});

		await screen.findByText(EVERY_WEEK_LINE);
		await user.click(next());
		await screen.findByRole("region", { name: "Staffing forecast" });
		await user.click(next());
		const generate = await screen.findByRole("button", {
			name: "Generate December",
		});
		await vi.waitFor(() => {
			expect(generate).toBeEnabled();
		});
		await user.click(generate);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"You don’t have permission to generate this month here."
		);
		expect(opened.router.state.location.pathname).toBe("/scheduling/new");
	});
});

describe("Create schedules for a month: ticking weeks", () => {
	const NOVEMBER = `${COMPANY}/schedule-months/2026-11`;
	const JANUARY = `${COMPANY}/schedule-months/2027-01`;
	const SUMMARIES = `GET ${COMPANY}/schedule-months`;
	const SCHEDULES = `${DEPARTMENT}/schedules`;
	const NEW_NOVEMBER = "/scheduling/new?department=d-1&month=2026-11";
	const NOVEMBER_WEEKS = [
		["2026-11-02", "2026-11-08"],
		["2026-11-09", "2026-11-15"],
		["2026-11-16", "2026-11-22"],
		["2026-11-23", "2026-11-29"],
		["2026-11-30", "2026-12-06"],
	] as const;
	/** November on Thursday 12 Nov: the week of 2 Nov has ended, the week of 9 Nov has started; none generated unless `changes` says. */
	const novemberRead = (
		changes: Record<string, Partial<MonthWeek>> = {}
	): StubReply =>
		reply(
			scheduleMonthFixture({
				weeks: NOVEMBER_WEEKS.map(([periodStart, periodEnd]) =>
					monthWeekFixture({
						periodStart,
						periodEnd,
						state: "NOT_GENERATED",
						scheduleId: null,
						days: [],
						handChangedDays: null,
						includedInMonthGeneration: periodStart !== "2026-11-02",
						...changes[periodStart],
					})
				),
			})
		);
	const novemberRoutes = (
		changes: Record<string, Partial<MonthWeek>> = {}
	): Record<string, StubReply> => ({
		[`GET ${NOVEMBER}`]: novemberRead(changes),
		[`GET ${NOVEMBER}/generation-check`]: reply(
			monthGenerationCheckFixture({ month: "2026-11" })
		),
		[`POST ${NOVEMBER}/generation`]: reply(
			monthGenerationFixture({ month: "2026-11" })
		),
	});
	const box = (dates: string): HTMLElement =>
		within(screen.getByRole("table", { name: "Weeks" })).getByRole(
			"checkbox",
			{ name: `Select ${dates}` }
		);
	const monthField = (): HTMLElement =>
		screen.getByRole("button", { name: /Month/ });
	const chooseMonth = async (
		user: ReturnType<typeof userEvent.setup>,
		name: string
	): Promise<void> => {
		await user.click(monthField());
		await user.click(await screen.findByRole("option", { name }));
	};
	/** From a ready Setup, through Forecast, to Generate, and clicks it. */
	const generateFromSetup = async (
		user: ReturnType<typeof userEvent.setup>
	): Promise<void> => {
		await vi.waitFor(() => {
			expect(next()).toBeEnabled();
		});
		await user.click(next());
		await screen.findByRole("region", { name: "Staffing forecast" });
		await user.click(next());
		const generate = await screen.findByRole("button", {
			name: /^Generate /,
		});
		await vi.waitFor(() => {
			expect(generate).toBeEnabled();
		});
		await user.click(generate);
	};
	const postedBody = async (
		calls: ReturnType<typeof stubApi>,
		path: string
	): Promise<GenerateMonthBody> => {
		await vi.waitFor(() => {
			expect(
				calls.some((call) => call.method === "POST" && call.path === path)
			).toBe(true);
		});
		return calls.find((call) => call.method === "POST" && call.path === path)
			?.body as GenerateMonthBody;
	};

	it("given_midWeek_when_opened_then_theStartedWeekIsUntickedAndTheRestTicked", async () => {
		await open(NEW_NOVEMBER, novemberRoutes());

		await screen.findByRole("table", { name: "Weeks" });
		expect(box("Mon, Nov 2 to Sun, Nov 8")).toBeDisabled();
		expect(box("Mon, Nov 2 to Sun, Nov 8")).not.toBeChecked();
		expect(box("Mon, Nov 9 to Sun, Nov 15")).toBeEnabled();
		expect(box("Mon, Nov 9 to Sun, Nov 15")).not.toBeChecked();
		expect(box("Mon, Nov 16 to Sun, Nov 22")).toBeChecked();
		expect(box("Mon, Nov 23 to Sun, Nov 29")).toBeChecked();
		expect(box("Mon, Nov 30 to Sun, Dec 6")).toBeChecked();
	});

	it("given_aWeekUnderReview_when_opened_then_untickedAndNotRegenerated", async () => {
		const user = userEvent.setup();
		const { calls } = await open(
			NEW_NOVEMBER,
			novemberRoutes({
				"2026-11-23": { state: "TO_REVIEW", scheduleId: "s-23" },
			})
		);

		await screen.findByRole("table", { name: "Weeks" });
		expect(box("Mon, Nov 23 to Sun, Nov 29")).not.toBeChecked();
		await generateFromSetup(user);

		const body = await postedBody(calls, `${NOVEMBER}/generation`);
		expect(body.weeks).toEqual(["2026-11-16", "2026-11-30"]);
		expect(body.newWeeks.map((week) => week.periodStart)).toEqual([
			"2026-11-16",
			"2026-11-30",
		]);
	});

	it("given_someWeeksUnticked_when_generated_then_postsOnlyTheTickedWeeksAndTheirChoices", async () => {
		const user = userEvent.setup();
		const { calls } = await open(NEW_DECEMBER);

		await screen.findByRole("table", { name: "Weeks" });
		await user.click(box("Mon, Dec 14 to Sun, Dec 20"));
		await user.click(box("Mon, Dec 28 to Sun, Jan 3"));
		await generateFromSetup(user);

		const body = await postedBody(calls, `${DECEMBER}/generation`);
		expect(body.weeks).toEqual(["2026-12-07", "2026-12-21"]);
		expect(body.newWeeks).toEqual(
			["2026-12-07", "2026-12-21"].map((periodStart) => ({
				periodStart,
				includedShiftIds: EVERYTHING.shiftIds,
				includedConstraintIds: EVERYTHING.constraintIds,
			}))
		);
	});

	it("given_nothingTicked_when_onSetup_then_nextWaits", async () => {
		const user = userEvent.setup();
		await open(NEW_DECEMBER);

		await screen.findByText(EVERY_WEEK_LINE);
		await user.click(
			within(screen.getByRole("table", { name: "Weeks" })).getByRole(
				"checkbox",
				{ name: "Select all" }
			)
		);

		expect(
			await screen.findByText("Tick at least one week to schedule.")
		).toBeVisible();
		expect(next()).toBeDisabled();
		expect(nextNote()).toBe("");
	});

	it("given_aDepartmentWithNothingLeftThisMonth_when_chosen_then_theNextMonthIsSuggested", async () => {
		await open("/scheduling/new?department=d-1", {
			[SUMMARIES]: reply([
				monthSummaryFixture({
					departmentId: "d-1",
					weeks: [
						{ periodStart: "2026-11-02", state: "PUBLISHED", scheduleId: "s-1" },
						{ periodStart: "2026-11-09", state: "PUBLISHED", scheduleId: "s-2" },
						{ periodStart: "2026-11-16", state: "TO_REVIEW", scheduleId: "s-3" },
						{ periodStart: "2026-11-23", state: "TENTATIVE", scheduleId: "s-4" },
						{ periodStart: "2026-11-30", state: "TENTATIVE", scheduleId: "s-5" },
					],
				}),
			]),
		});

		await vi.waitFor(() => {
			expect(monthField()).toHaveTextContent("December 2026");
		});
		expect(
			await screen.findByRole("checkbox", {
				name: "Select Mon, Dec 7 to Sun, Dec 13",
			})
		).toBeChecked();
	});

	it("given_theMonthChosenByHand_when_theDepartmentChanges_then_theMonthStays", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new?department=d-1", {
			[SUMMARIES]: reply([]),
			[`GET ${JANUARY}`]: reply(ungeneratedMonthFixture({ month: "2027-01" })),
		});

		await screen.findByRole("region", { name: "Schedule setup" });
		await chooseMonth(user, "January 2027");
		await user.click(screen.getByRole("button", { name: /Department/ }));
		await user.click(await screen.findByRole("option", { name: "Kitchen" }));

		await vi.waitFor(() => {
			expect(monthField()).toHaveTextContent("January 2027");
		});
	});

	it("given_aMonthChanged_when_back_then_ticksReturnToTheDefaults", async () => {
		const user = userEvent.setup();
		await open(NEW_DECEMBER, {
			[`GET ${JANUARY}`]: reply(ungeneratedMonthFixture({ month: "2027-01" })),
		});

		await screen.findByRole("table", { name: "Weeks" });
		await user.click(box("Mon, Dec 14 to Sun, Dec 20"));
		expect(box("Mon, Dec 14 to Sun, Dec 20")).not.toBeChecked();
		await chooseMonth(user, "January 2027");
		await chooseMonth(user, "December 2026");

		await vi.waitFor(() => {
			expect(box("Mon, Dec 14 to Sun, Dec 20")).toBeChecked();
		});
	});

	it("given_tickedWeeksToCreate_when_choosingPerWeek_then_onlyThoseHaveTabs", async () => {
		const user = userEvent.setup();
		await open(NEW_DECEMBER);

		await screen.findByText(EVERY_WEEK_LINE);
		await user.click(box("Mon, Dec 21 to Sun, Dec 27"));
		await user.click(screen.getByRole("button", { name: "Choose per week" }));

		const tabs = within(
			await screen.findByRole("tablist", { name: "Weeks of December" })
		)
			.getAllByRole("tab")
			.map((tab) => tab.textContent?.trim());
		expect(tabs).toHaveLength(3);
		expect(tabs).not.toContainEqual(expect.stringMatching(/^Dec 21/));
	});

	it("given_aWeekThatCannotBeGenerated_when_generated_then_saysGoBackToSetup", async () => {
		const user = userEvent.setup();
		await open(NEW_DECEMBER, {
			[`POST ${DECEMBER}/generation`]: problemReply(
				400,
				"MONTH_WEEK_CANNOT_BE_GENERATED"
			),
		});

		await screen.findByText(EVERY_WEEK_LINE);
		await generateFromSetup(user);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"A week you ticked can no longer be generated. Go back to Setup to see it as it is now."
		);
	});

	it("given_theFirstTickedWeekWithNoRosterBefore_when_onSetup_then_asksForItsDaysAndHours", async () => {
		await open(NEW_NOVEMBER, novemberRoutes());

		expect(
			await screen.findByText(
				"Horaion doesn’t know what people worked last week."
			)
		).toBeVisible();
		expect(
			await screen.findByText(
				"Horaion doesn’t know the hours people worked this month before Nov 16."
			)
		).toBeVisible();
	});

	it("given_theFirstTickedWeekAfterUntickedWeeks_when_hoursAdded_then_savesThatWeekAndTheHoursRunToTheDayBeforeIt", async () => {
		const user = userEvent.setup();
		const { calls } = await open(NEW_DECEMBER, {
			[`POST ${SCHEDULES}`]: reply(
				scheduleFixture({ scheduleId: "s-start" }),
				201
			),
		});

		await screen.findByText(EVERY_WEEK_LINE);
		await user.click(box("Mon, Dec 7 to Sun, Dec 13"));
		await user.click(box("Mon, Dec 14 to Sun, Dec 20"));
		expect(
			await screen.findByText(
				"Horaion doesn’t know the hours people worked this month before Dec 21."
			)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Add hours worked" }));

		await vi.waitFor(() => {
			expect(
				calls
					.filter((call) => call.method === "POST" && call.path === SCHEDULES)
					.map((call) => (call.body as { periodStart: string }).periodStart)
			).toEqual(["2026-12-21"]);
		});
	});
});

// Ported from the week wizard's new-draft Setup (CreateSchedule.test.tsx), which the month Setup replaces.
describe("Create schedules for a month: what the weeks use", () => {
	it("given_theReadKeys_when_aDepartmentIsChosen_then_linksToEditItsShiftsAndConstraints", async () => {
		await open(NEW_DECEMBER);

		expect(
			await screen.findByRole("link", { name: "Edit shifts" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=shifts&branch=b-1&department=d-1"
		);
		expect(
			screen.getByRole("link", { name: "Edit constraints" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=constraints&branch=b-1&department=d-1"
		);
	});

	it("given_noShiftReadKey_when_aDepartmentIsChosen_then_leavesOutEditShifts", async () => {
		await open(NEW_DECEMBER, {}, [
			"schedule:read",
			"schedule:create",
			"constraint:read",
		]);

		expect(
			await screen.findByRole("link", { name: "Edit constraints" })
		).toBeVisible();
		expect(screen.queryByRole("link", { name: "Edit shifts" })).toBeNull();
	});

	it("given_noConstraintReadKey_when_aDepartmentIsChosen_then_leavesOutEditConstraints", async () => {
		await open(NEW_DECEMBER, {}, [
			"schedule:read",
			"schedule:create",
			"shift:read",
		]);

		expect(
			await screen.findByRole("link", { name: "Edit shifts" })
		).toBeVisible();
		expect(screen.queryByRole("link", { name: "Edit constraints" })).toBeNull();
	});

	it("given_listsThePersonMayNotSee_when_aDepartmentIsChosen_then_saysEverythingWithoutAChoiceAndNextSaysWhy", async () => {
		await open(NEW_DECEMBER, {}, [
			"schedule:read",
			"schedule:create",
			"constraint:read",
		]);

		expect(
			await screen.findByText(
				"Every week uses every shift and constraint of Front Office."
			)
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Choose per week" })
		).toBeNull();
		expect(next()).toBeDisabled();
		expect(nextNote()).toBe(
			"You need to see Front Office’s shifts and constraints to create its schedule."
		);
	});

	it("given_aListThatHasNotAnswered_when_aDepartmentIsChosen_then_nextWaitsWithoutANote", async () => {
		// The Department's live shifts fail to load, so the weeks' choice isn't known.
		await open(NEW_DECEMBER, { [`GET ${DEPARTMENT}/shifts`]: { status: 404 } });

		await screen.findByRole("region", { name: "Schedule setup" });
		await waitFor(() => {
			expect(next()).toBeDisabled();
		});
		expect(nextNote()).toBe("");
	});
});

describe("Create schedules for a month: the Setup gate", () => {
	it("given_nothingSetUp_when_theDepartmentIsChosen_then_stopsAndLinksToItsShiftsWithTheWayBack", async () => {
		await open(NEW_DECEMBER, {
			[`GET ${DEPARTMENT}/shifts`]: reply([]),
			[`GET ${DEPARTMENT}/constraints`]: reply([]),
			[READINESS]: frontOffice(["SHIFT", "STAFFING_CONSTRAINT"]),
		});

		expect(
			await screen.findByText(
				"Front Office has no shifts or staffing constraints yet. A schedule needs both.",
				{ exact: false }
			)
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Set up Front Office" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=shifts&branch=b-1&department=d-1&next=create&month=2026-12"
		);
		expect(next()).toBeDisabled();
		expect(nextNote()).toBe(
			"Set up shifts and a staffing constraint for Front Office first."
		);
	});

	it("given_someoneWhoCannotFixIt_when_theDepartmentIsChosen_then_saysWhoCanWithoutALink", async () => {
		await open(
			NEW_DECEMBER,
			{ [READINESS]: frontOffice(["STAFFING_CONSTRAINT"]) },
			["schedule:read", "schedule:create", "shift:read"]
		);

		expect(
			await screen.findByText(
				"Front Office isn’t ready to schedule: it has no staffing constraint. Ask someone who manages Front Office’s scheduling to add one.",
				{ exact: false }
			)
		).toBeVisible();
		expect(screen.queryByRole("link", { name: "View constraints" })).toBeNull();
		expect(next()).toBeDisabled();
	});

	it("given_theSetupGate_when_fixedOnTheShiftsTab_then_returnsToSetupWithTheDepartmentAndMonth", async () => {
		const user = userEvent.setup();
		await open(NEW_DECEMBER, {
			// Not ready on Setup, ready once the tab asks again.
			[READINESS]: [
				frontOffice(["SHIFT", "STAFFING_CONSTRAINT"]),
				frontOffice([]),
			],
		});

		await user.click(
			await screen.findByRole("link", { name: "Set up Front Office" })
		);
		await user.click(
			await screen.findByRole("link", { name: "Create schedule" })
		);

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /Department/ })
			).toHaveTextContent("Front Office");
		});
		expect(screen.getByRole("button", { name: /Month/ })).toHaveTextContent(
			"December 2026"
		);
	});
});

describe("Create schedules for a month: the header's Branch", () => {
	it("given_oneBranchToCreateIn_when_setupOpens_then_theHeaderNamesItAsText", async () => {
		await open("/scheduling/new");
		await screen.findByRole("region", { name: "Schedule setup" });

		const header = screen.getByRole("banner");
		expect(
			within(header).queryByRole("button", { name: "Branch" })
		).not.toBeInTheDocument();
		expect(within(header).getByText("Main branch")).toBeVisible();
	});

	it("given_twoBranches_when_theHeaderBranchChanges_then_offersItsDepartmentsAndLetsTheChosenOneGo", async () => {
		const user = userEvent.setup();
		const { opened } = await open(
			"/scheduling/new",
			{},
			twoBranchSchedulingWorkspace(ALL)
		);
		await screen.findByRole("region", { name: "Schedule setup" });
		const header = screen.getByRole("banner");
		const branch = within(header).getByRole("button", { name: "Branch" });
		expect(branch).toHaveTextContent("Main branch");

		await user.click(screen.getByRole("button", { name: /Department/ }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Front Office", "Kitchen"]);
		await user.click(screen.getByRole("option", { name: "Kitchen" }));

		await user.click(branch);
		await user.click(screen.getByRole("option", { name: "North" }));

		await waitFor(() => {
			expect(opened.router.state.location.search).toMatchObject({
				branch: "b-2",
			});
		});
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /Department/ })
			).toHaveTextContent("Select a department");
		});
		await user.click(screen.getByRole("button", { name: /Department/ }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Front Office"]);
	});
});

describe("Create schedules for a month: where everyone starts", () => {
	const NOVEMBER = `${COMPANY}/schedule-months/2026-11`;
	const SCHEDULES = `${DEPARTMENT}/schedules`;
	/** November with its last week, the week before December's first, in `state`. */
	const novemberEndingIn = (state: "NOT_GENERATED" | "PUBLISHED"): StubReply =>
		reply(
			scheduleMonthFixture({
				weeks: [
					monthWeekFixture({
						periodStart: "2026-11-30",
						periodEnd: "2026-12-06",
						state,
						scheduleId: state === "PUBLISHED" ? "s-nov" : null,
						days: [],
						handChangedDays: null,
					}),
				],
			})
		);
	/** December once its first week is saved as the draft s-start. */
	const decemberWithItsFirstWeekSaved = (): StubReply => {
		const month = ungeneratedMonthFixture();
		return reply({
			...month,
			weeks: month.weeks.map((week, index) =>
				index === 0 ? { ...week, state: "DRAFT", scheduleId: "s-start" } : week
			),
		});
	};
	const addLastWeek = (): HTMLElement | null =>
		screen.queryByRole("button", { name: "Add last week’s shifts" });

	it("given_noRosterBefore_when_lastWeekAdded_then_savesTheWeekOpensTheGridAndGenerateLeavesItOut", async () => {
		const user = userEvent.setup();
		const { calls } = await open(NEW_DECEMBER, {
			[`GET ${NOVEMBER}`]: novemberEndingIn("NOT_GENERATED"),
			[`GET ${DECEMBER}`]: [
				reply(ungeneratedMonthFixture()),
				decemberWithItsFirstWeekSaved(),
			],
			[`POST ${SCHEDULES}`]: reply(
				scheduleFixture({ scheduleId: "s-start" }),
				201
			),
			[`GET ${SCHEDULES}/s-start/starting-days`]: reply(firstWeek()),
			[`GET ${SCHEDULES}/s-start/opening-balances`]: reply(midMonthOpenings()),
		});

		expect(
			await screen.findByText(
				"Horaion doesn’t know what people worked last week."
			)
		).toBeVisible();
		await user.click(
			await screen.findByRole("button", { name: "Add last week’s shifts" })
		);

		expect(await screen.findByRole("dialog")).toBeVisible();
		expect(
			calls
				.filter((call) => call.method === "POST" && call.path === SCHEDULES)
				.map((call) => call.body)
		).toEqual([
			{
				name: "Week of 2026-12-07",
				periodStart: "2026-12-07",
				includeLeave: true,
				includedShiftIds: EVERYTHING.shiftIds,
				includedConstraintIds: EVERYTHING.constraintIds,
			},
		]);
		await user.keyboard("{Escape}");
		expect(
			await screen.findByText(
				/^Dec 7\s?–\s?13 is saved as a draft; change what it uses on its own page\.$/
			)
		).toBeVisible();

		await user.click(screen.getByRole("button", { name: "Choose per week" }));
		expect(
			within(await screen.findByRole("tablist", { name: "Weeks of December" }))
				.getAllByRole("tab")
				.map((tab) => tab.textContent?.trim())
		).not.toContainEqual(expect.stringMatching(/^Dec 7/));
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		await user.click(next());
		await screen.findByRole("region", { name: "Staffing forecast" });
		await user.click(next());
		const generate = await screen.findByRole("button", {
			name: "Generate December",
		});
		await vi.waitFor(() => {
			expect(generate).toBeEnabled();
		});
		await user.click(generate);

		await vi.waitFor(() => {
			expect(
				calls.some(
					(call) =>
						call.method === "POST" && call.path === `${DECEMBER}/generation`
				)
			).toBe(true);
		});
		const post = calls.find(
			(call) => call.method === "POST" && call.path === `${DECEMBER}/generation`
		);
		expect(
			(post?.body as GenerateMonthBody).newWeeks.map((week) => week.periodStart)
		).toEqual(["2026-12-14", "2026-12-21", "2026-12-28"]);
	});

	it("given_theWeekBeforeRostered_when_onSetup_then_saysWhereItCarriesFromWithoutALink", async () => {
		await open(NEW_DECEMBER, {
			[`GET ${NOVEMBER}`]: novemberEndingIn("PUBLISHED"),
		});

		expect(
			await screen.findByText("Carried over from the week of Nov 30.")
		).toBeVisible();
		expect(addLastWeek()).toBeNull();
	});

	it("given_theWeekBeforeRostered_when_onSetup_then_theHoursWorkedThisMonthCanStillBeAdded", async () => {
		await open(NEW_DECEMBER, {
			[`GET ${NOVEMBER}`]: novemberEndingIn("PUBLISHED"),
		});

		expect(
			await screen.findByText(
				"Hours worked before Dec 7 come from the roster of the week before, except for anyone it doesn’t cover."
			)
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Add hours worked" })
		).toBeVisible();
	});

	it("given_noRosterBefore_when_hoursAdded_then_savesTheWeekAndOpensTheHours", async () => {
		const user = userEvent.setup();
		const { calls } = await open(NEW_DECEMBER, {
			[`GET ${NOVEMBER}`]: novemberEndingIn("NOT_GENERATED"),
			[`GET ${DECEMBER}`]: [
				reply(ungeneratedMonthFixture()),
				decemberWithItsFirstWeekSaved(),
			],
			[`POST ${SCHEDULES}`]: reply(
				scheduleFixture({ scheduleId: "s-start" }),
				201
			),
			[`GET ${SCHEDULES}/s-start/starting-days`]: reply(firstWeek()),
			[`GET ${SCHEDULES}/s-start/opening-balances`]: reply(midMonthOpenings()),
		});

		expect(
			await screen.findByText(
				"Horaion doesn’t know the hours people worked this month before Dec 7."
			)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Add hours worked" }));

		expect(
			await screen.findByRole("dialog", {
				name: /^Hours already worked this month/,
			})
		).toBeVisible();
		expect(
			calls.filter((call) => call.method === "POST" && call.path === SCHEDULES)
		).toHaveLength(1);
	});

	it("given_noScheduleUpdate_when_noRosterBefore_then_noLink", async () => {
		await open(
			NEW_DECEMBER,
			{ [`GET ${NOVEMBER}`]: novemberEndingIn("NOT_GENERATED") },
			ALL.filter((permission) => permission !== "schedule:update")
		);

		expect(
			await screen.findByText(
				"Horaion doesn’t know what people worked last week."
			)
		).toBeVisible();
		expect(addLastWeek()).toBeNull();
	});

	it("given_noRosterBeforeAndNothingEntered_when_onSetup_then_theWeekPagesWarningWithItsButton", async () => {
		await open(NEW_DECEMBER, {
			[`GET ${NOVEMBER}`]: novemberEndingIn("NOT_GENERATED"),
		});

		const warning = (
			await screen.findByText(
				"Horaion doesn’t know what people worked last week."
			)
		).closest("[role='note']");
		expect(warning).toHaveClass("bg-warning-50");
		expect(warning).toHaveTextContent(
			"Without it, everyone is treated as rested, so someone who worked Sunday night could be given Monday morning."
		);
		expect(addLastWeek()).toBeVisible();
	});

	it("given_theFirstWeekSavedWithDaysEntered_when_onSetup_then_theCalmLineWithItsEditButton", async () => {
		const week = firstWeek();
		const [first, ...rest] = week.members;
		if (!first) throw new Error("fixture has a member");
		const lastDay = week.days[week.days.length - 1]!;
		const entered = {
			...week,
			members: [
				{
					...first,
					cells: first.cells.map((cell) =>
						cell.date === lastDay ? enteredNightCell(lastDay) : cell
					),
				},
				...rest,
			],
		};
		await open(NEW_DECEMBER, {
			[`GET ${NOVEMBER}`]: novemberEndingIn("NOT_GENERATED"),
			[`GET ${DECEMBER}`]: decemberWithItsFirstWeekSaved(),
			[`GET ${SCHEDULES}/s-start`]: reply(
				scheduleFixture({ scheduleId: "s-start" })
			),
			[`GET ${SCHEDULES}/s-start/starting-days`]: reply(entered),
			[`GET ${SCHEDULES}/s-start/opening-balances`]: reply(midMonthOpenings()),
		});

		const line = await screen.findByText(
			"No roster before this week. Days are added for 1 person; everyone else starts rested."
		);
		expect(line.closest("[role='note']")).not.toHaveClass("bg-warning-50");
		expect(
			screen.queryByText("Horaion doesn’t know what people worked last week.")
		).toBeNull();
	});

	const LAST_WEEKS_DAYS_UNKNOWN =
		"Horaion doesn’t know what people worked last week.";
	/** The block under a week's dates line, e.g. /^Dec 21\s?–\s?27$/. */
	const weekBlock = (dates: RegExp): HTMLElement => {
		const block = screen.getByText(dates).parentElement;
		if (!block) throw new Error("a dates line sits in its week's block");
		return block;
	};
	const untick = async (
		user: ReturnType<typeof userEvent.setup>,
		dates: string
	): Promise<void> => {
		await user.click(
			within(await screen.findByRole("table", { name: "Weeks" })).getByRole(
				"checkbox",
				{ name: `Select ${dates}` }
			)
		);
	};

	it("given_aTickedWeekAfterAnUntickedWeekWithoutARoster_when_onSetup_then_asksForThatWeeksDaysUnderItsDatesWithoutHours", async () => {
		const user = userEvent.setup();
		await open(NEW_DECEMBER);

		await screen.findByText(EVERY_WEEK_LINE);
		await untick(user, "Mon, Dec 14 to Sun, Dec 20");

		const gapWeek = await vi.waitFor(() => weekBlock(/^Dec 21\s?–\s?27$/));
		expect(within(gapWeek).getByText(LAST_WEEKS_DAYS_UNKNOWN)).toBeVisible();
		expect(
			within(gapWeek).getByRole("button", { name: "Add last week’s shifts" })
		).toBeVisible();
		expect(within(gapWeek).queryByText(/hours people worked/)).toBeNull();
		expect(screen.getByText(/^Dec 7\s?–\s?13$/)).toBeVisible();
		expect(screen.getAllByText(LAST_WEEKS_DAYS_UNKNOWN)).toHaveLength(2);
		expect(
			screen.getAllByRole("button", { name: "Add hours worked" })
		).toHaveLength(1);
	});

	it("given_thatWeeksDaysAdded_when_saved_then_savesThatWeekAsADraftAndOpensItsGrid", async () => {
		const user = userEvent.setup();
		const december = ungeneratedMonthFixture();
		const { calls } = await open(NEW_DECEMBER, {
			[`GET ${DECEMBER}`]: [
				reply(december),
				reply({
					...december,
					weeks: december.weeks.map((week) =>
						week.periodStart === "2026-12-21"
							? { ...week, state: "DRAFT", scheduleId: "s-gap" }
							: week
					),
				}),
			],
			[`POST ${SCHEDULES}`]: reply(
				scheduleFixture({ scheduleId: "s-gap" }),
				201
			),
			[`GET ${SCHEDULES}/s-gap`]: reply(scheduleFixture({ scheduleId: "s-gap" })),
			[`GET ${SCHEDULES}/s-gap/starting-days`]: reply(firstWeek()),
		});

		await screen.findByText(EVERY_WEEK_LINE);
		await untick(user, "Mon, Dec 14 to Sun, Dec 20");
		const gapWeek = await vi.waitFor(() => weekBlock(/^Dec 21\s?–\s?27$/));
		await user.click(
			within(gapWeek).getByRole("button", { name: "Add last week’s shifts" })
		);

		expect(
			await screen.findByRole("dialog", { name: "Before this week" })
		).toBeVisible();
		expect(
			calls
				.filter((call) => call.method === "POST" && call.path === SCHEDULES)
				.map((call) => (call.body as { periodStart: string }).periodStart)
		).toEqual(["2026-12-21"]);
	});

	it("given_aTickedWeekAfterAnUntickedWeekWithARoster_when_onSetup_then_asksNothingForIt", async () => {
		const december = ungeneratedMonthFixture();
		await open(NEW_DECEMBER, {
			[`GET ${DECEMBER}`]: reply({
				...december,
				weeks: december.weeks.map((week) =>
					week.periodStart === "2026-12-14"
						? { ...week, state: "TO_REVIEW", scheduleId: "s-14" }
						: week
				),
			}),
		});

		expect(await screen.findByText(LAST_WEEKS_DAYS_UNKNOWN)).toBeVisible();
		expect(screen.getAllByText(LAST_WEEKS_DAYS_UNKNOWN)).toHaveLength(1);
		expect(screen.queryByText(/^Dec 21\s?–\s?27$/)).toBeNull();
	});

	it("given_consecutiveTickedWeeks_when_onSetup_then_asksOnlyForTheFirst", async () => {
		await open(NEW_DECEMBER);

		expect(await screen.findByText(LAST_WEEKS_DAYS_UNKNOWN)).toBeVisible();
		expect(screen.getAllByText(LAST_WEEKS_DAYS_UNKNOWN)).toHaveLength(1);
		expect(screen.queryByText(/^Dec 7\s?–\s?13$/)).toBeNull();
	});

	it("given_aRefusedSave_when_lastWeekAdded_then_saysWhy", async () => {
		const user = userEvent.setup();
		await open(NEW_DECEMBER, {
			[`GET ${NOVEMBER}`]: novemberEndingIn("NOT_GENERATED"),
			[`POST ${SCHEDULES}`]: problemReply(403, "FORBIDDEN"),
		});

		await user.click(
			await screen.findByRole("button", { name: "Add last week’s shifts" })
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"You don’t have permission to create schedules for this department."
		);
	});
});
