import { describe, expect, it } from "vitest";
import { monthSummaryFixture } from "@/features/scheduling/months/fixtures";
import {
	crossingWeekOf,
	earlierReviewMonth,
	formatMonth,
	formatMonthName,
	formatWeekDates,
	formatWeekdayDate,
	mondaysIn,
	monthChoicesFrom,
	monthOf,
	shiftMonth,
	stateCounts,
	summariesByMonth,
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

describe("monthChoicesFrom", () => {
	it("given_aDayInNovember_when_listed_then_novemberAndTheTwelveMonthsAfter", () => {
		const months = monthChoicesFrom(new Date(2026, 10, 12));

		expect(months).toHaveLength(13);
		expect(months[0]).toBe("2026-11");
		expect(months[12]).toBe("2027-11");
	});

	it("given_aSundayWhoseMondayIsInTheMonthBefore_when_listed_then_startsAtThatMonth", () => {
		// Sunday 1 Nov 2026 belongs to the week of Monday 26 Oct.
		expect(monthChoicesFrom(new Date(2026, 10, 1))[0]).toBe("2026-10");
	});
});

describe("mondaysIn", () => {
	it("given_november2026_when_listed_then_fiveMondaysFromThe2nd", () => {
		expect(mondaysIn("2026-11")).toEqual([
			"2026-11-02",
			"2026-11-09",
			"2026-11-16",
			"2026-11-23",
			"2026-11-30",
		]);
	});

	it("given_aMonthStartingOnAMonday_when_listed_then_itsFirstDayIsTheFirstMonday", () => {
		expect(mondaysIn("2027-02")).toEqual([
			"2027-02-01",
			"2027-02-08",
			"2027-02-15",
			"2027-02-22",
		]);
	});
});

describe("formatWeekdayDate", () => {
	it("given_aDate_when_formatted_then_weekdayDayAndMonth", () => {
		expect(formatWeekdayDate("2026-11-02", "en-GB")).toBe("Mon 2 Nov");
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

describe("earlierReviewMonth", () => {
	const november = monthSummaryFixture();
	const december = monthSummaryFixture({
		month: "2026-12",
		weeks: [
			{ periodStart: "2026-12-07", state: "TENTATIVE", scheduleId: "s-6" },
		],
	});

	it("given_tentativeWeeksAfterAMonthUnderReview_when_asked_then_thatEarlierMonth", () => {
		expect(earlierReviewMonth([november, december], december)).toBe("2026-11");
	});

	it("given_theMonthUnderReviewItself_when_asked_then_none", () => {
		expect(earlierReviewMonth([november, december], november)).toBeUndefined();
	});

	it("given_anotherDepartmentsReview_when_asked_then_none", () => {
		const bar = { ...december, departmentId: "d-2", departmentName: "Bar" };
		expect(earlierReviewMonth([november, bar], bar)).toBeUndefined();
	});
});

describe("summariesByMonth", () => {
	it("given_theApisNewestFirstOrder_when_grouped_then_earliestMonthFirstAndDepartmentsInTheApisOrder", () => {
		const bar = monthSummaryFixture({
			departmentId: "d-2",
			departmentName: "Bar",
		});
		const kitchenDecember = monthSummaryFixture({ month: "2026-12" });
		const kitchenNovember = monthSummaryFixture();

		expect(
			summariesByMonth([kitchenDecember, bar, kitchenNovember]).map(
				([month, summaries]) => [
					month,
					summaries.map((each) => each.departmentName),
				]
			)
		).toEqual([
			["2026-11", ["Bar", "Kitchen"]],
			["2026-12", ["Kitchen"]],
		]);
	});
});
