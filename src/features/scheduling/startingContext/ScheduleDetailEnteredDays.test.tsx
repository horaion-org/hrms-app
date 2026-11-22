import dayjs from "dayjs";
import { screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
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
	scheduleAssignmentsFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import {
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";
import type { StartingDays } from "@/features/scheduling/startingContext/api";
import type { Workspace } from "@/features/workspace/api";
import {
	carriedWeek,
	enteredNightCell,
	firstWeek,
	unknownCell,
} from "@/features/scheduling/startingContext/fixtures";

/*
 * A schedule's own page when days were entered by hand before its run: one
 * line above the grid saying so, with the link to the set-up where they show.
 */

beforeAll(async () => {
	await import("@/pages/ScheduleDetail");
});
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

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const STARTING_DAYS = `${SCHEDULE}/starting-days`;
const NOTE = /shifts entered for the days before these days/;
const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

const OCTOBER_MONTH = "/api/v1/companies/c-1/schedule-months/2026-10";

/** The 14 days before s-1's run (12–18 October 2026): 28 September to 11 October. */
const BEFORE_OCTOBER_RUN = Array.from({ length: 14 }, (_, offset) =>
	dayjs("2026-09-28").add(offset, "day").format(ISO_DATE_FORMAT)
);

/** Aisha (mp-1) entered for a night on Wednesday 7 October; nothing else known. */
const aishaEnteredWeek = (): StartingDays => ({
	...firstWeek(),
	days: BEFORE_OCTOBER_RUN,
	members: [
		{
			memberProfileId: "mp-1",
			displayName: "Aisha Rahman",
			jobTitleName: "Front Desk Lead",
			cells: BEFORE_OCTOBER_RUN.map((date) =>
				date === "2026-10-07" ? enteredNightCell(date) : unknownCell(date)
			),
		},
	],
});

/** October: the week of 5 October has no schedule, the week of 12 October is s-1's. */
const october = (): StubReply =>
	ok(
		scheduleMonthFixture({
			month: "2026-10",
			departmentName: "Front Office",
			weeks: [
				monthWeekFixture({
					periodStart: "2026-10-05",
					periodEnd: "2026-10-11",
					state: "NOT_GENERATED",
					scheduleId: null,
					days: [],
					handChangedDays: null,
				}),
				monthWeekFixture({
					periodStart: "2026-10-12",
					periodEnd: "2026-10-18",
					state: "PUBLISHED",
					scheduleId: "s-1",
				}),
			],
		})
	);

/** Company c-1 for someone who reads schedules at Kitchen (d-2) only, not at Front Office (d-1), schedule s-1's own. */
const kitchenReaderWorkspace = (): Workspace => {
	const workspace = structuredClone(schedulingWorkspace([]));
	const kitchen = workspace.companies[0]!.branches[0]!.departments[1]!;
	kitchen.permissions = ["schedule:read"];
	return workspace;
};

/** Opens published schedule s-1 in `workspace` (a reader company-wide unless given), its starting days answering `startingDays`. */
const openSchedule = async (
	startingDays: StartingDays,
	workspace = schedulingWorkspace(["schedule:read"]),
	entry = "/scheduling/s-1"
): Promise<ReturnType<typeof stubApi>> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(workspace),
		},
		"GET /api/v1/companies/c-1/schedules/s-1": ok(
			generatedScheduleFixture({ status: "PUBLISHED" })
		),
		[`GET ${SCHEDULE}/assignments`]: ok(scheduleAssignmentsFixture()),
		[`GET ${STARTING_DAYS}`]: ok(startingDays),
		[`GET ${OCTOBER_MONTH}`]: october(),
	});
	app = await openApp(entry);
	renderAuthApp(app);
	await screen.findByRole("heading", {
		level: 1,
		name: "Front Office Schedule",
	});
	return calls;
};

describe("a schedule's page, of the days entered by hand before its run", () => {
	/** Tan's Sunday night was entered before the run: the note counts him and links to the set-up. */
	it("says how many people have them, with the link to the set-up", async () => {
		await openSchedule(firstWeek());

		expect(
			await screen.findByText(
				"1 person has shifts entered for the days before these days. View them in the setup."
			)
		).toBeVisible();
		const link = screen.getByRole("link", { name: "View setup" });
		expect(link).toHaveAttribute(
			"href",
			"/scheduling/new?step=setup&scheduleId=s-1&departmentId=d-1"
		);
	});

	it("says nothing when rosters cover the days before and nobody was entered", async () => {
		const calls = await openSchedule(carriedWeek());

		await vi.waitFor(() => {
			expect(calls.some((call) => call.path === STARTING_DAYS)).toBe(true);
		});
		expect(screen.queryByText(NOTE)).toBeNull();
	});

	/** Without `schedule:read` at the schedule's Department, the entered days are never asked for or shown. */
	it("never asks for them for someone who may not read the Department's schedules", async () => {
		const calls = await openSchedule(firstWeek(), kitchenReaderWorkspace());

		// The page is up with its schedule read, so the note is mounted and had its chance to ask.
		expect(calls.some((call) => call.path === STARTING_DAYS)).toBe(false);
		expect(screen.queryByText(NOTE)).toBeNull();
	});

	it("reads the days before once and shows a week without its own schedule on the page", async () => {
		const calls = await openSchedule(
			aishaEnteredWeek(),
			undefined,
			"/scheduling/s-1?week=2026-10-05"
		);

		const aisha = await screen.findByRole("row", { name: /Aisha Rahman/ });
		expect(
			await within(aisha).findByText(
				/Night 22:00 – 06:00 – entered by hand, not rostered/
			)
		).toBeInTheDocument();
		expect(within(aisha).getByText("Entered")).toBeVisible();
		expect(screen.getByRole("button", { name: "Week" })).toHaveTextContent(
			"Before these days"
		);
		expect(calls.filter((call) => call.path === STARTING_DAYS)).toHaveLength(1);
	});
});
