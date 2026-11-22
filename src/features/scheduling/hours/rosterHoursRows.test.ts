import { describe, expect, it } from "vitest";
import {
	officerWeek,
	partTimerWeek,
	rosterHours,
} from "@/features/scheduling/hours/fixtures";
import {
	hasRosterHours,
	rosterHoursRows,
	showsCountedLeave,
	TOTAL_ROW_KEY,
} from "@/features/scheduling/hours/rosterHoursRows";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";

const NAMES = { formerMember: "Former member", total: "Total" };

describe("rosterHoursRows", () => {
	it("names each person from the roster, in the roster's order, then the total", () => {
		const rows = rosterHoursRows(
			rosterHours([partTimerWeek(), officerWeek()]),
			scheduleAssignmentsFixture(),
			NAMES
		);

		expect(rows.map((row) => row.name)).toEqual([
			"Aisha Rahman",
			"Ben Ong",
			"Total",
		]);
		expect(rows[0]).toMatchObject({
			daysWorked: 6,
			normalMinutes: 2640,
			overtimeMinutes: 1680,
			isTotal: false,
		});
		expect(rows[2]).toMatchObject({
			key: TOTAL_ROW_KEY,
			isTotal: true,
			daysWorked: 11,
			normalMinutes: 3840,
			extraMinutes: 600,
			overtimeMinutes: 1680,
		});
	});

	it("puts a person the roster no longer names last, as a former member", () => {
		const rows = rosterHoursRows(
			rosterHours([officerWeek("mp-gone"), partTimerWeek()]),
			scheduleAssignmentsFixture(),
			NAMES
		);

		expect(rows.map((row) => row.name)).toEqual([
			"Ben Ong",
			"Former member",
			"Total",
		]);
	});

	it("has no rows, not even a total, when nobody is rostered", () => {
		expect(
			rosterHoursRows(rosterHours([]), scheduleAssignmentsFixture(), NAMES)
		).toEqual([]);
	});
});

describe("showsCountedLeave", () => {
	it.each([
		["no leave counted", [officerWeek(), partTimerWeek()], false],
		[
			"one person's leave counted",
			[officerWeek("mp-1", { countedLeaveMinutes: 480 }), partTimerWeek()],
			true,
		],
	])("shows a Leave column with %s: %s", (_case, members, shows) => {
		expect(
			showsCountedLeave(
				rosterHoursRows(
					rosterHours(members),
					scheduleAssignmentsFixture(),
					NAMES
				)
			)
		).toBe(shows);
	});
});

describe("hasRosterHours", () => {
	it.each([
		["GENERATED", true],
		["PUBLISHED", true],
		["REJECTED", false],
		["GENERATION_FAILED", false],
	] as const)("a %s roster has hours: %s", (status, expected) => {
		expect(hasRosterHours(generatedScheduleFixture({ status }))).toBe(expected);
	});
});
