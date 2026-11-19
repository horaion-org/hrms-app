import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { reasonText } from "@/features/scheduling/cover/coverOptionWords";
import { coverOptionsFixture } from "@/features/scheduling/cover/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

const t = authTestI18n.t;
const gap = coverOptionsFixture().gap;
const shift = frozenShiftsFixture().find(
	(candidate) => candidate.shiftId === gap.shiftId
);

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
		expect(reasonText(reason, shift, t)).toBe(words);
	});
});
