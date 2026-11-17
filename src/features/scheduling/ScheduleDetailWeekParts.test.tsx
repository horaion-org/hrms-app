import { screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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
import type { WeekPart } from "@/features/scheduling/months/api";
import {
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";
import {
	generatedScheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";

/*
 * The roster page of a schedule covering part of its week (API ADR-0113):
 * what it says of the week's other days.
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
	vi.useRealTimers();
	vi.restoreAllMocks();
	localStorage.clear();
});

const SCHEDULE_READ = "/api/v1/companies/c-1/schedules/s-1";
const ASSIGNMENTS =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/assignments";

type Routes = Parameters<typeof stubApi>[0];

const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

/** Signed in to company c-1 holding `permissions` company-wide. */
const signedIn = (permissions: Array<string>): Routes => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(schedulingWorkspace(permissions)),
	},
});

/** One part of a week, to review unless `overrides` say. */
const part = (overrides: Partial<WeekPart>): WeekPart => ({
	scheduleId: "s-1",
	name: "Week of 2026-10-12",
	named: false,
	coveredFrom: "2026-10-12",
	coveredTo: "2026-10-18",
	state: "TO_REVIEW",
	redoing: false,
	...overrides,
});

/** Opens schedule s-1, covering `shown`'s days of the week of `monday`, whose parts are `parts`. */
const openPart = async ({
	monday,
	sunday,
	shown,
	parts,
	permissions = ["schedule:read"],
}: {
	monday: string;
	sunday: string;
	shown: Pick<WeekPart, "coveredFrom" | "coveredTo">;
	parts: Array<WeekPart>;
	permissions?: Array<string>;
}): Promise<void> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const month = monday.slice(0, 7);
	stubApi({
		...signedIn(permissions),
		[`GET ${SCHEDULE_READ}`]: ok(
			generatedScheduleFixture({
				status: "GENERATED",
				periodStart: monday,
				periodEnd: sunday,
				...shown,
			})
		),
		[`GET ${ASSIGNMENTS}`]: ok([]),
		[`GET /api/v1/companies/c-1/schedule-months/${month}`]: ok(
			scheduleMonthFixture({
				month,
				departmentName: "Front Office",
				weeks: [
					monthWeekFixture({
						periodStart: monday,
						periodEnd: sunday,
						state: "TO_REVIEW",
						scheduleId: "s-1",
						parts,
					}),
				],
			})
		),
	});
	app = await openApp("/scheduling/s-1");
	renderAuthApp(app);
};

describe("the owner's week of 15 February 2027: Wed–Fri, then Sat–Sun", () => {
	const WEEK = { monday: "2027-02-15", sunday: "2027-02-21" };
	const wednesdayToFriday = {
		coveredFrom: "2027-02-17",
		coveredTo: "2027-02-19",
	};
	const saturdayToSunday = {
		coveredFrom: "2027-02-20",
		coveredTo: "2027-02-21",
	};

	it("given_theWednesdayToFridayPart_when_shown_then_mondayTuesdayHaveNoScheduleAndTheWeekendLinksItsSchedule", async () => {
		vi.useFakeTimers({
			toFake: ["Date"],
			now: new Date("2027-02-10T09:00:00+08:00"),
		});
		await openPart({
			...WEEK,
			shown: wednesdayToFriday,
			parts: [
				part({ ...wednesdayToFriday }),
				part({ scheduleId: "s-2", ...saturdayToSunday }),
			],
		});

		expect(
			await screen.findByText(
				/^Feb 20\s?–\s?21, 2027 are in another schedule\.$/
			)
		).toBeInTheDocument();
		expect(
			screen.getByText(/^Feb 15\s?–\s?16, 2027 have no schedule\.$/)
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /^Open Feb 20\s?–\s?21, 2027$/ })
		).toHaveAttribute("href", "/scheduling/s-2");
	});

	it("given_theWeekendPart_when_shown_then_mondayTuesdayHavePassedAndWednesdayToFridayLinksItsSchedule", async () => {
		vi.useFakeTimers({
			toFake: ["Date"],
			now: new Date("2027-02-18T09:00:00+08:00"),
		});
		await openPart({
			...WEEK,
			shown: saturdayToSunday,
			parts: [
				part({ scheduleId: "s-2", ...wednesdayToFriday }),
				part({ ...saturdayToSunday }),
			],
		});

		expect(
			await screen.findByText(
				/^Feb 17\s?–\s?19, 2027 are in another schedule\.$/
			)
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/^Feb 15\s?–\s?16, 2027 have passed and have no schedule\.$/
			)
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /^Open Feb 17\s?–\s?19, 2027$/ })
		).toHaveAttribute("href", "/scheduling/s-2");
	});
});

describe("a schedule covering part of its week of 12 October 2026", () => {
	const WEEK = { monday: "2026-10-12", sunday: "2026-10-18" };
	const mondayToSaturday = {
		coveredFrom: "2026-10-12",
		coveredTo: "2026-10-17",
	};

	it("given_aPartEndingSaturday_when_shown_then_offersScheduleSunday", async () => {
		vi.useFakeTimers({
			toFake: ["Date"],
			now: new Date("2026-10-14T09:00:00+08:00"),
		});
		await openPart({
			...WEEK,
			shown: mondayToSaturday,
			parts: [part({ ...mondayToSaturday })],
			permissions: ["schedule:read", "schedule:create"],
		});

		const button = await screen.findByRole("link", {
			name: /^Schedule Oct 18, 2026/,
		});
		expect(button).toHaveAttribute(
			"href",
			"/scheduling/new?department=d-1&for=dates&firstDay=2026-10-18&lastDay=2026-10-18"
		);
		expect(
			screen.getByText(
				/^This schedule covers Oct 12\s?–\s?17, 2026\. Oct 18, 2026 can be scheduled later\.$/
			)
		).toBeInTheDocument();
	});

	it("given_aLaterPartExists_when_shown_then_saysItsDayIsInIt_andNoButton", async () => {
		vi.useFakeTimers({
			toFake: ["Date"],
			now: new Date("2026-10-14T09:00:00+08:00"),
		});
		await openPart({
			...WEEK,
			shown: mondayToSaturday,
			parts: [
				part({ ...mondayToSaturday }),
				part({ scheduleId: "s-2", coveredFrom: "2026-10-18" }),
			],
			permissions: ["schedule:read", "schedule:create"],
		});

		expect(
			await screen.findByText("Oct 18, 2026 is in another schedule.")
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /^Schedule Oct/ })).toBeNull();
	});

	it("given_aRedoPartOverThisWeek_when_shown_then_saysTheseDaysAreBeingScheduledAgain", async () => {
		vi.useFakeTimers({
			toFake: ["Date"],
			now: new Date("2026-10-14T09:00:00+08:00"),
		});
		await openPart({
			...WEEK,
			shown: mondayToSaturday,
			parts: [
				part({ ...mondayToSaturday }),
				part({
					scheduleId: "s-2",
					coveredFrom: "2026-10-14",
					coveredTo: "2026-10-15",
					state: "GENERATING",
					redoing: true,
				}),
			],
		});

		expect(
			await screen.findByText(
				/^Oct 14\s?–\s?15, 2026 are being scheduled again\. This roster keeps them until the new one is ready\.$/
			)
		).toBeInTheDocument();
	});
});
