import { describe, expect, it } from "vitest";
import type {
	MyRoster,
	MyRosterDays,
	MyRosterDaysRoster,
} from "@/features/scheduling/myRoster/api";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import {
	memberTimelineGroupsOf,
	memberTimelineScheduleOf,
} from "@/features/scheduling/timeline/memberTimeline";

const TWO_WEEKS = { start: "2026-10-12", end: "2026-10-25" };

/** A published roster of Front Office at North, covering `coveredFrom` to `coveredTo`. */
const rosterOf = (
	scheduleId: string,
	coveredFrom: string,
	coveredTo: string,
	departmentName = "Front Office"
): MyRosterDaysRoster => ({
	scheduleId,
	name: `${departmentName} - ${coveredFrom}`,
	branchName: "North",
	departmentName,
	timeZone: "Asia/Singapore",
	coveredFrom,
	coveredTo,
});

/** A roster's whole read: its rows on its covered days only. */
const wholeOf = (
	roster: MyRosterDaysRoster,
	assignments: ReadonlyArray<ScheduleAssignment>
): MyRoster => ({
	...roster,
	periodStart: "2026-10-12",
	periodEnd: "2026-10-18",
	assignments: assignments.filter(
		(row) => row.day >= roster.coveredFrom && row.day <= roster.coveredTo
	),
});

/** Ben's own rows in the roster-days answer, so his row is the member's own. */
const bensDays = (scheduleId: string): MyRosterDays["days"] =>
	scheduleAssignmentsFixture()
		.filter((row) => row.member?.membershipId === "m-2")
		.map((assignment) => ({ scheduleId, assignment }));

describe("memberTimelineScheduleOf", () => {
	it("places a published roster by the days it covers", () => {
		expect(
			memberTimelineScheduleOf(rosterOf("s-1", "2026-10-12", "2026-10-18"))
		).toEqual({
			id: "s-1",
			name: "Front Office - 2026-10-12",
			firstDay: "2026-10-12",
			lastDay: "2026-10-18",
			status: "PUBLISHED",
			publishedOnce: true,
		});
	});
});

describe("memberTimelineGroupsOf", () => {
	it("merges two parts of one week into one row per person, the member's own first", () => {
		const firstPart = rosterOf("s-1", "2026-10-12", "2026-10-14");
		const secondPart = rosterOf("s-2", "2026-10-15", "2026-10-18");
		const assignments = scheduleAssignmentsFixture();

		const [group, ...others] = memberTimelineGroupsOf(
			{
				from: TWO_WEEKS.start,
				to: TWO_WEEKS.end,
				rosters: [firstPart, secondPart],
				days: bensDays("s-1"),
			},
			[wholeOf(firstPart, assignments), wholeOf(secondPart, assignments)],
			TWO_WEEKS
		);

		expect(others).toEqual([]);
		expect(group?.departmentName).toBe("Front Office");
		expect(group?.schedules.map((schedule) => schedule.id)).toEqual([
			"s-1",
			"s-2",
		]);
		expect(group?.rows.map((row) => row.name)).toEqual([
			"Ben Ong",
			"Aisha Rahman",
			"Chen Wei",
		]);
		const aisha = group?.rows[1];
		expect(aisha?.days["2026-10-14"]?.scheduleId).toBe("s-1");
		expect(aisha?.days["2026-10-15"]?.scheduleId).toBe("s-2");
		expect(Object.keys(aisha?.days ?? {})).toHaveLength(7);
	});

	it.each([
		{ case: "with no day of their own", days: [] },
		{ case: "with days of their own", days: bensDays("s-1") },
	])("gives two groups for rosters of two departments, $case", ({ days }) => {
		const frontOffice = rosterOf("s-1", "2026-10-12", "2026-10-18");
		const kitchen = rosterOf("s-2", "2026-10-19", "2026-10-25", "Kitchen");

		const groups = memberTimelineGroupsOf(
			{ from: TWO_WEEKS.start, to: TWO_WEEKS.end, rosters: [frontOffice, kitchen], days },
			[wholeOf(frontOffice, scheduleAssignmentsFixture())],
			TWO_WEEKS
		);

		expect(groups.map((group) => group.departmentName)).toEqual([
			"Front Office",
			"Kitchen",
		]);
		// Kitchen's whole roster is not read yet: its band, no rows.
		expect(groups[1]?.schedules).toHaveLength(1);
		expect(groups[1]?.rows).toEqual([]);
	});

	it("keeps the answer's order when the member has no day in the window", () => {
		const roster = rosterOf("s-1", "2026-10-12", "2026-10-18");

		const [group] = memberTimelineGroupsOf(
			{ from: TWO_WEEKS.start, to: TWO_WEEKS.end, rosters: [roster], days: [] },
			[wholeOf(roster, scheduleAssignmentsFixture())],
			TWO_WEEKS
		);

		expect(group?.rows.map((row) => row.name)).toEqual([
			"Aisha Rahman",
			"Ben Ong",
			"Chen Wei",
		]);
	});

	it("gives no group when no published roster has the member", () => {
		expect(
			memberTimelineGroupsOf(
				{ from: TWO_WEEKS.start, to: TWO_WEEKS.end, rosters: [], days: [] },
				[],
				TWO_WEEKS
			)
		).toEqual([]);
	});
});
