import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import {
	changedDayItems,
	daysToDecideItems,
	leaveAndCoverItems,
	startingPointItems,
} from "./rosterPanels";

/** Echoes the key and its values, so items can be read without copy. */
const t = ((key: string, values?: Record<string, unknown>) =>
	values ? `${key}(${Object.values(values).join("|")})` : key) as TFunction;

describe("startingPointItems", () => {
	it("names each member who brought a run in, with the day Monday is for them", () => {
		const rows = rosterFromAssignments(scheduleAssignmentsFixture(), {
			start: "2026-10-12",
			end: "2026-10-18",
		});

		expect(
			startingPointItems(rows, new Map([["mp-1", 3]]), t).map(
				(item) => item.lines
			)
		).toEqual([["Aisha Rahman: scheduling.startingContext.runBadge(4)"]]);
	});
});

describe("leaveAndCoverItems", () => {
	it("says whose day, then the leave marker with its type and any shift left short", () => {
		const [first] = scheduleAssignmentsFixture();
		if (!first) throw new Error("fixture has a day");

		const [item] = leaveAndCoverItems(
			[
				{
					...first,
					flag: "ON_LEAVE_WHILE_ROSTERED",
					leaveTypeName: "Annual leave",
					uncoveredShift: first.shift,
				},
			],
			t,
			"en"
		);

		expect(item?.lines).toEqual([
			"scheduling.rosterMarkers.onLeave: Annual leave",
			`scheduling.rosterMarkers.needsCover(${first.shift?.name ?? ""})`,
		]);
	});
});

describe("daysToDecideItems", () => {
	it("says only that a day needs attention to someone who can't see why", () => {
		const [first] = scheduleAssignmentsFixture();
		if (!first) throw new Error("fixture has a day");

		expect(
			daysToDecideItems(
				[
					{ ...first, flag: "NEEDS_ATTENTION" },
					{ ...first, assignmentId: "a-2", flag: "NEEDS_DECISION" },
				],
				t,
				"en"
			).map((item) => item.lines)
		).toEqual([
			["scheduling.rosterMarkers.needsAttention"],
			["scheduling.rosterMarkers.needsDecision"],
		]);
	});
});

describe("changedDayItems", () => {
	it("says whose day, what it was and is, and who changed it", () => {
		const [first] = scheduleAssignmentsFixture();
		const [item] = changedDayItems(
			[
				{
					...first!,
					lastChange: {
						changeId: "rc-1",
						appliedAt: "2026-10-10T09:00:00Z",
						appliedBy: { membershipId: "m-9", displayName: "Moses Lee" },
						remark: null,
						before: { kind: "OFF", shift: null, jobTitle: null },
					},
				},
			],
			t,
			"en"
		);

		expect(item?.title).toBe("Aisha Rahman · Mon, Oct 12");
		expect(item?.lines[1]).toBe(
			"scheduling.rosterEdit.changedBy(Sat, Oct 10|Moses Lee)"
		);
	});
});
