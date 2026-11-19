import { describe, expect, it } from "vitest";
import type {
	MyRosterDays,
	MyRosterDaysRoster,
} from "@/features/scheduling/myRoster/api";
import {
	myRosterDaysFrom,
	parseMyRosterDaysSearch,
	stepWindow,
	windowFrom,
} from "@/features/scheduling/myRoster/myRosterDays";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const frontOffice: MyRosterDaysRoster = {
	scheduleId: "s-1",
	name: "Front Office - Week 42",
	branchName: "North",
	departmentName: "Front Office",
	timeZone: "Asia/Singapore",
	coveredFrom: "2026-10-12",
	coveredTo: "2026-10-18",
};

/** Aisha's own week on s-1: five shifts, a day off and a rest day. */
const aishaDays = (): MyRosterDays["days"] =>
	scheduleAssignmentsFixture()
		.filter((row) => row.member?.membershipId === "m-1")
		.map((assignment) => ({ scheduleId: "s-1", assignment }));

describe("parseMyRosterDaysSearch", () => {
	it.each([
		{ search: { from: "2026-10-12" }, parsed: { from: "2026-10-12" } },
		{ search: { from: "2026-10-13" }, parsed: {} },
		{ search: { from: "not a date" }, parsed: {} },
		{ search: { from: 42 }, parsed: {} },
		{ search: {}, parsed: {} },
	])("reads $search as $parsed", ({ search, parsed }) => {
		expect(parseMyRosterDaysSearch(search)).toEqual(parsed);
	});
});

describe("windowFrom", () => {
	it.each([
		{ monday: "2026-10-12", end: "2026-10-25" },
		{ monday: "2026-12-28", end: "2027-01-10" },
	])("shows two weeks from $monday to $end", ({ monday, end }) => {
		expect(windowFrom(monday)).toEqual({ start: monday, end });
	});
});

describe("stepWindow", () => {
	it.each([
		{ monday: "2026-10-12", step: 1 as const, next: "2026-10-26" },
		{ monday: "2026-10-12", step: -1 as const, next: "2026-09-28" },
		{ monday: "2026-12-28", step: 1 as const, next: "2027-01-11" },
	])("moves $step from $monday to $next", ({ monday, step, next }) => {
		expect(stepWindow(monday, step)).toBe(next);
	});
});

describe("myRosterDaysFrom", () => {
	it("gives every day of the two weeks, each with its own tile and roster or neither", () => {
		const days = myRosterDaysFrom("2026-10-12", {
			from: "2026-10-12",
			to: "2026-10-25",
			rosters: [frontOffice],
			days: aishaDays(),
		});

		expect(days.map((day) => day.date)).toEqual([
			"2026-10-12",
			"2026-10-13",
			"2026-10-14",
			"2026-10-15",
			"2026-10-16",
			"2026-10-17",
			"2026-10-18",
			"2026-10-19",
			"2026-10-20",
			"2026-10-21",
			"2026-10-22",
			"2026-10-23",
			"2026-10-24",
			"2026-10-25",
		]);
		expect(days.slice(0, 7).map((day) => day.cell?.kind)).toEqual([
			"shift",
			"shift",
			"shift",
			"shift",
			"shift",
			"off",
			"off",
		]);
		expect(days[0]?.roster).toEqual(frontOffice);
		// The second week has no published roster for her.
		expect(days.slice(7)).toEqual(
			days.slice(7).map((day) => ({ date: day.date }))
		);
	});

	it("drops a row outside the two weeks shown", () => {
		const days = myRosterDaysFrom("2026-10-19", {
			from: "2026-10-19",
			to: "2026-11-01",
			rosters: [frontOffice],
			days: aishaDays(),
		});

		expect(days.every((day) => day.cell === undefined)).toBe(true);
	});

	it("gives fourteen days with nothing when no published roster has the caller", () => {
		const days = myRosterDaysFrom("2026-10-12", {
			from: "2026-10-12",
			to: "2026-10-25",
			rosters: [],
			days: [],
		});

		expect(days).toHaveLength(14);
		expect(days.every((day) => !day.cell && !day.roster)).toBe(true);
	});

	it("names each day's own roster when two rosters cover the two weeks", () => {
		const kitchen = {
			...frontOffice,
			scheduleId: "s-2",
			departmentName: "Kitchen",
			coveredFrom: "2026-10-19",
			coveredTo: "2026-10-25",
		};
		const days = myRosterDaysFrom("2026-10-12", {
			from: "2026-10-12",
			to: "2026-10-25",
			rosters: [frontOffice, kitchen],
			days: [
				...aishaDays(),
				// Monday of the second week, on the Kitchen roster.
				{
					scheduleId: "s-2",
					assignment: { ...aishaDays()[0]!.assignment, day: "2026-10-19" },
				},
			],
		});

		expect(days[0]?.roster?.departmentName).toBe("Front Office");
		expect(days[7]?.roster?.departmentName).toBe("Kitchen");
		expect(days[7]?.cell?.kind).toBe("shift");
		expect(days[8]?.roster).toBeUndefined();
	});
});
