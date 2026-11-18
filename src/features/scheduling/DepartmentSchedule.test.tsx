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
	scheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import { mayDeleteSchedule } from "@/features/scheduling/schedules/scheduleActions";
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

/** Schedule s-1 as read: Monday to Wednesday, generated and awaiting its decision. */
const EARLY_DAYS = generatedScheduleFixture({
	status: "GENERATED",
	coveredFrom: "2026-10-12",
	coveredTo: "2026-10-14",
});

/** Schedule s-2 as read: Friday to Sunday, published. */
const WEEKEND = generatedScheduleFixture({
	scheduleId: "s-2",
	status: "PUBLISHED",
	coveredFrom: "2026-10-16",
	coveredTo: "2026-10-18",
});

/**
 * Kitchen's week of 12 October 2026: "Early days" Monday to Wednesday, to
 * review, and "Weekend" Friday to Sunday, published; Thursday has none.
 */
const twoSchedulesInOneWeek = (permissions = ["schedule:read"]): Routes => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(schedulingWorkspace(permissions)),
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
	[`GET ${SCHEDULES}/s-1`]: ok(EARLY_DAYS),
	[`GET ${SCHEDULES}/s-2`]: ok(WEEKEND),
	// No other schedule is published over the days asked about.
	[`GET ${SCHEDULES}/published-week`]: ok({
		periodStart: "2026-10-12",
		scheduleId: null,
	}),
	[`GET ${SCHEDULES}/s-1/assignments`]: assignmentsFrom(
		"2026-10-12",
		"2026-10-14"
	),
	[`GET ${SCHEDULES}/s-2/assignments`]: assignmentsFrom(
		"2026-10-16",
		"2026-10-18"
	),
});

const PUBLISHER = ["schedule:read", "schedule:publish"];

/** Opens the timeline at `search` for someone holding `permissions`, and waits for Aisha's row. */
const openTimeline = async (
	search: string,
	permissions?: Array<string>
): Promise<HTMLElement> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi(twoSchedulesInOneWeek(permissions));
	app = await openApp(`/scheduling/department?department=d-1&${search}`);
	renderAuthApp(app);
	return screen.findByRole("row", { name: /Aisha Rahman/ });
};

/** The status strip's bands, one cell per run of days in one state. */
const stripBands = async (): Promise<Array<HTMLElement>> => {
	const label = await screen.findByRole("rowheader", { name: "Status" });
	return within(label.closest("tr")!).getAllByRole("cell");
};

/** Opens the menu of the strip's piece whose days start with `days`, e.g. "Oct 12". */
const openPieceMenu = async (days: string): Promise<void> => {
	await userEvent.click(
		await screen.findByRole("button", { name: new RegExp(`^${days}`) })
	);
};

/** The cells of `row` that belong to `scheduleId`. */
const cellsOf = (row: HTMLElement, scheduleId: string): Array<Element> => [
	...row.querySelectorAll(`[data-schedule-id="${scheduleId}"]`),
];

it("shows the week as one status strip over its cells, and No roster on the day no schedule covers", async () => {
	const row = await openTimeline("from=2026-10-12");

	expect(
		screen.getByRole("heading", { level: 1, name: "Kitchen Schedule" })
	).toBeInTheDocument();
	const bands = await stripBands();
	expect(bands.map((band) => band.getAttribute("colspan"))).toEqual([
		"3",
		"1",
		"3",
	]);
	expect(bands.map((band) => band.textContent)).toEqual([
		"To review",
		"No roster",
		"Published",
	]);
	expect(
		screen.queryByRole("rowheader", { name: "Schedules" })
	).not.toBeInTheDocument();
	await vi.waitFor(() => {
		expect(cellsOf(row, "s-1")).toHaveLength(3);
		expect(cellsOf(row, "s-2")).toHaveLength(3);
	});
	expect(within(row).getByText("No roster")).toBeInTheDocument();
});

/** An old link naming one schedule still opens the roster; nothing is shown alone or dimmed any more. */
it("opens the roster unchanged from a link that names a schedule", async () => {
	const row = await openTimeline("from=2026-10-12&schedule=s-1");

	await vi.waitFor(() => {
		expect(cellsOf(row, "s-2")).toHaveLength(3);
	});
	expect(document.querySelector(".opacity-40")).toBeNull();
	expect(screen.queryByText(/^Showing only/)).not.toBeInTheDocument();
	expect(await stripBands()).toHaveLength(3);
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

it("names the days to review in the needs list, and Publish opens their publish dialog", async () => {
	await openTimeline("from=2026-10-12", PUBLISHER);

	const needs = screen.getByRole("region", { name: "Needs you" });
	expect(
		within(needs).getByText(
			/^Oct 12\s?–\s?14, 2026 are to review\. Staff can't see them yet\.$/
		)
	).toBeInTheDocument();
	await userEvent.click(within(needs).getByRole("button", { name: "Publish" }));

	expect(
		await screen.findByRole("dialog", { name: "Publish this roster?" })
	).toHaveTextContent(/for its days \(Oct 12\s?–\s?14, 2026\)/);
});

/** One piece to review goes straight to its publish dialog, with no list of days to choose from. */
it("opens the one piece to review's publish dialog from the header's Publish", async () => {
	await openTimeline("from=2026-10-12", PUBLISHER);

	const [headerPublish] = screen.getAllByRole("button", { name: "Publish" });
	await userEvent.click(headerPublish!);

	expect(
		await screen.findByRole("dialog", { name: "Publish this roster?" })
	).toHaveTextContent(/for its days \(Oct 12\s?–\s?14, 2026\)/);
});

it("offers no Publish without schedule:publish", async () => {
	await openTimeline("from=2026-10-12");

	expect(screen.getByText(/are to review/)).toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: "Publish" })
	).not.toBeInTheDocument();
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
		await screen.findByText("Generating Oct 15, 2026…")
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

/** The two-part week with its weekend part in `weekend`'s state, today being Saturday 10 October 2026, before it. */
const openBeforeTheWeek = async (
	weekend: Partial<WeekPart>,
	permissions?: Array<string>
): Promise<void> => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-10-10T09:00:00"));
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const routes = twoSchedulesInOneWeek(permissions);
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

/** Thursday lies before the published (or once published) weekend part: the API refuses it, so no Generate. */
it.each([
	["published", { state: "PUBLISHED" as const }],
	["published once", { state: "TO_REVIEW" as const, publishedOnce: true }],
])("offers no Generate for days before a %s part", async (_, weekend) => {
	await openBeforeTheWeek(weekend);

	expect(
		await screen.findByText(
			/^No schedule for Oct 15, 2026\. Days before a published schedule in the same week cannot be scheduled\.$/
		)
	).toBeInTheDocument();
	const needs = screen.getByRole("region", { name: "Needs you" });
	expect(
		within(needs).queryByRole("link", { name: "Generate" })
	).not.toBeInTheDocument();
});

/** Thursday is free while nothing after it is published: Generate, in the header and on its line, opens with it filled in. */
it("opens Generate on the first days with no roster", async () => {
	await openBeforeTheWeek({ state: "TO_REVIEW" }, [
		"schedule:read",
		"schedule:create",
	]);

	expect(
		await screen.findByText("Oct 15, 2026 has no roster.")
	).toBeInTheDocument();
	const links = screen.getAllByRole("link", { name: "Generate" });
	expect(links).toHaveLength(2);
	for (const link of links)
		expect(link).toHaveAttribute(
			"href",
			expect.stringMatching(/firstDay=2026-10-15&lastDay=2026-10-15/)
		);
});

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

/** The two-part week with its early part changed by `early`, and schedule s-1 read as `read` when given. */
const openWithEarlyPart = async (
	early: Partial<WeekPart>,
	read?: StubReply
): Promise<void> => {
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
		...(read ? { [`GET ${SCHEDULES}/s-1`]: read } : {}),
	});
	app = await openApp("/scheduling/department?department=d-1&from=2026-10-12");
	renderAuthApp(app);
	await screen.findByRole("heading", { level: 1, name: "Kitchen Schedule" });
};

/** Days that are not a roster yet say so on the strip, in the strip's own words; never generated reads as no roster. */
it.each([
	["FAILED", "Generation failed"],
	["REJECTED", "Rejected"],
	["DRAFT", "Not generated yet"],
	["NOT_GENERATED", "No roster"],
] as const)("shows %s days on the strip as %s", async (state, words) => {
	await openWithEarlyPart({ state });

	const [firstBand] = await stripBands();
	expect(firstBand).toHaveTextContent(words);
});

/** A draft's piece opens its setup, where the week card sends a draft, not the roster page. */
it("opens a draft's setup from its piece of the strip", async () => {
	await openWithEarlyPart(
		{ state: "DRAFT" },
		ok(scheduleFixture({ coveredFrom: "2026-10-12", coveredTo: "2026-10-14" }))
	);

	await openPieceMenu("Oct 12");
	await userEvent.click(
		await screen.findByRole("menuitem", {
			name: "Finish setting up these days",
		})
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

/** With no `from`, once the branch's today is known in a week other than the device's, the window moves to it. */
it("moves a window opened on the device's Monday to the branch's", async () => {
	// Sunday 11 October 2026, 12:00 UTC: already Monday 12 October at the branch (UTC+14).
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-10-11T12:00:00Z"));
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const routes = twoSchedulesInOneWeek();
	const month = (
		routes[`GET ${MONTHS}/2026-10`] as { body: { data: ScheduleMonth } }
	).body.data;
	stubApi({
		...routes,
		[`GET ${MONTHS}/2026-10`]: ok({ ...month, timeZone: "Pacific/Kiritimati" }),
	});
	app = await openApp("/scheduling/department?department=d-1");
	renderAuthApp(app);

	await vi.waitFor(() => {
		expect(app?.router.state.location.search).toMatchObject({
			from: "2026-10-12",
		});
	});
	expect(
		await screen.findByRole("row", { name: /Aisha Rahman/ })
	).toBeInTheDocument();
});

const MANAGER = ["schedule:read", "schedule:delete"];

/** Delete follows the roster page's rule: offered where the schedule is deletable and `schedule:delete` is held. */
it.each([
	["Oct 12", EARLY_DAYS],
	["Oct 16", WEEKEND],
])(
	"offers Delete on the piece from %s as the roster page's rule says",
	async (days, read) => {
		await openTimeline("from=2026-10-12", MANAGER);

		await openPieceMenu(days);

		await screen.findByRole("menuitem", {
			name: "Review and edit these days",
		});
		expect(
			screen.queryByRole("menuitem", { name: "Delete these days" }) !== null
		).toBe(mayDeleteSchedule(read, { can: () => true }));
	}
);

it("offers no Delete without schedule:delete", async () => {
	await openTimeline("from=2026-10-12");

	await openPieceMenu("Oct 12");

	await screen.findByRole("menuitem", { name: "Review and edit these days" });
	expect(
		screen.queryByRole("menuitem", { name: "Delete these days" })
	).not.toBeInTheDocument();
});

/** Deleting from the strip sends the roster page's DELETE and stays on the window, whose days then have no roster. */
it("deletes a piece through Delete these days", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const routes = twoSchedulesInOneWeek(MANAGER);
	const month = (
		routes[`GET ${MONTHS}/2026-10`] as { body: { data: ScheduleMonth } }
	).body.data;
	const [, weekend] = month.weeks[0]!.parts;
	const calls = stubApi({
		...routes,
		[`GET ${MONTHS}/2026-10`]: [
			ok(month),
			ok({ ...month, weeks: [{ ...month.weeks[0]!, parts: [weekend!] }] }),
		],
		[`DELETE ${SCHEDULES}/s-1`]: { status: 204 },
	});
	app = await openApp("/scheduling/department?department=d-1&from=2026-10-12");
	renderAuthApp(app);
	await screen.findByRole("row", { name: /Aisha Rahman/ });

	await openPieceMenu("Oct 12");
	await userEvent.click(
		await screen.findByRole("menuitem", { name: "Delete these days" })
	);
	// Its days come before the published weekend, so the dialog warns they can't be scheduled again.
	await userEvent.click(
		within(await screen.findByRole("dialog")).getByRole("button", {
			name: "Delete for good",
		})
	);

	await vi.waitFor(() => {
		expect(
			screen.queryByRole("button", { name: /^Oct 12/ })
		).not.toBeInTheDocument();
	});
	const [firstBand] = await stripBands();
	expect(firstBand).toHaveTextContent("No roster");
	expect(
		calls.filter(
			(call) => call.method === "DELETE" && call.path === `${SCHEDULES}/s-1`
		)
	).toHaveLength(1);
	expect(app.router.state.location.pathname).toBe("/scheduling/department");
	expect(app.router.state.location.search).toEqual({
		department: "d-1",
		from: "2026-10-12",
	});
});
