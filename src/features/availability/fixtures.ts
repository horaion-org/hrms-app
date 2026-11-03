import { WEEKDAYS } from "@/common/weekdays";
import type { MemberWeek } from "@/features/availability/api";
import {
	byDay,
	type WeeklyAvailability,
	type WeeklyWindow,
} from "@/features/availability/availabilityModel";

/** The week every fixture is in: Monday 9 November 2026. */
export const FIXTURE_WEEK = "2026-11-09";

/** One part-timer's week as a Branch's availability answers it, for stories and tests; never sent anywhere. */
export const memberWeekFixture = (
	overrides: Partial<MemberWeek> & Pick<MemberWeek, "membershipId">
): MemberWeek => ({
	memberProfileId: `profile-${overrides.membershipId}`,
	displayName: "Aisha Rahman",
	departmentId: "d-1",
	departmentName: "Sales",
	source: "PATTERN",
	windows: [
		{ date: "2026-11-09", startTime: "09:00", endTime: "13:00" },
		{ date: "2026-11-11", startTime: "18:00", endTime: "22:00" },
	],
	...overrides,
});

/** A Branch's three part-timers in two Departments: one on their pattern, one with a custom week, one with no hours. */
export const MEMBER_WEEK_FIXTURES: Array<MemberWeek> = [
	memberWeekFixture({ membershipId: "m-aisha" }),
	memberWeekFixture({
		membershipId: "m-cheryl",
		displayName: "Cheryl Ng",
		source: "OVERRIDE",
		windows: [{ date: "2026-11-14", startTime: "22:00", endTime: "06:00" }],
	}),
	memberWeekFixture({
		membershipId: "m-faris",
		displayName: "Faris Ahmad",
		departmentId: "d-2",
		departmentName: "Kitchen",
		windows: [],
	}),
];

/** A weekly pattern as the API answers it: all seven days, Monday first. */
export const weeklyAvailabilityFixture = (
	windows: ReadonlyArray<WeeklyWindow>,
	overrides: Partial<WeeklyAvailability> = {}
): WeeklyAvailability => ({
	membershipId: "m-me",
	days: byDay(windows),
	overrideWeeks: [],
	...overrides,
});

/** Weekday mornings, 09:00–13:00, Monday to Friday. */
export const WEEKDAY_MORNINGS: Array<WeeklyWindow> = WEEKDAYS.slice(0, 5).map(
	(day) => ({ day, startTime: "09:00", endTime: "13:00" })
);
