import { describe, expect, it } from "vitest";
import type { ConstraintTypeOption } from "@/features/scheduling/constraints/api";
import {
	allowsReplacement,
	combine,
	compareStrictness,
	type ComparedConstraint,
} from "@/features/scheduling/constraints/constraintStrictness";
import { CONSTRAINT_TYPE_OPTIONS } from "@/features/scheduling/constraints/fixtures";

const typeOf = (type: string): ConstraintTypeOption => {
	const option = CONSTRAINT_TYPE_OPTIONS.find((item) => item.type === type);
	if (!option) throw new Error(`No fixture for ${type}`);
	return option;
};

const rest = (hours: string): ComparedConstraint => ({
	requirement: null,
	values: [{ field: "REST_HOURS", value: hours }],
});

const daysOff = (
	comparison: string,
	days: string,
	period: string,
	requirement: "MUST" | "SHOULD" = "MUST"
): ComparedConstraint => ({
	requirement,
	values: [
		{ field: "COMPARISON", value: comparison },
		{ field: "DAYS_OFF", value: days },
		{ field: "PERIOD_DAYS", value: period },
	],
});

const avoid = (...days: Array<string>): ComparedConstraint => ({
	requirement: null,
	values: days.map((value) => ({ field: "WEEKDAY", value })),
});

describe("compareStrictness", () => {
	it("counts more rest as stricter", () => {
		const type = typeOf("REST_BETWEEN_SHIFTS");
		expect(compareStrictness(type, rest("11"), rest("12"))).toBe("STRICTER");
		expect(compareStrictness(type, rest("11"), rest("11"))).toBe("SAME");
		expect(compareStrictness(type, rest("11"), rest("10"))).toBe("LOOSER");
	});

	it("reads days off by the comparison and the window against it", () => {
		const type = typeOf("DAYS_OFF_PER_PERIOD");
		const twoInSeven = daysOff("AT_LEAST", "2", "7");
		expect(
			compareStrictness(type, twoInSeven, daysOff("AT_LEAST", "3", "7"))
		).toBe("STRICTER");
		expect(
			compareStrictness(type, twoInSeven, daysOff("AT_LEAST", "2", "6"))
		).toBe("STRICTER");
		expect(
			compareStrictness(
				type,
				daysOff("AT_LEAST", "2", "6"),
				daysOff("AT_LEAST", "3", "7")
			)
		).toBe("INCOMPARABLE");
		expect(
			compareStrictness(
				type,
				daysOff("AT_MOST", "3", "6"),
				daysOff("AT_MOST", "2", "6")
			)
		).toBe("STRICTER");
		expect(
			compareStrictness(type, twoInSeven, daysOff("AT_MOST", "2", "7"))
		).toBe("INCOMPARABLE");
	});

	it("counts Must as stricter than Should", () => {
		const type = typeOf("DAYS_OFF_PER_PERIOD");
		expect(
			compareStrictness(
				type,
				daysOff("AT_LEAST", "2", "7", "SHOULD"),
				daysOff("AT_LEAST", "2", "7", "MUST")
			)
		).toBe("STRICTER");
		expect(
			compareStrictness(
				type,
				daysOff("AT_LEAST", "2", "7", "MUST"),
				daysOff("AT_LEAST", "2", "7", "SHOULD")
			)
		).toBe("LOOSER");
	});

	it("counts avoiding more weekdays as stricter, and an overlap as not comparable", () => {
		const type = typeOf("AVOID_DAYS_OFF_ON");
		expect(compareStrictness(type, avoid("FRI"), avoid("FRI", "SAT"))).toBe(
			"STRICTER"
		);
		expect(compareStrictness(type, avoid("FRI", "SAT"), avoid("FRI"))).toBe(
			"LOOSER"
		);
		expect(compareStrictness(type, avoid("FRI"), avoid("SAT"))).toBe(
			"INCOMPARABLE"
		);
	});
});

describe("combine", () => {
	it("is dominance over the parts", () => {
		expect(combine([])).toBe("SAME");
		expect(combine(["SAME", "STRICTER"])).toBe("STRICTER");
		expect(combine(["LOOSER", "SAME"])).toBe("LOOSER");
		expect(combine(["STRICTER", "LOOSER"])).toBe("INCOMPARABLE");
	});
});

describe("allowsReplacement", () => {
	it("holds a locked constraint as a floor and lets a default go either way", () => {
		expect(allowsReplacement("LOCKED", "STRICTER")).toBe(true);
		expect(allowsReplacement("LOCKED", "SAME")).toBe(true);
		expect(allowsReplacement("LOCKED", "LOOSER")).toBe(false);
		expect(allowsReplacement("LOCKED", "INCOMPARABLE")).toBe(false);
		expect(allowsReplacement("DEFAULT", "LOOSER")).toBe(true);
	});
});
