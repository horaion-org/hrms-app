import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	stateCountsLine,
	weekChangedRefusal,
	weekRangeText,
} from "@/features/scheduling/months/monthCopy";
import { ungeneratedMonthFixture } from "@/features/scheduling/months/fixtures";

describe("stateCountsLine", () => {
	it("given_aMonthsWeeks_when_said_then_publishedFirstAndPluralsByCount", () => {
		expect(
			stateCountsLine(
				[
					{ state: "TENTATIVE" },
					{ state: "PUBLISHED" },
					{ state: "PUBLISHED" },
					{ state: "TO_REVIEW" },
					{ state: "DRAFT" },
					{ state: "NOT_GENERATED" },
				],
				authTestI18n.t
			)
		).toBe("2 published · 1 to review · 1 tentative · 1 draft");
	});

	it("given_onlyWeeksNotGeneratedYet_when_said_then_nothing", () => {
		expect(stateCountsLine([{ state: "NOT_GENERATED" }], authTestI18n.t)).toBe(
			""
		);
	});
});

describe("weekRangeText", () => {
	it("given_aWeek_when_said_then_itsFirstAndLastDayWithTheirWeekdays", () => {
		expect(
			weekRangeText(
				{ start: "2026-11-23", end: "2026-11-29" },
				"en-GB",
				authTestI18n.t
			)
		).toBe("Mon 23 Nov to Sun 29 Nov");
	});
});

describe("weekChangedRefusal", () => {
	it("given_aSentWeekPublishedAndAnotherOverSinceTheRead_when_said_then_namesEachWithWhyAndThatNothingWasGenerated", () => {
		const month = ungeneratedMonthFixture();
		month.weeks[0] = {
			...month.weeks[0]!,
			state: "PUBLISHED",
			includedInMonthGeneration: false,
		};
		month.weeks[1] = { ...month.weeks[1]!, includedInMonthGeneration: false };

		expect(
			weekChangedRefusal(
				["2026-12-07", "2026-12-14", "2026-12-21"],
				month,
				"en-GB",
				authTestI18n.t
			)
		).toMatch(
			/^The week of 7\s?–\s?13\sDec was published since this page loaded, so it can’t be generated\. The week of 14\s?–\s?20\sDec is over, so it can’t be generated\. Nothing was generated\. The page now shows December as it is; try again for the other weeks\.$/
		);
	});

	it("given_noSentWeekChangedInTheReadYet_when_said_then_oneLineForTheMonth", () => {
		expect(
			weekChangedRefusal(
				["2026-12-07"],
				ungeneratedMonthFixture(),
				"en-GB",
				authTestI18n.t
			)
		).toBe(
			"A week of December changed since this page loaded, so nothing was generated. The page now shows December as it is; try again."
		);
	});
});
