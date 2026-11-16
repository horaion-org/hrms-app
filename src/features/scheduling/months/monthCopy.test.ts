import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	stateCountsLine,
	weekRangeText,
} from "@/features/scheduling/months/monthCopy";

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
