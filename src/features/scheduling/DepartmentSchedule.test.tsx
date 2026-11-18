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
import dayjs from "dayjs";
import { mondayOf } from "@/common/weeks";
import { withDatesRun } from "@/features/scheduling/months/datesRunState";
import type { ScheduleMonth, WeekPart } from "@/features/scheduling/months/api";
import {
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import { windowDays } from "@/features/scheduling/timeline/timeline";
import { LABEL_DAY_FORMAT } from "@/features/scheduling/timeline/timelineLooks";
import { monthsOfWindow } from "@/features/scheduling/timeline/timelineRows";

let app: OpenedApp | undefined;

afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.restoreAllMocks();
	vi.useRealTimers();
	localStorage.clear();
});

const MONTHS = "/api/v1/companies/c-1/schedule-months";
const SCHEDULES =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules";

type Routes = Parameters<typeof stubApi>[0];

const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

/** The roster fixture's rows on the days from `firstDay` to `lastDay` only. */
const assignmentsFrom = (firstDay: string, lastDay: string): StubReply =>
	ok(
		scheduleAssignmentsFixture().filter(
			(assignment) => assignment.day >= firstDay && assignment.day <= lastDay
		)
	);

/**
 * Kitchen's week of 12 October 2026: "Early days" Monday to Wednesday, to
 * review, and "Weekend" Friday to Sunday, published; Thursday has none.
 */
const twoSchedulesInOneWeek = (): Routes => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(schedulingWorkspace(["schedule:read"])),
	},
	[`GET ${MONTHS}/2026-10`]: ok(
		scheduleMonthFixture({
			month: "2026-10",
			weeks: [
				monthWeekFixture({
					periodStart: "2026-10-12",
					periodEnd: "2026-10-18",
					parts: [
						{
							scheduleId: "s-1",
							name: "Early days",
							named: true,
							coveredFrom: "2026-10-12",
							coveredTo: "2026-10-14",
							state: "TO_REVIEW",
							redoing: false,
						},
						{
							scheduleId: "s-2",
							name: "Weekend",
							named: true,
							coveredFrom: "2026-10-16",
							coveredTo: "2026-10-18",
							state: "PUBLISHED",
							redoing: false,
						},
					],
				}),
			],
		})
	),
	[`GET ${SCHEDULES}/s-1`]: ok(
		generatedScheduleFixture({ status: "GENERATED" })
	),
	[`GET ${SCHEDULES}/s-2`]: ok(
		generatedScheduleFixture({ status: "PUBLISHED" })
	),
	[`GET ${SCHEDULES}/s-1/assignments`]: assignmentsFrom(
		"2026-10-12",
		"2026-10-14"
	),
	[`GET ${SCHEDULES}/s-2/assignments`]: assignmentsFrom(
		"2026-10-16",
		"2026-10-18"
	),
});

/** Opens the timeline at `search` and waits for Aisha's row. */
const openTimeline = async (search: string): Promise<HTMLElement> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi(twoSchedulesInOneWeek());
	app = await openApp(`/scheduling/department?department=d-1&${search}`);
	renderAuthApp(app);
	return screen.findByRole("row", { name: /Aisha Rahman/ });
};

/** The cells of `row` that belong to `scheduleId`. */
const cellsOf = (row: HTMLElement, scheduleId: string): Array<Element> => [
	...row.querySelectorAll(`[data-schedule-id="${scheduleId}"]`),
];

it("shows two schedules in one week as two bars, their cells, and No schedule on the day in neither", async () => {
	const row = await openTimeline("from=2026-10-12");

	expect(
		screen.getByRole("heading", { level: 1, name: "Kitchen Schedule" })
	).toBeInTheDocument();
	const lane = screen
		.getByRole("rowheader", { name: "Schedules" })
		.closest("tr")!;
	const barCells = within(lane).getAllByRole("cell");
	expect(barCells.map((cell) => cell.getAttribute("colspan"))).toEqual([
		"3",
		"1",
		"3",
	]);
	expect(within(barCells[0]!).getByText("Early days")).toBeInTheDocument();
	expect(within(barCells[2]!).getByText("Weekend")).toBeInTheDocument();
	await vi.waitFor(() => {
		expect(cellsOf(row, "s-1")).toHaveLength(3);
		expect(cellsOf(row, "s-2")).toHaveLength(3);
	});
	expect(within(row).getByText("No schedule")).toBeInTheDocument();
});

it("dims the other schedules' bars and cells when one is shown alone", async () => {
	const row = await openTimeline("from=2026-10-12&schedule=s-1");

	await vi.waitFor(() => {
		expect(cellsOf(row, "s-2")).toHaveLength(3);
	});
	for (const cell of cellsOf(row, "s-2"))
		expect(cell).toHaveClass("opacity-40");
	for (const cell of cellsOf(row, "s-1"))
		expect(cell).not.toHaveClass("opacity-40");
	expect(
		screen.getByRole("button", { name: /^Weekend,/ }).closest("td")
	).toHaveClass("opacity-40");
	expect(
		screen.getByRole("button", { name: /^Early days,/ }).closest("td")
	).not.toHaveClass("opacity-40");
	expect(
		screen.getByText("Showing only Early days. Other schedules are dimmed.")
	).toBeInTheDocument();
});

it("shows fourteen day columns once zoomed to two weeks", async () => {
	await openTimeline("from=2026-10-12");
	const grid = screen.getByRole("table", { name: "Staff by day" });
	expect(within(grid).getAllByRole("columnheader")).toHaveLength(8);

	await userEvent.click(screen.getByRole("button", { name: "2 weeks" }));

	expect(
		await within(
			screen.getByRole("table", { name: "Staff by day" })
		).findAllByRole("columnheader")
	).toHaveLength(15);
});

it("names the schedule to review in the needs list", async () => {
	await openTimeline("from=2026-10-12");

	expect(
		screen.getByText("Early days is ready to review.")
	).toBeInTheDocument();
});

it("says which days are being generated on arrival from a run by dates", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi(twoSchedulesInOneWeek());
	app = await openApp("/scheduling/department?department=d-1&from=2026-10-05");
	renderAuthApp(app);
	await screen.findByRole("heading", { level: 1, name: "Kitchen Schedule" });

	await app.router.navigate({
		to: "/scheduling/department",
		search: { department: "d-1", from: "2026-10-12" },
		state: withDatesRun({}, { firstDay: "2026-10-15", lastDay: "2026-10-15" }),
	});

	expect(
		await screen.findByText("Schedules for Oct 15, 2026 are being generated.")
	).toBeInTheDocument();
});

/** "Open schedule" links with no `from`: the window opens on the Monday of today's week. */
it("starts on the Monday of today's week when the link names no day", async () => {
	const days = windowDays(mondayOf(new Date()), "week");
	const months = monthsOfWindow(days[0]!, days[days.length - 1]!);
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi({
		...twoSchedulesInOneWeek(),
		...Object.fromEntries(
			months.map((month) => [
				`GET ${MONTHS}/${month}`,
				ok(scheduleMonthFixture({ month, weeks: [] })),
			])
		),
	});
	app = await openApp("/scheduling/department?department=d-1");
	renderAuthApp(app);

	const table = await screen.findByRole("table", { name: "Staff by day" });
	const [, firstDay] = within(table).getAllByRole("columnheader");
	expect(firstDay).toHaveAttribute(
		"title",
		new Intl.DateTimeFormat("en-US", LABEL_DAY_FORMAT).format(
			dayjs(days[0]).toDate()
		)
	);
	expect(dayjs(days[0]).day()).toBe(1);
});

/** A `schedule=` left over after moving the window names no schedule there: nothing is dimmed and the select shows all. */
it("drops a stale schedule choice once the window moves on", async () => {
	await openTimeline("from=2026-10-12&schedule=s-1");

	await userEvent.click(screen.getByRole("button", { name: "Later days" }));

	const toolbar = screen.getByRole("group", { name: "Days shown" });
	await vi.waitFor(() => {
		expect(
			within(toolbar).getByRole("button", { name: /^Schedule/ })
		).toHaveTextContent("All schedules");
	});
	expect(document.querySelector(".opacity-40")).toBeNull();
	expect(screen.queryByText(/^Showing only/)).not.toBeInTheDocument();
});

/** The two-part week with its weekend part in `weekend`'s state, today being Saturday 10 October 2026, before it. */
const openBeforeTheWeek = async (weekend: Partial<WeekPart>): Promise<void> => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-10-10T09:00:00"));
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const routes = twoSchedulesInOneWeek();
	const month = (
		routes[`GET ${MONTHS}/2026-10`] as { body: { data: ScheduleMonth } }
	).body.data;
	const [early, late] = month.weeks[0]!.parts;
	stubApi({
		...routes,
		[`GET ${MONTHS}/2026-10`]: ok({
			...month,
			weeks: [
				{ ...month.weeks[0]!, parts: [early!, { ...late!, ...weekend }] },
			],
		}),
	});
	app = await openApp("/scheduling/department?department=d-1&from=2026-10-12");
	renderAuthApp(app);
	await screen.findByRole("heading", { level: 2, name: "Needs you" });
};

/** Thursday lies before the published (or once published) weekend part: the API refuses it, so no Create schedule. */
it.each([
	["published", { state: "PUBLISHED" as const }],
	["published once", { state: "TO_REVIEW" as const, publishedOnce: true }],
])(
	"offers no Create schedule for days before a %s part",
	async (_, weekend) => {
		await openBeforeTheWeek(weekend);

		expect(
			await screen.findByText(
				/^No schedule for Oct 15, 2026\. Days before a published schedule in the same week cannot be scheduled\.$/
			)
		).toBeInTheDocument();
		const needs = screen.getByRole("region", { name: "Needs you" });
		expect(
			within(needs).queryByRole("link", { name: "Create schedule" })
		).not.toBeInTheDocument();
	}
);

/** While a roster is still being read the grid says it is loading, not that no one is rostered. */
it("says the rosters are loading while their reads are on the way", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi(twoSchedulesInOneWeek());
	const answered = globalThis.fetch;
	// The rosters' replies never arrive.
	vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
		url.includes("/assignments")
			? new Promise<Response>(() => {})
			: answered(url, init)
	);
	app = await openApp("/scheduling/department?department=d-1&from=2026-10-12");
	renderAuthApp(app);

	expect(await screen.findByText("Loading the rosters…")).toBeInTheDocument();
	expect(
		screen.queryByText("No one is rostered in these days yet.")
	).not.toBeInTheDocument();
});

/** A schedule that can't be read (here gone, a 404) is an alert, not an empty grid. */
it("alerts when a schedule's roster could not be read", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi({
		...twoSchedulesInOneWeek(),
		[`GET ${SCHEDULES}/s-2`]: problemReply(404, "SCHEDULE_NOT_FOUND"),
	});
	app = await openApp("/scheduling/department?department=d-1&from=2026-10-12");
	renderAuthApp(app);

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"The rosters couldn't be loaded. Reload the page to try again."
	);
});

/** The two-part week with its early part changed by `early`. */
const openWithEarlyPart = async (early: Partial<WeekPart>): Promise<void> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const routes = twoSchedulesInOneWeek();
	const month = (
		routes[`GET ${MONTHS}/2026-10`] as { body: { data: ScheduleMonth } }
	).body.data;
	const [first, weekend] = month.weeks[0]!.parts;
	stubApi({
		...routes,
		[`GET ${MONTHS}/2026-10`]: ok({
			...month,
			weeks: [
				{ ...month.weeks[0]!, parts: [{ ...first!, ...early }, weekend!] },
			],
		}),
	});
	app = await openApp("/scheduling/department?department=d-1&from=2026-10-12");
	renderAuthApp(app);
	await screen.findByRole("heading", { level: 1, name: "Kitchen Schedule" });
};

/** A failed, rejected or never generated schedule has nothing to publish, so the notice does not name it. */
it.each(["FAILED", "REJECTED", "NOT_GENERATED"] as const)(
	"leaves a %s schedule out of the Not published yet notice",
	async (state) => {
		await openWithEarlyPart({ state });

		await screen.findByRole("button", { name: /^Early days,/ });
		expect(screen.queryByText(/^Not published yet/)).not.toBeInTheDocument();
	}
);

/** A draft's bar opens its setup, where the week card sends a draft, not the roster page. */
it("opens a draft's setup from its bar", async () => {
	await openWithEarlyPart({ state: "DRAFT" });

	await userEvent.click(
		await screen.findByRole("button", { name: /^Early days,/ })
	);
	await userEvent.click(
		await screen.findByRole("menuitem", { name: "Open schedule" })
	);

	await vi.waitFor(() => {
		expect(app?.router.state.location.pathname).toBe("/scheduling/new");
	});
	expect(app?.router.state.location.search).toMatchObject({
		step: "setup",
		scheduleId: "s-1",
		departmentId: "d-1",
	});
});
