import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	callInMove,
	feasibleRepair,
	reassignMove,
} from "@/features/scheduling/cover/engineRepairFixtures";
import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
import { extraHoursLine } from "@/features/scheduling/cover/engineRepairHours";
import type { RepairNames } from "@/features/scheduling/cover/engineRepairWords";

const t = authTestI18n.t;
const numbers = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const names: RepairNames = {
	member: (membershipId) => `Member ${membershipId}`,
	day: () => "Sat, Oct 17",
	hours: (minutes) => numbers.format(minutes / 60),
};
const NONE = { overtime: 0, restDayWork: 0, timeOffEarned: 0 };

/** A call-in for Aisha costing the given minutes. */
const costing = (extraMinutes: typeof NONE | null | undefined): RepairOption =>
	feasibleRepair([callInMove()], { kind: "call_in", extraMinutes });

describe("extraHoursLine", () => {
	it("says no extra hours when every kind is 0", () => {
		expect(extraHoursLine(costing(NONE), names, t)).toBe("No extra hours.");
	});

	it.each([
		[
			"overtime",
			{ ...NONE, overtime: 480 },
			"Adds 8 h of overtime for Aisha Rahman that week.",
		],
		[
			"rest-day work",
			{ ...NONE, restDayWork: 480 },
			"Adds 8 h of rest-day work for Aisha Rahman.",
		],
		[
			"time off earned",
			{ ...NONE, timeOffEarned: 480 },
			"Adds 8 h of time off earned for Aisha Rahman.",
		],
	])("names one kind in its own sentence: %s", (_kind, minutes, line) => {
		expect(extraHoursLine(costing(minutes), names, t)).toBe(line);
	});

	it("lists several kinds in one line", () => {
		expect(
			extraHoursLine(
				costing({ overtime: 480, restDayWork: 480, timeOffEarned: 240 }),
				names,
				t
			)
		).toBe(
			"Adds 8 h of overtime, 8 h of rest-day work and 4 h of time off earned for Aisha Rahman that week."
		);
		expect(
			extraHoursLine(
				costing({ ...NONE, overtime: 60, restDayWork: 120 }),
				names,
				t
			)
		).toBe(
			"Adds 1 h of overtime and 2 h of rest-day work for Aisha Rahman that week."
		);
	});

	it("writes minutes that are not whole hours as the page does", () => {
		expect(extraHoursLine(costing({ ...NONE, overtime: 90 }), names, t)).toBe(
			"Adds 1.5 h of overtime for Aisha Rahman that week."
		);
		expect(extraHoursLine(costing({ ...NONE, overtime: 20 }), names, t)).toBe(
			"Adds 0.3 h of overtime for Aisha Rahman that week."
		);
	});

	it("counts only hours added: a kind that falls is not extra", () => {
		expect(extraHoursLine(costing({ ...NONE, overtime: -240 }), names, t)).toBe(
			"No extra hours."
		);
		expect(
			extraHoursLine(
				costing({ ...NONE, overtime: -240, restDayWork: 480 }),
				names,
				t
			)
		).toBe("Adds 8 h of rest-day work for Aisha Rahman.");
	});

	it("says nothing for an option from the older repair, with no minutes", () => {
		expect(extraHoursLine(costing(undefined), names, t)).toBeUndefined();
		expect(extraHoursLine(costing(null), names, t)).toBeUndefined();
	});

	it("names the one person the option moves, even over two of their moves, or someone the roster no longer names", () => {
		const twoMovesOfOne = feasibleRepair(
			[reassignMove(), reassignMove({ date: "2026-10-18" })],
			{ extraMinutes: { ...NONE, overtime: 60 } }
		);
		expect(extraHoursLine(twoMovesOfOne, names, t)).toBe(
			"Adds 1 h of overtime for Ben Ong that week."
		);
		const gone = feasibleRepair(
			[callInMove({ displayName: null, membershipId: null })],
			{ extraMinutes: { ...NONE, overtime: 120 } }
		);
		expect(extraHoursLine(gone, names, t)).toBe(
			"Adds 2 h of overtime for Former member that week."
		);
	});

	describe("an option that moves several people, whose minutes are their sum", () => {
		/** The older repair's two-person option: no kind, the minutes summed. */
		const twoPeople = (extraMinutes: typeof NONE): RepairOption =>
			feasibleRepair([reassignMove(), callInMove()], { extraMinutes });

		it.each([
			[
				"overtime",
				{ ...NONE, overtime: 60 },
				"Adds 1 h of overtime in total that week.",
			],
			[
				"rest-day work",
				{ ...NONE, restDayWork: 480 },
				"Adds 8 h of rest-day work in total.",
			],
			[
				"time off earned",
				{ ...NONE, timeOffEarned: 90 },
				"Adds 1.5 h of time off earned in total.",
			],
		])("names no one for one kind: %s", (_kind, minutes, line) => {
			expect(extraHoursLine(twoPeople(minutes), names, t)).toBe(line);
		});

		it("names no one for several kinds in one line", () => {
			expect(
				extraHoursLine(
					twoPeople({ overtime: 60, restDayWork: 480, timeOffEarned: 0 }),
					names,
					t
				)
			).toBe(
				"Adds 1 h of overtime and 8 h of rest-day work in total that week."
			);
		});

		it("says no extra hours when every kind is 0", () => {
			expect(extraHoursLine(twoPeople(NONE), names, t)).toBe("No extra hours.");
		});

		it("counts two people the roster no longer names as several", () => {
			const gone = callInMove({ displayName: null, membershipId: null });
			expect(
				extraHoursLine(
					feasibleRepair([gone, gone], {
						extraMinutes: { ...NONE, overtime: 60 },
					}),
					names,
					t
				)
			).toBe("Adds 1 h of overtime in total that week.");
		});

		it("says nothing when the minutes are absent", () => {
			expect(
				extraHoursLine(feasibleRepair([reassignMove(), callInMove()]), names, t)
			).toBeUndefined();
		});
	});
});
