import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { changedDayItems, startingPointItems } from "./rosterPanels";

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
