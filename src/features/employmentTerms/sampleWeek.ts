import { WEEKDAYS, type Weekday } from "@/common/weekdays";
import type { RestDay } from "@/features/employmentTerms/api";

/** What one day of the sample week is. */
export type SampleDayKind = "NORMAL" | "HALF" | "OFF" | "REST" | "VARIES";

export type SampleDay = {
	weekday: Weekday;
	kind: SampleDayKind;
	minutes: number;
};

/** A week the terms make, Monday first, and whether its rest day is only an example (the roster picks it). */
export type SampleWeek = { days: Array<SampleDay>; restIsExample: boolean };

/** The weekday a roster-picked rest day is drawn on, as an example. */
const EXAMPLE_REST_DAY: Weekday = "SUN";
const DAYS_PER_WEEK = WEEKDAYS.length;

/**
 * The sample week the form draws, the approved design's rule: when the days
 * vary every day reads "varies" with an even share of the week; otherwise the
 * rest day (a full-timer's, Sunday as an example when the roster picks it),
 * then the working days in order from Monday, a half day after the whole
 * ones, and the rest off. A part-timer has no rest day.
 */
export const sampleWeek = ({
	daysPerWeek,
	weekMinutes,
	dayMinutes,
	restDay,
	partTime,
}: {
	daysPerWeek: number | null;
	weekMinutes: number;
	dayMinutes: number | null;
	restDay: RestDay;
	partTime: boolean;
}): SampleWeek => {
	if (daysPerWeek === null || dayMinutes === null)
		return {
			days: WEEKDAYS.map((weekday) => ({
				weekday,
				kind: "VARIES",
				minutes: Math.round(weekMinutes / DAYS_PER_WEEK),
			})),
			restIsExample: false,
		};
	const rest: Weekday | null = partTime
		? null
		: restDay === "ROSTERED" || restDay === "UNKNOWN"
			? EXAMPLE_REST_DAY
			: restDay;
	let left = daysPerWeek;
	const days = WEEKDAYS.map((weekday): SampleDay => {
		if (weekday === rest) return { weekday, kind: "REST", minutes: 0 };
		if (left >= 1) {
			left -= 1;
			return { weekday, kind: "NORMAL", minutes: dayMinutes };
		}
		if (left > 0) {
			left = 0;
			return { weekday, kind: "HALF", minutes: Math.floor(dayMinutes / 2) };
		}
		return { weekday, kind: "OFF", minutes: 0 };
	});
	return { days, restIsExample: rest !== null && restDay !== rest };
};
