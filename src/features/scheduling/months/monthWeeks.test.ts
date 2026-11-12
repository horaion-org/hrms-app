import { describe, expect, it } from "vitest";
import {
	crossingWeekOf,
	formatMonth,
	formatMonthName,
	formatWeekDates,
	monthOf,
	shiftMonth,
	stateCounts,
	summaryRange,
} from "@/features/scheduling/months/monthWeeks";

describe("monthOf", () => {
	it("given_aWeekCrossingTheMonthsEnd_when_placed_then_itsMondaysMonth", () => {
		expect(monthOf("2026-11-30")).toBe("2026-11");
	});
});

describe("shiftMonth", () => {
	it("given_december_when_shiftedByOne_then_januaryOfTheNextYear", () => {
		expect(shiftMonth("2026-12", 1)).toBe("2027-01");
		expect(shiftMonth("2027-01", -1)).toBe("2026-12");
	});
});

describe("summaryRange", () => {
	it("given_thursday12November_when_ranged_then_novemberToNovemberNextYear", () => {
		expect(summaryRange(new Date(2026, 10, 12))).toEqual({
			from: "2026-11",
			to: "2027-11",
		});
	});

	it("given_tuesday1DecemberWhoseMondayIsInNovember_when_ranged_then_startsInNovember", () => {
		expect(summaryRange(new Date(2026, 11, 1))).toEqual({
			from: "2026-11",
			to: "2027-11",
		});
	});
});

describe("formatMonth", () => {
	it("given_englishAndSpanish_when_formatted_then_theMonthAndYearInEach", () => {
		expect(formatMonth("2026-11", "en")).toBe("November 2026");
		expect(formatMonth("2026-11", "es")).toBe("noviembre de 2026");
	});
});

describe("formatWeekDates", () => {
	it("given_aWeekInOneMonthAndOneAcrossTwo_when_formatted_then_daysAndMonthsWithoutTheYear", () => {
		expect(
			formatWeekDates({ start: "2026-11-16", end: "2026-11-22" }, "en-GB")
		).toMatch(/^16\s?–\s?22\sNov$/);
		expect(
			formatWeekDates({ start: "2026-11-30", end: "2026-12-06" }, "en-GB")
		).toMatch(/^30\sNov\s–\s6\sDec$/);
	});
});

describe("stateCounts", () => {
	it("given_aMonthsWeeks_when_counted_then_eachStateOnceAndNotGeneratedLeftOut", () => {
		expect(
			stateCounts([
				{ state: "PUBLISHED" },
				{ state: "PUBLISHED" },
				{ state: "TO_REVIEW" },
				{ state: "TENTATIVE" },
				{ state: "NOT_GENERATED" },
			])
		).toEqual({ PUBLISHED: 2, TO_REVIEW: 1, TENTATIVE: 1 });
	});
});

describe("formatMonthName", () => {
	it("given_november_when_named_then_theMonthAlone", () => {
		expect(formatMonthName("2026-11", "en")).toBe("November");
		expect(formatMonthName("2026-11", "es")).toBe("noviembre");
	});
});

describe("crossingWeekOf", () => {
	it("given_decemberWhoseFirstIsATuesday_when_asked_then_theWeekFrom30November", () => {
		expect(crossingWeekOf("2026-12")).toEqual({
			start: "2026-11-30",
			end: "2026-12-06",
		});
	});

	it("given_marchWhoseFirstIsAMonday_when_asked_then_none", () => {
		expect(crossingWeekOf("2027-03")).toBeUndefined();
	});
});
