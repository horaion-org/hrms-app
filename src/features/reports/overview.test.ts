import { describe, expect, it } from "vitest";
import {
	overtimeFixture,
	shortageFixture,
	staffingRuleFixture,
} from "@/features/dashboard/fixtures";
import { rosterChangeDepartmentFixture } from "@/features/reports/fixtures";
import type { NextRosterRow } from "@/features/dashboard/nextRoster";
import {
	figureStandings,
	overviewHeadline,
	overviewOf,
	type OverviewReads,
} from "@/features/reports/overview";

/** North Point's Control room: its Morning rule needs 3 and 2 people hold the titles. */
const controlRule = staffingRuleFixture({
	branchName: "North Point",
	departmentId: "d-control",
	departmentName: "Control room",
	ruleName: "Duty Manager Day",
	shifts: [{ shiftId: "sh-am", name: "Morning", daysAWeek: 7 }],
});

/** A short Morning shift in the Control room. */
const controlShort = (day: string): ReturnType<typeof shortageFixture> =>
	shortageFixture({
		day,
		branchId: "b-north",
		branchName: "North Point",
		departmentId: "d-control",
		departmentName: "Control room",
	});

/** A Department's coming week at a step. */
const roster = (
	branchId: string,
	departmentName: string,
	step: NextRosterRow["step"]
): NextRosterRow => ({
	branchId,
	departmentId: departmentName,
	departmentName,
	state: step === "done" ? "PUBLISHED" : "NOT_GENERATED",
	scheduleId: null,
	step,
	missing: [],
});

const BRANCH_NAMES: Record<string, string> = {
	"b-north": "North Point",
	"b-1": "Main branch",
};

const reads = (overrides: Partial<OverviewReads> = {}): OverviewReads => ({
	shortages: [],
	shortagesBefore: [],
	rules: [],
	overtime: [],
	thisMonth: "2026-11",
	nextRoster: [],
	rostersInReach: true,
	changes: [],
	changesBefore: [],
	grouping: "branch",
	branchNameOf: (branchId) => BRANCH_NAMES[branchId],
	...overrides,
});

describe("overviewOf", () => {
	it("puts the unit to act on first and names the rule behind its shortfall", () => {
		const overview = overviewOf(
			reads({
				shortages: [
					controlShort("2026-11-17"),
					controlShort("2026-11-18"),
					shortageFixture({ shiftName: "Evening", shiftId: "fs-pm" }),
				],
				shortagesBefore: [controlShort("2026-11-10")],
				rules: [controlRule],
				nextRoster: [
					roster("b-north", "Control room", "generate"),
					roster("b-1", "Sales", "done"),
				],
			})
		);

		expect(overview.units.map((unit) => [unit.name, unit.standing])).toEqual([
			["North Point", "ACT"],
			["Main branch", "WATCH"],
		]);
		expect(overview.units[0]).toMatchObject({
			peopleShort: 2,
			rulesShort: [controlRule],
			published: 0,
			rosters: 1,
		});
		expect(overview.rulesShort).toEqual([
			{ rule: controlRule, unit: "North Point", peopleShort: 2 },
		]);
		expect(overview.figures).toMatchObject({
			peopleShort: 3,
			peopleShortBefore: 1,
			published: 1,
			rosters: 2,
		});
	});

	it("counts people over and near the limit this month, each once, against last month", () => {
		const november = overtimeFixture().departments[0]!;
		const overview = overviewOf(
			reads({
				overtime: [
					november,
					{ ...november, departmentId: "d-2", departmentName: "Kitchen" },
					{ ...november, month: "2026-10" },
				],
			})
		);

		expect(overview.figures).toMatchObject({
			overLimit: 1,
			overLimitBefore: 1,
		});
		expect(overview.units[0]).toMatchObject({
			name: "Main branch",
			standing: "ACT",
			overLimit: 1,
		});
	});

	it("compares the Departments of one Branch, and changes with last month's", () => {
		const overview = overviewOf(
			reads({
				grouping: "department",
				nextRoster: [roster("b-1", "Sales", "done")],
				changes: [rosterChangeDepartmentFixture()],
				changesBefore: [rosterChangeDepartmentFixture({ totalChanges: 1 })],
			})
		);

		expect(overview.units).toEqual([
			expect.objectContaining({
				name: "Sales",
				standing: "ON_TRACK",
				changes: 4,
			}),
		]);
		expect(overview.figures).toMatchObject({ changes: 4, changesBefore: 1 });
		expect(figureStandings(overview)).toEqual({
			peopleShort: "ON_TRACK",
			overLimit: "ON_TRACK",
			published: "ON_TRACK",
			changes: "WATCH",
		});
	});
});

describe("overviewHeadline", () => {
	it("says who needs attention, the largest shortfall and its rule, and who is on track", () => {
		const overview = overviewOf(
			reads({
				shortages: [controlShort("2026-11-17"), controlShort("2026-11-18")],
				rules: [controlRule],
				nextRoster: [roster("b-1", "Sales", "done")],
			})
		);

		expect(overviewHeadline(overview)).toEqual([
			{ key: "needsAttention", values: { count: 1, units: "North Point" } },
			{
				key: "shortBecause",
				values: {
					unit: "North Point",
					short: 2,
					rule: "Duty Manager Day",
					needed: 3,
					count: 2,
				},
			},
			{ key: "restOnTrack", values: { count: 1 } },
		]);
	});

	it("says all is well in one sentence, and nothing with no unit to speak of", () => {
		const allWell = overviewOf(
			reads({ nextRoster: [roster("b-1", "Sales", "done")] })
		);

		expect(overviewHeadline(allWell)).toEqual([
			{ key: "allOnTrack", values: { count: 1 } },
		]);
		expect(overviewHeadline(overviewOf(reads()))).toEqual([]);
	});

	it("leaves next week unsaid when all is well for someone who may not read rosters", () => {
		const allWell = overviewOf(
			reads({
				rules: [
					staffingRuleFixture({ peopleWithTitles: 6, holderDaysAWeek: 30 }),
				],
				rostersInReach: false,
			})
		);

		expect(overviewHeadline(allWell)).toEqual([
			{ key: "allOnTrackWithoutRosters", values: { count: 1 } },
		]);
	});

	it("says nothing needs action when there is only something to watch", () => {
		const newCompany = overviewOf(
			reads({
				nextRoster: [
					roster("b-1", "Sales", "generate"),
					roster("b-north", "Control room", "done"),
				],
			})
		);

		expect(overviewHeadline(newCompany)).toEqual([
			{ key: "nothingToActOn", values: {} },
			{ key: "restOnTrack", values: { count: 1 } },
		]);
	});
});
