import type {
	MonthWeek,
	ScheduleMonth,
	ScheduleMonthSummary,
} from "@/features/scheduling/months/api";

/*
 * API-shaped months for stories and tests; never sent anywhere. The default
 * is Orchard's Kitchen (d-1) in November 2026: five weeks from 2 Nov.
 */

/** Seven covered days from `monday`, with the given short shifts by day index. */
export const coverDays = (
	monday: string,
	shortByDay: Partial<Record<number, number>> = {}
): MonthWeek["days"] =>
	Array.from({ length: 7 }, (_, index) => {
		const date = new Date(`${monday}T00:00:00Z`);
		date.setUTCDate(date.getUTCDate() + index);
		return {
			date: date.toISOString().slice(0, 10),
			shortShifts: shortByDay[index] ?? 0,
		};
	});

/** One week; a published 2 – 8 Nov unless overridden. */
export const monthWeekFixture = (
	overrides: Partial<MonthWeek> = {}
): MonthWeek => ({
	periodStart: "2026-11-02",
	periodEnd: "2026-11-08",
	state: "PUBLISHED",
	scheduleId: "s-1",
	days: coverDays(overrides.periodStart ?? "2026-11-02"),
	handChangedDays: 0,
	...overrides,
});

/** Kitchen's November: published, to review, two tentative, and one not generated. */
export const scheduleMonthFixture = (
	overrides: Partial<ScheduleMonth> = {}
): ScheduleMonth => ({
	month: "2026-11",
	departmentId: "d-1",
	departmentName: "Kitchen",
	branchId: "b-1",
	branchName: "Orchard",
	weeks: [
		monthWeekFixture(),
		monthWeekFixture({
			periodStart: "2026-11-09",
			periodEnd: "2026-11-15",
			state: "TO_REVIEW",
			scheduleId: "s-2",
			days: coverDays("2026-11-09", { 1: 1 }),
			handChangedDays: 1,
		}),
		monthWeekFixture({
			periodStart: "2026-11-16",
			periodEnd: "2026-11-22",
			state: "TENTATIVE",
			scheduleId: "s-3",
			days: coverDays("2026-11-16"),
		}),
		monthWeekFixture({
			periodStart: "2026-11-23",
			periodEnd: "2026-11-29",
			state: "TENTATIVE",
			scheduleId: "s-4",
			days: coverDays("2026-11-23"),
		}),
		monthWeekFixture({
			periodStart: "2026-11-30",
			periodEnd: "2026-12-06",
			state: "NOT_GENERATED",
			scheduleId: null,
			days: [],
			handChangedDays: null,
		}),
	],
	...overrides,
});

/** Kitchen's November on the Schedules tab, the weeks of `scheduleMonthFixture`. */
export const monthSummaryFixture = (
	overrides: Partial<ScheduleMonthSummary> = {}
): ScheduleMonthSummary => ({
	month: "2026-11",
	departmentId: "d-1",
	departmentName: "Kitchen",
	branchId: "b-1",
	branchName: "Orchard",
	weeks: scheduleMonthFixture().weeks.map(
		({ periodStart, state, scheduleId }) => ({ periodStart, state, scheduleId })
	),
	...overrides,
});
