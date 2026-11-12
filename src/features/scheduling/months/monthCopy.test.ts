import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { stateCountsLine } from "@/features/scheduling/months/monthCopy";

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
