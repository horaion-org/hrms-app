import { describe, expect, it } from "vitest";
import { staffingRuleFixture } from "@/features/dashboard/fixtures";
import { staffingCauseOf } from "@/features/dashboard/staffingCause";

describe("staffingCauseOf", () => {
	it("names too few people when fewer hold the titles than one shift needs", () => {
		expect(
			staffingCauseOf(
				staffingRuleFixture({ headcount: 3, peopleWithTitles: 2 })
			)
		).toBe("TOO_FEW_PEOPLE");
	});

	it("names too few people when the holders cannot work the days a week the rule needs", () => {
		expect(
			staffingCauseOf(
				staffingRuleFixture({
					headcount: 2,
					peopleWithTitles: 3,
					neededShiftDaysAWeek: 14,
					holderDaysAWeek: 12,
				})
			)
		).toBe("TOO_FEW_PEOPLE");
	});

	it("names one-off gaps when enough people could staff it but some shifts still ran short", () => {
		expect(
			staffingCauseOf(
				staffingRuleFixture({
					headcount: 2,
					peopleWithTitles: 4,
					holderDaysAWeek: null,
					gapsInRange: 3,
				})
			)
		).toBe("ONE_OFF");
	});

	it("names nothing when the rule can be staffed and nothing ran short", () => {
		expect(
			staffingCauseOf(
				staffingRuleFixture({
					headcount: 2,
					peopleWithTitles: 4,
					holderDaysAWeek: 20,
					neededShiftDaysAWeek: 14,
					gapsInRange: 0,
				})
			)
		).toBeUndefined();
	});
});
