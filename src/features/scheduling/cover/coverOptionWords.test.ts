import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	gapReason,
	gapTitle,
	neighbourLine,
	optionLines,
	reasonText,
	type CoverNames,
} from "@/features/scheduling/cover/coverOptionWords";
import {
	coverOptionFixture,
	coverOptionsFixture,
} from "@/features/scheduling/cover/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

const t = authTestI18n.t;
const shifts = frozenShiftsFixture();
const NAMES: Record<string, string> = {
	"m-1": "Aisha Rahman",
	"m-2": "Ben Ong",
	"m-3": "Chen Wei",
};
const names: CoverNames = {
	member: (membershipId) => NAMES[membershipId] ?? "Former member",
	shift: (shiftId) => shifts.find((shift) => shift.shiftId === shiftId),
	day: (isoDate) => (isoDate === "2026-10-17" ? "Sat, Oct 17" : "Fri, Oct 16"),
	hours: (minutes) =>
		new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(
			minutes / 60
		),
};
const gap = coverOptionsFixture().gap;

describe("gapTitle and gapReason", () => {
	it("given_aGenerationHole_when_worded_then_theShiftDayTimeRolesAndShortSinceGeneration", () => {
		expect(gapTitle(gap, names, t)).toBe(
			"Front Desk AM · Sat, Oct 17 · 09:00 – 15:00 · Front Desk Staff or Front Desk Lead"
		);
		expect(gapReason(gap, names, t)).toBe("1 short since generation");
	});

	it("given_oneAbsentMember_when_worded_then_namesWhoIsOnLeave", () => {
		expect(
			gapReason(
				{ ...gap, shortSinceGeneration: 0, absentMembershipIds: ["m-1"] },
				names,
				t
			)
		).toBe("1 short: Aisha Rahman is on leave");
	});

	it("given_aMixOfLeaveAndHoles_when_worded_then_onlyHowManyShort", () => {
		expect(
			gapReason(
				{
					...gap,
					shortBy: 2,
					shortSinceGeneration: 1,
					absentMembershipIds: ["m-1"],
				},
				names,
				t
			)
		).toBe("2 short");
	});
});

describe("optionLines", () => {
	it("given_aFreeOption_when_worded_then_withinContractAndTheWeekAgainstTheContract", () => {
		expect(optionLines(coverOptionFixture(), names, t)).toEqual([
			"Within contracted hours",
			"This week 24 → 30 h of 44 h",
		]);
	});

	it("given_extraHours_when_worded_then_oneLineWithTheWeek", () => {
		expect(
			optionLines(
				coverOptionFixture({
					kind: "EXTRA_HOURS",
					weekMinutes: { before: 1200, after: 1680, contract: 1200 },
				}),
				names,
				t
			)
		).toEqual(["Extra hours (part-time) · 20 → 28 h this week"]);
	});

	it("given_overtime_when_worded_then_theOvertimeHoursAndTheMonthAndAnyWarning", () => {
		expect(optionLines(coverOptionsFixture().options[1]!, names, t)).toEqual([
			"Works a day off · 6 h overtime",
			"Overtime this month 18 → 24 h",
			"Also works on another roster that day",
		]);
	});

	it("given_halfHours_when_worded_then_oneDecimal", () => {
		expect(
			optionLines(
				coverOptionFixture({
					weekMinutes: { before: 450, after: 930, contract: 2640 },
				}),
				names,
				t
			)[1]
		).toBe("This week 7.5 → 15.5 h of 44 h");
	});
});

describe("neighbourLine", () => {
	it("given_aShiftTheDayBefore_when_worded_then_namesItsDayAndTime", () => {
		expect(neighbourLine(coverOptionFixture(), names, t)).toBe(
			"Aisha Rahman works Front Desk AM on Fri, Oct 16 (09:00 – 15:00)."
		);
	});

	it("given_noShiftBesideIt_when_worded_then_saysSo", () => {
		expect(
			neighbourLine(coverOptionFixture({ neighbours: [] }), names, t)
		).toBe("Aisha Rahman has no shift the day before or after.");
	});
});

describe("reasonText", () => {
	it.each([
		["MEMBER_GONE", "Has left"],
		["ON_LEAVE", "On leave"],
		["NOT_AVAILABLE", "Not available that day"],
		["ROLE_NOT_HELD", "Not a Front Desk Staff or Front Desk Lead"],
		["SHIFT_NOT_ON_DAY", "The shift doesn't run that day"],
		["NOT_SCHEDULABLE_NOW", "No longer rostered in this department"],
		["ALREADY_WORKING", "Already working that day"],
		["REST_DAY", "Rest day: not offered yet"],
		["OUTSIDE_AVAILABILITY", "Not available then"],
		["HOURS_UNKNOWN", "Working hours not set"],
		["UNKNOWN", "Can't help"],
	] as const)("given_%s_when_worded_then_%s", (reason, words) => {
		expect(reasonText(reason, names.shift(gap.shiftId), t)).toBe(words);
	});
});
