import { describe, expect, it } from "vitest";
import {
	monthWeekFixture,
	scheduleMonthFixture,
	twoPartWeekFixture,
} from "@/features/scheduling/months/fixtures";
import type { ScheduleMonth } from "@/features/scheduling/months/api";
import type { RosterRow } from "@/features/scheduling/roster/roster";
import { timelineRowFixture } from "@/features/scheduling/timeline/fixtures";
import {
	hoursOfRow,
	monthsOfWindow,
	rostersReadOf,
	timelineRowsOf,
	timelineSchedulesOf,
} from "@/features/scheduling/timeline/timelineRows";

/** A row of one person with a day off on each of the given days. */
const rowWithDaysOff = (key: string, days: Array<string>): RosterRow => ({
	key,
	membershipId: key,
	name: `Person ${key}`,
	jobTitle: "Cook",
	employeeCode: null,
	days: Object.fromEntries(
		days.map((day) => [day, { kind: "absent" as const }])
	),
});

describe("monthsOfWindow", () => {
	it.each([
		["2027-02-08", "2027-02-14", ["2027-02"]],
		["2027-02-22", "2027-03-07", ["2027-02", "2027-03"]],
		["2026-12-28", "2027-01-24", ["2026-12", "2027-01"]],
	])("%s to %s reads %j", (firstDay, lastDay, expected) => {
		expect(monthsOfWindow(firstDay, lastDay)).toEqual(expected);
	});
});

describe("timelineSchedulesOf", () => {
	it("gives each part once, with its days and state", () => {
		const month = scheduleMonthFixture({
			weeks: [monthWeekFixture({ parts: twoPartWeekFixture() })],
		});
		expect(timelineSchedulesOf([month])).toEqual([
			{
				id: "s-1",
				name: "Week of 2027-02-15",
				status: "TO_REVIEW",
				publishedOnce: false,
				firstDay: "2027-02-17",
				lastDay: "2027-02-19",
			},
			{
				id: "s-2",
				name: "Week of 2027-02-15",
				status: "TO_REVIEW",
				publishedOnce: false,
				firstDay: "2027-02-20",
				lastDay: "2027-02-21",
			},
		]);
	});

	it("spans a schedule seen in two months from its first day to its last", () => {
		const [part] = twoPartWeekFixture();
		const monthWith = (coveredFrom: string, coveredTo: string): ScheduleMonth =>
			scheduleMonthFixture({
				weeks: [
					monthWeekFixture({ parts: [{ ...part!, coveredFrom, coveredTo }] }),
				],
			});
		const [schedule] = timelineSchedulesOf([
			monthWith("2027-02-25", "2027-02-28"),
			monthWith("2027-03-01", "2027-03-03"),
		]);
		expect(schedule).toMatchObject({
			firstDay: "2027-02-25",
			lastDay: "2027-03-03",
		});
	});
});

describe("timelineRowsOf", () => {
	it("merges a person's days from two schedules into one row, each day naming its schedule", () => {
		const rows = timelineRowsOf([
			{ scheduleId: "s-1", rows: [rowWithDaysOff("m-1", ["2027-02-08"])] },
			{
				scheduleId: "s-2",
				rows: [
					rowWithDaysOff("m-1", ["2027-02-12"]),
					rowWithDaysOff("m-2", ["2027-02-12"]),
				],
			},
		]);
		expect(rows.map((row) => row.key)).toEqual(["m-1", "m-2"]);
		expect(rows[0]!.days["2027-02-08"]?.scheduleId).toBe("s-1");
		expect(rows[0]!.days["2027-02-12"]?.scheduleId).toBe("s-2");
		expect(Object.keys(rows[1]!.days)).toEqual(["2027-02-12"]);
	});

	it("gives no rows without rosters", () => {
		expect(timelineRowsOf([])).toEqual([]);
	});
});

describe("hoursOfRow", () => {
	it.each([
		["the whole week, two eight-hour shifts", ["2027-02-08", "2027-02-12"], 16],
		["one day of the two", ["2027-02-08"], 8],
		["days without a shift", ["2027-02-09"], 0],
	])("%s", (_, days, expected) => {
		expect(hoursOfRow(timelineRowFixture(), days)).toBe(expected);
	});
});

describe("rostersReadOf", () => {
	it.each([
		[["done", "done"], "loaded"],
		[["done", "pending"], "loading"],
		[["pending", "failed"], "failed"],
		[[], "loaded"],
	] as const)("%j reads as %s", (steps, expected) => {
		expect(rostersReadOf(steps)).toBe(expected);
	});
});
