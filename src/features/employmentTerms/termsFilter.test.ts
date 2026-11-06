import { describe, expect, it } from "vitest";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	STANDARD_WEEK,
} from "@/features/employmentTerms/fixtures";
import {
	chosenTermsName,
	termsChoices,
} from "@/features/employmentTerms/termsFilter";

const CATALOGUE = [STANDARD_WEEK, FIVE_DAY_WEEK, PART_TIME_20];

describe("termsChoices", () => {
	it("offers the active terms in the catalogue's order", () => {
		expect(termsChoices(CATALOGUE, undefined)).toEqual([
			{ id: STANDARD_WEEK.id, name: "Standard week", inactive: false },
			{ id: FIVE_DAY_WEEK.id, name: "Five-day week, 44 h", inactive: false },
		]);
	});

	it("keeps chosen inactive terms, marked inactive, so they can still be named", () => {
		expect(termsChoices(CATALOGUE, PART_TIME_20.id)).toContainEqual({
			id: PART_TIME_20.id,
			name: "Part-time, 20 h",
			inactive: true,
		});
	});
});

describe("chosenTermsName", () => {
	it("names the chosen terms, and nothing while the list is unknown or lacks them", () => {
		expect(chosenTermsName(CATALOGUE, FIVE_DAY_WEEK.id)).toBe(
			"Five-day week, 44 h"
		);
		expect(chosenTermsName(undefined, FIVE_DAY_WEEK.id)).toBeUndefined();
		expect(chosenTermsName(CATALOGUE, "terms-gone")).toBeUndefined();
	});
});
