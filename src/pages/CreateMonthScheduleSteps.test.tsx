import { screen, within } from "@testing-library/react";
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
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS_RESPONSE,
} from "@/features/scheduling/constraints/fixtures";
import { midMonthOpenings } from "@/features/scheduling/hours/fixtures";
import {
	datesGenerationFixture,
	datesPlanFixture,
} from "@/features/scheduling/dates/fixtures";
import {
	monthGenerationCheckFixture,
	monthGenerationFixture,
	scheduleMonthFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import {
	scheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import {
	SHIFT_FIXTURES,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";
import { firstWeek } from "@/features/scheduling/startingContext/fixtures";
import { allOf } from "@/features/scheduling/weekChoice";

/*
 * The month wizard moving between its steps: what Setup holds must survive
 * going to Generate and back, and the Forecast step between them is empty,
 * optional and sends nothing. The page's other behaviour is tested in
 * features/scheduling/CreateMonthSchedule.test.tsx.
 */

vi.setConfig({ testTimeout: 15_000 });

const COMPANY = "/api/v1/companies/c-1";
const DEPARTMENT = `${COMPANY}/branches/b-1/departments/d-1`;
const DECEMBER = `${COMPANY}/schedule-months/2026-12`;
const NOVEMBER = `${COMPANY}/schedule-months/2026-11`;
const SCHEDULES = `${DEPARTMENT}/schedules`;
const EVERY_KEY = [
	"schedule:read",
	"schedule:create",
	"schedule:update",
	"schedule:generate",
	"shift:read",
	"constraint:read",
];

let app: OpenedApp | undefined;

const reply = (data: unknown, status = 200): StubReply => ({
	status,
	body: envelope(data),
});

/** Opens the app at `entry` with Front Office's lists and December not generated, plus `extra` replies. */
const open = async (
	entry: string,
	extra: Parameters<typeof stubApi>[0] = {}
): Promise<{ opened: OpenedApp; calls: ReturnType<typeof stubApi> }> => {
	const calls = stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": reply(schedulingWorkspace(EVERY_KEY)),
		[`GET ${COMPANY}/scheduling-readiness`]: reply([readinessFixture()]),
		[`GET ${COMPANY}/schedule-months`]: reply([]),
		[`GET ${DECEMBER}`]: reply(ungeneratedMonthFixture()),
		[`GET ${DECEMBER}/generation-check`]: reply(monthGenerationCheckFixture()),
		[`GET ${DEPARTMENT}/shifts`]: reply(
			SHIFT_FIXTURES.map((shift) => departmentShiftFixture(shift))
		),
		[`GET ${DEPARTMENT}/constraints`]: reply(CONSTRAINT_FIXTURES),
		[`GET ${DEPARTMENT}/constraint-options`]: reply(
			CONSTRAINT_OPTIONS_RESPONSE
		),
		...extra,
	});
	app = await openApp(entry);
	renderAuthApp(app);
	return { opened: app, calls };
};

const next = (): HTMLElement => screen.getByRole("button", { name: "Next" });

/** From a ready Setup, Next to the Forecast step. */
const toForecast = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await vi.waitFor(() => {
		expect(next()).toBeEnabled();
	});
	await user.click(next());
	await screen.findByRole("region", { name: "Staffing forecast" });
};

/** From a ready Setup through Forecast to Generate, then Back through Forecast to Setup. */
const toGenerateAndBack = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await toForecast(user);
	await user.click(next());
	await screen.findByRole("button", { name: /^Generate December/ });
	await user.click(screen.getByRole("button", { name: "Back" }));
	await screen.findByRole("region", { name: "Staffing forecast" });
	await user.click(screen.getByRole("button", { name: "Back" }));
	await screen.findByRole("table", { name: "Weeks" });
};

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// Thursday 12 Nov 2026: November has weeks to schedule, so the page suggests it.
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

const monthField = (): HTMLElement =>
	screen.getByRole("button", { name: /Month/ });

/** The names of the Weeks table's tick boxes, in order. */
const weekBoxNames = (): Array<string> =>
	within(screen.getByRole("table", { name: "Weeks" }))
		.getAllByRole("checkbox")
		.map((box) => box.getAttribute("aria-label") ?? "")
		.filter((name) => name.startsWith("Select Mon"));

describe("Schedule a month: going back from Generate", () => {
	it("given_aMonthChosenByHand_when_backFromGenerate_then_theSameMonthWeeksAndUrl", async () => {
		const user = userEvent.setup();
		const { opened } = await open("/scheduling/new?department=d-1&for=month");
		await vi.waitFor(() => {
			expect(monthField()).toHaveTextContent("November 2026");
		});

		await user.click(monthField());
		await user.click(
			await screen.findByRole("option", { name: "December 2026" })
		);
		await screen.findByRole("checkbox", {
			name: "Select Mon, Dec 7 to Sun, Dec 13",
		});
		const decemberWeeks = weekBoxNames();
		await toGenerateAndBack(user);

		await settled(opened.router);
		expect(monthField()).toHaveTextContent("December 2026");
		expect(weekBoxNames()).toEqual(decemberWeeks);
		expect(opened.router.state.location.search).toEqual({
			step: "setup",
			department: "d-1",
			month: "2026-12",
		});
	});

	it("given_beforeThisWeekOpenedOnceBySavingTheDraft_when_backFromGenerate_then_itDoesNotOpenByItself", async () => {
		const user = userEvent.setup();
		const savedDecember = ungeneratedMonthFixture();
		await open("/scheduling/new?department=d-1&month=2026-12", {
			[`GET ${NOVEMBER}`]: reply(scheduleMonthFixture({ weeks: [] })),
			[`GET ${DECEMBER}`]: [
				reply(savedDecember),
				reply({
					...savedDecember,
					weeks: savedDecember.weeks.map((week, index) =>
						index === 0
							? { ...week, state: "DRAFT", scheduleId: "s-start" }
							: week
					),
				}),
			],
			[`POST ${SCHEDULES}`]: reply(
				scheduleFixture({ scheduleId: "s-start" }),
				201
			),
			[`GET ${SCHEDULES}/s-start/starting-days`]: reply(firstWeek()),
			[`GET ${SCHEDULES}/s-start/opening-balances`]: reply(midMonthOpenings()),
		});
		await user.click(
			await screen.findByRole("button", { name: "Add prior shifts" })
		);
		await screen.findByRole("dialog", { name: "Before these days" });
		await user.keyboard("{Escape}");
		await vi.waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});

		await toGenerateAndBack(user);

		await screen.findByRole("button", { name: /prior shifts/ });
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});

describe("Schedule a month or dates: the Forecast step", () => {
	const DATES = `${COMPANY}/schedule-dates`;
	const DECEMBER_WEEKS = [
		"2026-12-07",
		"2026-12-14",
		"2026-12-21",
		"2026-12-28",
	];
	const EVERYTHING = allOf(
		SHIFT_FIXTURES.map((shift) => departmentShiftFixture(shift)),
		CONSTRAINT_FIXTURES
	);
	/** One choice per new week, each using everything the Department has. */
	const newWeeksOf = (mondays: Array<string>): Array<object> =>
		mondays.map((periodStart) => ({
			periodStart,
			includedShiftIds: EVERYTHING.shiftIds,
			includedConstraintIds: EVERYTHING.constraintIds,
		}));
	/** The two runs the page starts: where each opens, the route it posts and the whole body it sends. */
	const FLOWS = [
		{
			flow: "aMonthRun",
			entry: "/scheduling/new?department=d-1&month=2026-12",
			route: `${DECEMBER}/generation`,
			body: {
				includeLeave: true,
				weeks: DECEMBER_WEEKS,
				newWeeks: newWeeksOf(DECEMBER_WEEKS),
			},
		},
		{
			flow: "aDatesRun",
			entry:
				"/scheduling/new?department=d-1&month=2026-12&for=dates&firstDay=2026-11-19&lastDay=2026-11-28",
			route: `${DATES}/generation`,
			body: {
				firstDay: "2026-11-19",
				lastDay: "2026-11-28",
				includeLeave: true,
				newWeeks: newWeeksOf(["2026-11-16", "2026-11-23"]),
			},
		},
	];
	/** The replies both runs need beyond the page's lists. */
	const runRoutes = (): Parameters<typeof stubApi>[0] => ({
		[`POST ${DECEMBER}/generation`]: reply(monthGenerationFixture()),
		[`GET ${DATES}/plan`]: reply(datesPlanFixture()),
		[`POST ${DATES}/generation`]: reply(datesGenerationFixture()),
		[`GET ${NOVEMBER}/generation-check`]: reply(
			monthGenerationCheckFixture({ month: "2026-11" })
		),
	});
	/** The bodies posted to `route` so far. */
	const postedTo = (
		calls: ReturnType<typeof stubApi>,
		route: string
	): Array<unknown> =>
		calls
			.filter((call) => call.method === "POST" && call.path === route)
			.map((call) => call.body);

	it.each(FLOWS)(
		"given_$flow_when_setupIsDone_then_threeStepsAndNextLandsOnAnEmptyForecastThenGenerate",
		async ({ entry }) => {
			const user = userEvent.setup();
			const { opened } = await open(entry, runRoutes());

			const steps = await screen.findByRole("navigation", { name: "Steps" });
			expect(
				within(steps)
					.getAllByRole("listitem")
					.map((step) => step.getAttribute("aria-label") ?? step.textContent)
			).toEqual(["Step 1: Setup", "Step 2: Forecast", "Step 3: Generate"]);
			await toForecast(user);

			expect(opened.router.state.location.search).toMatchObject({
				step: "forecast",
			});
			// It says its numbers are not used, and starts with nobody allocated.
			expect(
				screen.getByText(/^These numbers aren’t used to generate yet\./)
			).toBeVisible();
			for (const total of screen.getAllByText(/staff allocated$/))
				expect(total).toHaveTextContent("0 staff allocated");

			// Nothing entered: Next still goes on to Generate.
			await user.click(next());
			expect(
				await screen.findByRole("button", { name: /^Generate / })
			).toBeVisible();
		}
	);

	it.each(
		FLOWS.flatMap((flow) => [
			{ ...flow, entered: "nothingEntered", entersANumber: false },
			{ ...flow, entered: "aNumberEntered", entersANumber: true },
		])
	)(
		"given_$flow_with_$entered_onForecast_when_generated_then_theBodyIsTheSame",
		async ({ entry, route, body, entersANumber }) => {
			const user = userEvent.setup();
			const { calls } = await open(entry, runRoutes());
			await toForecast(user);
			if (entersANumber)
				await user.click(
					screen.getByRole("button", { name: "More Front Desk Lead" })
				);

			await user.click(next());
			const generate = await screen.findByRole("button", {
				name: /^Generate /,
			});
			await vi.waitFor(() => {
				expect(generate).toBeEnabled();
			});
			await user.click(generate);

			await vi.waitFor(() => {
				expect(postedTo(calls, route)).toHaveLength(1);
			});
			expect(postedTo(calls, route)).toEqual([body]);
		}
	);

	// The setup lives in the page, so a link to a later step with none goes back to Setup, as one to Generate does.
	it("given_aLinkNamingTheForecastStepWithNoSetup_when_opened_then_opensSetup", async () => {
		await open("/scheduling/new?step=forecast&department=d-1&month=2026-12");

		expect(
			await screen.findByRole("table", { name: "Weeks" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("region", { name: "Staffing forecast" })
		).toBeNull();
	});
});
