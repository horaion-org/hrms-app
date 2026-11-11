import { describe, expect, it } from "vitest";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import {
	changedDays,
	daysToDecide,
	issueCount,
	leaveAndCoverDays,
	rosterSummarySegments,
	type IssueFacts,
} from "./rosterSummary";

const WEEK = { start: "2026-10-12", end: "2026-10-18" };

/** Ben's week made all days off: two of three people have a shift, and no one is on leave. */
const benOffAllWeek = scheduleAssignmentsFixture().map((row) =>
	row.member?.memberProfileId === "mp-2"
		? {
				...row,
				off: true,
				offReason: "OFF" as const,
				shift: null,
				jobTitle: null,
			}
		: row
);

describe("rosterSummarySegments", () => {
	it.each([
		[
			"a whole roster",
			scheduleAssignmentsFixture(),
			[
				{ key: "people", values: { count: 3 } },
				{ key: "shifts", values: { count: 15 } },
				{ key: "daysOff", values: { count: 4 } },
				{ key: "onLeave", values: { count: 2 } },
				{ key: "hours", values: { hours: 94 } },
			],
		],
		[
			"someone without a shift, and no leave",
			benOffAllWeek,
			[
				{ key: "peopleOf", values: { count: 2, total: 3 } },
				{ key: "shifts", values: { count: 11 } },
				{ key: "daysOff", values: { count: 10 } },
				{ key: "hours", values: { hours: 78 } },
			],
		],
	])("sums up %s", (_, assignments, segments) => {
		expect(
			rosterSummarySegments(rosterFromAssignments(assignments, WEEK))
		).toEqual(segments);
	});
});

describe("issueCount", () => {
	it.each<[string, IssueFacts, number]>([
		[
			"nothing found",
			{
				findings: null,
				membersWithChangedStart: 0,
				leaveAndCoverDays: 0,
				daysToDecide: 0,
			},
			0,
		],
		[
			"roster notes and setup issues",
			{
				findings: { roster: 11, setup: 3 },
				membersWithChangedStart: 0,
				leaveAndCoverDays: 0,
				daysToDecide: 0,
			},
			14,
		],
		[
			"and changed starting points, once however many members",
			{
				findings: { roster: 11, setup: 3 },
				membersWithChangedStart: 2,
				leaveAndCoverDays: 0,
				daysToDecide: 0,
			},
			15,
		],
		[
			"and each day marked for leave or cover",
			{
				findings: null,
				membersWithChangedStart: 0,
				leaveAndCoverDays: 2,
				daysToDecide: 0,
			},
			2,
		],
		[
			"and each day to decide",
			{
				findings: null,
				membersWithChangedStart: 0,
				leaveAndCoverDays: 0,
				daysToDecide: 3,
			},
			3,
		],
	])("counts %s", (_, facts, count) => {
		expect(issueCount(facts)).toBe(count);
	});
});

describe("leaveAndCoverDays", () => {
	it("keeps the days marked for leave or cover, by day and then by name", () => {
		const [first, second, third] = scheduleAssignmentsFixture();
		if (!first || !second || !third) throw new Error("fixture has three days");

		expect(
			leaveAndCoverDays([
				{ ...first, day: "2026-10-14", flag: "LEAVE_REQUESTED" },
				{ ...second, flag: null, uncoveredShift: null },
				{ ...third, day: "2026-10-13", flag: "UNKNOWN", uncoveredShift: null },
			]).map((row) => row.day)
		).toEqual(["2026-10-14"]);
	});
});

describe("daysToDecide", () => {
	it("keeps the days to decide, whichever way the viewer reads them, apart from leave and cover", () => {
		const [first, second, third] = scheduleAssignmentsFixture();
		if (!first || !second || !third) throw new Error("fixture has three days");
		const days = [
			{ ...first, day: "2026-10-14", flag: "NEEDS_ATTENTION" as const },
			{ ...second, day: "2026-10-13", flag: "NEEDS_DECISION" as const },
			{ ...third, flag: "LEAVE_REQUESTED" as const, uncoveredShift: null },
		];

		expect(daysToDecide(days).map((row) => row.day)).toEqual([
			"2026-10-13",
			"2026-10-14",
		]);
		expect(leaveAndCoverDays(days)).toEqual([days[2]]);
	});
});

describe("changedDays", () => {
	it("keeps the days changed by hand, by day and then by name", () => {
		const change = {
			changeId: "rc-1",
			appliedAt: "2026-10-10T09:00:00Z",
			appliedBy: null,
			remark: null,
			before: {
				kind: "OFF" as const,
				dayType: "OFF",
				shift: null,
				jobTitle: null,
			},
		};
		const rows = scheduleAssignmentsFixture().map((row) =>
			row.day === "2026-10-13" ||
			(row.day === "2026-10-12" && row.member?.displayName === "Chen Wei")
				? { ...row, lastChange: change }
				: row
		);

		expect(
			changedDays(rows).map((row) => `${row.day} ${row.member?.displayName}`)
		).toEqual([
			"2026-10-12 Chen Wei",
			"2026-10-13 Aisha Rahman",
			"2026-10-13 Ben Ong",
			"2026-10-13 Chen Wei",
		]);
	});
});
