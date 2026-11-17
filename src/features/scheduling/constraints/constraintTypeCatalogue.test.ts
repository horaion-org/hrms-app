import { describe, expect, it } from "vitest";
import {
	CONSTRAINT_TYPES,
	PATTERN_DAYS,
	type ConstraintType,
} from "@/features/scheduling/constraints/api";
import {
	fieldReadingOrderOf,
	isCountedOnShifts,
	isRetiredConstraintType,
	startsIfPossible,
} from "@/features/scheduling/constraints/constraintTypeCatalogue";

/** A name no record holds, as a newer API might send. */
const UNKNOWN_TYPE = "SOMETHING_NEW" as ConstraintType;

describe("the catalogue's lookups", () => {
	it("names the three retired types and no other", () => {
		expect(CONSTRAINT_TYPES.filter(isRetiredConstraintType)).toEqual([
			"ROLE_PRESENCE",
			"SHORTEST_PART_SHIFT",
			"PAY_RATES",
		]);
	});

	it("counts the shift staffing types, the retired one included, on their shifts", () => {
		expect(CONSTRAINT_TYPES.filter(isCountedOnShifts)).toEqual([
			"SHIFT_STAFFING",
			"SHIFT_STAFFING_WITH_STAND_INS",
			"ROLE_PRESENCE",
		]);
	});

	it("starts the two kinds that were only ever If possible as If possible", () => {
		expect(CONSTRAINT_TYPES.filter(startsIfPossible)).toEqual([
			"AVOID_DAYS_OFF_ON",
			"KEEP_DAYS_OFF_TOGETHER",
		]);
	});

	it.each<[ConstraintType, ReadonlyArray<string>]>([
		["SHIFT_STAFFING", ["SHIFT", "COMPARISON", "HEADCOUNT", "JOB_TITLE"]],
		["BANNED_SHIFT_PATTERN", PATTERN_DAYS],
		["KEEP_DAYS_OFF_TOGETHER", []],
	])("reads the fields of %s in its sentence's order", (type, order) => {
		expect(fieldReadingOrderOf(type)).toEqual(order);
	});

	it("knows nothing of a type it has no record for", () => {
		expect(isRetiredConstraintType(UNKNOWN_TYPE)).toBe(false);
		expect(isCountedOnShifts(UNKNOWN_TYPE)).toBe(false);
		expect(startsIfPossible(UNKNOWN_TYPE)).toBe(false);
		expect(fieldReadingOrderOf(UNKNOWN_TYPE)).toEqual([]);
	});
});
