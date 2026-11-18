import { describe, expect, it } from "vitest";
import {
	datesProblemOf,
	dayCountOf,
	MAX_DAYS_BY_DATES,
} from "@/features/scheduling/dates/datesSetup";
import {
	QUICK_CHOICES,
	quickRangeOf,
} from "@/features/scheduling/dates/quickRanges";

/** Each today with the first and last day of every choice, in the order of `QUICK_CHOICES`. */
const CASES = [
	{
		case: "a Thursday",
		today: "2026-11-19",
		ranges: [
			["2026-11-19", "2026-11-22"],
			["2026-11-23", "2026-11-29"],
			["2026-11-19", "2026-11-30"],
			["2026-12-01", "2026-12-31"],
		],
	},
	{
		case: "a Sunday: the rest of the week is that one day",
		today: "2026-11-22",
		ranges: [
			["2026-11-22", "2026-11-22"],
			["2026-11-23", "2026-11-29"],
			["2026-11-22", "2026-11-30"],
			["2026-12-01", "2026-12-31"],
		],
	},
	{
		case: "the last day of a month: this month is that one day",
		today: "2026-11-30",
		ranges: [
			["2026-11-30", "2026-12-06"],
			["2026-12-07", "2026-12-13"],
			["2026-11-30", "2026-11-30"],
			["2026-12-01", "2026-12-31"],
		],
	},
	{
		case: "31 December: every choice but this month reaches the next year",
		today: "2026-12-31",
		ranges: [
			["2026-12-31", "2027-01-03"],
			["2027-01-04", "2027-01-10"],
			["2026-12-31", "2026-12-31"],
			["2027-01-01", "2027-01-31"],
		],
	},
	{
		case: "the first of a 31-day month that starts on a Saturday",
		today: "2026-08-01",
		ranges: [
			["2026-08-01", "2026-08-02"],
			["2026-08-03", "2026-08-09"],
			["2026-08-01", "2026-08-31"],
			["2026-09-01", "2026-09-30"],
		],
	},
	{
		case: "the last day of January in a leap year",
		today: "2028-01-31",
		ranges: [
			["2028-01-31", "2028-02-06"],
			["2028-02-07", "2028-02-13"],
			["2028-01-31", "2028-01-31"],
			["2028-02-01", "2028-02-29"],
		],
	},
] as const;

describe("quickRangeOf", () => {
	it.each(CASES)("given_$case_when_chosen_then_itsDays", ({ today, ranges }) => {
		expect(
			QUICK_CHOICES.map((choice) => quickRangeOf(choice, today))
		).toEqual(ranges.map(([firstDay, lastDay]) => ({ firstDay, lastDay })));
	});

	// The form refuses nothing a quick choice fills in: not past, in order and within one run's days.
	it.each(CASES)("given_$case_when_chosen_then_theFormAcceptsEveryRange", ({ today }) => {
		for (const choice of QUICK_CHOICES) {
			const { firstDay, lastDay } = quickRangeOf(choice, today);
			expect(datesProblemOf(firstDay, lastDay, today)).toBeUndefined();
			expect(dayCountOf(firstDay, lastDay)).toBeLessThanOrEqual(
				MAX_DAYS_BY_DATES
			);
		}
	});

	it("given_everyDayOfTwoYears_when_chosen_then_noRangeIsRefused", () => {
		for (let offset = 0; offset < 731; offset++) {
			const today = new Date(Date.UTC(2026, 0, 1 + offset))
				.toISOString()
				.slice(0, 10);
			for (const choice of QUICK_CHOICES) {
				const { firstDay, lastDay } = quickRangeOf(choice, today);
				expect(datesProblemOf(firstDay, lastDay, today)).toBeUndefined();
			}
		}
	});
});
