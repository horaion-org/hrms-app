import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { changeTimeline } from "./changeTimeline";

/** Echoes the key and its values, so entries can be read without copy. */
const t = ((key: string, values?: Record<string, unknown>) =>
	values ? `${key}(${Object.values(values).join("|")})` : key) as TFunction;

/** A fixture day changed by hand from a day off at `appliedAt`. */
const changedAt = (
	row: ScheduleAssignment,
	appliedAt: string
): ScheduleAssignment => ({
	...row,
	lastChange: {
		changeId: `rc-${row.assignmentId}`,
		appliedAt,
		appliedBy: { membershipId: "m-9", displayName: "Moses Lee" },
		remark: null,
		before: { kind: "OFF", dayType: "OFF", shift: null, jobTitle: null },
	},
});

describe("changeTimeline", () => {
	it("groups the changes by the day applied, newest day and change first", () => {
		const [first, second, third] = scheduleAssignmentsFixture();
		if (!first || !second || !third) throw new Error("fixture changed");

		const timeline = changeTimeline(
			[
				changedAt(first, "2026-10-10T09:00:00"),
				changedAt(second, "2026-10-11T08:00:00"),
				changedAt(third, "2026-10-11T10:00:00"),
				// Never changed by hand: not on the timeline.
				{ ...first, assignmentId: "unchanged", lastChange: null },
			],
			t,
			"en"
		);

		expect(timeline.map((day) => day.appliedOn)).toEqual([
			"2026-10-11",
			"2026-10-10",
		]);
		expect(timeline[0]?.entries.map((entry) => entry.key)).toEqual([
			third.assignmentId,
			second.assignmentId,
		]);
		expect(timeline[1]?.entries[0]?.byline).toMatch(
			/^scheduling\.rosterEdit\.changedBy\(.+\|Moses Lee\)$/
		);
	});
});
