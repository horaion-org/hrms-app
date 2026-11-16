import { describe, expect, it } from "vitest";
import {
	overtimeFixture,
	shortageFixture,
	staffingRuleFixture,
} from "@/features/dashboard/fixtures";
import {
	changeSegments,
	overtimeByMonthGroups,
	shortByWeekGroups,
	spansSeveralMonths,
} from "@/features/reports/reportCharts";

/** Sales' Morning rule in Main branch: 3 needed, 2 hold the titles. */
const unstaffable = staffingRuleFixture({
	departmentName: "Sales",
	shifts: [{ shiftId: "sh-am", name: "Morning", daysAWeek: 7 }],
});

const NOVEMBER = { from: "2026-11-02", to: "2026-11-15" };

describe("shortByWeekGroups", () => {
	it("splits each week's people short by cause, a chart per unit, the shortest-staffed first", () => {
		const groups = shortByWeekGroups(
			[
				shortageFixture({ day: "2026-11-03", shortBy: 2 }),
				shortageFixture({ day: "2026-11-04", shortBy: 1 }),
				shortageFixture({
					day: "2026-11-10",
					shiftId: "fs-pm",
					shiftName: "Evening",
					shortBy: 1,
				}),
				shortageFixture({
					day: "2026-11-11",
					branchName: "Second branch",
					departmentId: "d-9",
					departmentName: "Kitchen",
				}),
			],
			[unstaffable],
			NOVEMBER,
			"branch",
			(monday) => `w/${monday}`
		);

		expect(groups).toEqual([
			{
				id: "Main branch",
				title: "Main branch",
				columns: [
					{
						id: "2026-11-02",
						label: "w/2026-11-02",
						values: { tooFew: 3, oneOff: 0 },
					},
					{
						id: "2026-11-09",
						label: "w/2026-11-09",
						values: { tooFew: 0, oneOff: 1 },
					},
				],
			},
			{
				id: "Second branch",
				title: "Second branch",
				columns: [
					{
						id: "2026-11-02",
						label: "w/2026-11-02",
						values: { tooFew: 0, oneOff: 0 },
					},
					{
						id: "2026-11-09",
						label: "w/2026-11-09",
						values: { tooFew: 0, oneOff: 1 },
					},
				],
			},
		]);
	});

	it("compares the Departments of one Branch, a unit with rules and nothing short included", () => {
		const groups = shortByWeekGroups(
			[],
			[unstaffable],
			NOVEMBER,
			"department",
			(monday) => monday
		);

		expect(groups.map((group) => group.title)).toEqual(["Sales"]);
		expect(groups[0]?.columns.map((column) => column.values)).toEqual([
			{ tooFew: 0, oneOff: 0 },
			{ tooFew: 0, oneOff: 0 },
		]);
	});
});

describe("overtimeByMonthGroups", () => {
	const november = overtimeFixture().departments[0]!;
	const october = { ...november, month: "2026-10", overtimeMinutes: 40 * 60 };

	it("draws each month's whole hours, the last month in its own series", () => {
		expect(
			overtimeByMonthGroups([november, october], "branch", (month) => month)
		).toEqual([
			{
				id: "Main branch",
				title: "Main branch",
				columns: [
					{ id: "2026-10", label: "2026-10", values: { earlier: 40 } },
					{ id: "2026-11", label: "2026-11", values: { latest: 80 } },
				],
			},
		]);
	});

	it("knows whether there are earlier months to show", () => {
		expect(spansSeveralMonths([november, october])).toBe(true);
		expect(spansSeveralMonths([november])).toBe(false);
	});
});

describe("changeSegments", () => {
	it("gives every known reason its place and colour, 0 included, and adds up repeats", () => {
		const segments = changeSegments(
			[
				{ reason: "LEAVE_APPROVED", changes: 2, days: 3 },
				{ reason: "MANUAL", changes: 3, days: 5 },
				{ reason: "MANUAL", changes: 1, days: 1 },
			],
			(reason) => reason.toLowerCase()
		);

		expect(segments.map((segment) => [segment.id, segment.value])).toEqual([
			["MANUAL", 4],
			["LEAVE_APPROVED", 2],
			["LEAVE_RECORDED", 0],
			["LEAVE_MOVE", 0],
			["COVER_OPTION", 0],
		]);
		expect(segments[0]).toMatchObject({
			label: "manual",
			colour: "inkBlue900",
		});
	});

	it("gathers reasons the app does not know as other, only when there are some", () => {
		const segments = changeSegments(
			[{ reason: "SOMETHING_NEW", changes: 2, days: 2 }],
			(reason) => reason
		);

		expect(segments[segments.length - 1]).toEqual({
			id: "OTHER",
			label: "OTHER",
			colour: "neutral400",
			value: 2,
		});
	});
});
