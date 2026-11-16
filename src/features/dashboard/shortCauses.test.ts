import { describe, expect, it } from "vitest";
import {
	shortageFixture,
	staffingRuleFixture,
} from "@/features/dashboard/fixtures";
import { shortShiftsByCause } from "@/features/dashboard/shortCauses";

/** A rule on Sales' Morning shift: 3 needed, 2 hold the titles. */
const unstaffable = staffingRuleFixture({
	departmentId: "d-1",
	shifts: [{ shiftId: "another-weeks-copy", name: "Morning", daysAWeek: 7 }],
});

describe("shortShiftsByCause", () => {
	it("names a rule nobody can staff once, however many of its shifts are short", () => {
		const shortages = [
			shortageFixture({ day: "2026-11-18" }),
			shortageFixture({ day: "2026-11-19" }),
			shortageFixture({ day: "2026-11-20" }),
		];

		expect(shortShiftsByCause(shortages, [unstaffable])).toEqual({
			unstaffable: [{ rule: unstaffable, shortShifts: 3 }],
			gaps: [],
		});
	});

	it("keeps a short shift of another shift or department as a gap to cover", () => {
		const evening = shortageFixture({ shiftId: "fs-pm", shiftName: "Evening" });
		const elsewhere = shortageFixture({ departmentId: "d-2" });

		expect(shortShiftsByCause([evening, elsewhere], [unstaffable])).toEqual({
			unstaffable: [],
			gaps: [evening, elsewhere],
		});
	});

	it("treats every short shift as a gap when the rule can be staffed", () => {
		const staffable = staffingRuleFixture({
			...unstaffable,
			peopleWithTitles: 5,
			holderDaysAWeek: 25,
		});
		const shortage = shortageFixture();

		expect(shortShiftsByCause([shortage], [staffable])).toEqual({
			unstaffable: [],
			gaps: [shortage],
		});
	});
});
