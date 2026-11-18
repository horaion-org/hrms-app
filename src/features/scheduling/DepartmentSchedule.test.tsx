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
import { withDatesRun } from "@/features/scheduling/months/datesRunState";
import {
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";

let app: OpenedApp | undefined;

afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.restoreAllMocks();
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

it("dims the other schedules' cells when one is shown alone", async () => {
	const row = await openTimeline("from=2026-10-12&schedule=s-1");

	await vi.waitFor(() => {
		expect(cellsOf(row, "s-2")).toHaveLength(3);
	});
	for (const cell of cellsOf(row, "s-2"))
		expect(cell).toHaveClass("opacity-40");
	for (const cell of cellsOf(row, "s-1"))
		expect(cell).not.toHaveClass("opacity-40");
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
